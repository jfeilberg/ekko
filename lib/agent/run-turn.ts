import { ToolLoopAgent, stepCountIs, type ModelMessage, type Tool, type ToolSet } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import type { Thread } from 'chat';
import { toAiMessages, Plan } from 'chat';
import { env } from '../env';
import { log } from '../log';
import { getSystemPrompt } from './system-prompt';
import { loadContext, assembleMessages } from './context';
import { ensureSlackUser, recordMessage } from '../memory/store';
import { getComposioTools } from '../tools/composio';
import { builtinTools } from '../tools/builtin';
import { customTools } from '../tools/custom';
import { getMcpToolset } from '../tools/mcp';
import { mergeTools } from '../tools/registry';
import { getAvailableSkills, getAutoActiveSkills } from '../skills/loader';
import { skillTools } from '../skills/tools';

const HISTORY_LIMIT = 30;

export type TurnInput = {
  thread: Thread;
  slackUserId: string;
  teamId: string;
  channelId: string;
  userText: string;
  surface: 'mention' | 'follow_up' | 'slash' | 'dm';
};

export async function runTurn(input: TurnInput): Promise<void> {
  const t0 = Date.now();
  const { thread, slackUserId, teamId, channelId, userText, surface } = input;

  // Resolve Composio entity id (best-effort).
  let entityId = `slack:${teamId}:${slackUserId}`;
  try {
    entityId = await ensureSlackUser(slackUserId, teamId);
  } catch (err) {
    log.warn({ err }, 'ensure_slack_user_failed');
  }

  // Record inbound user message (best-effort — never blocks the response).
  recordMessage({
    slackUserId,
    threadTs: thread.id,
    channelId,
    role: 'user',
    content: userText,
  }).catch((err) => log.warn({ err }, 'record_message_failed'));

  // Load MCP toolset eagerly so we can close it in finally.
  const mcpToolset = await getMcpToolset().catch((err) => {
    log.warn({ err }, 'mcp_toolset_failed');
    return { tools: {} as Record<string, Tool>, close: async () => {} };
  });

  try {
    // Surface Slack's native typing indicator while context loads + agent runs.
    // Slack stops it automatically when the next message posts; for the longer
    // streaming flows we re-trigger it just before the stream below.
    await thread.startTyping().catch(() => {});

    const [recallContext, composio, threadFetch] = await Promise.all([
      loadContext({ slackUserId, threadTs: thread.id, currentUserText: userText }).catch(() => ({
        summaries: [],
        thread: [],
        recall: [],
        currentUserText: userText,
      })),
      getComposioTools(entityId).catch(() => ({} as Record<string, Tool>)),
      thread.adapter.fetchMessages(thread.id, { limit: HISTORY_LIMIT }).catch(() => ({ messages: [] })),
    ]);

    const tools: Record<string, Tool> = mergeTools({
      composio: composio as Record<string, Tool>,
      mcp: mcpToolset.tools as Record<string, Tool>,
      custom: customTools as Record<string, Tool>,
      // Built-in Slack tools + the skills progressive-disclosure tool.
      builtin: { ...builtinTools(), ...skillTools() } as Record<string, Tool>,
    });
    log.info(
      { surface, toolCount: Object.keys(tools).length, pdfExport: 'export_pdf' in tools },
      'turn.tools',
    );

    // --- Plan: in-bubble task cards ---
    // Post a Plan before the agent runs so the user sees progress immediately.
    const plan = new Plan({ initialMessage: 'Thinking…' });
    await thread.post(plan).catch((err) => {
      log.warn({ err }, 'plan_post_failed');
    });

    // Wrap each tool to emit Plan task updates while it executes.
    const wrappedTools: ToolSet = {};
    for (const [name, tool] of Object.entries(tools)) {
      type ToolWithExecute = Tool & {
        execute?: (input: unknown, options: unknown) => Promise<unknown>;
        experimental_meta?: { slackStatusLabel?: string };
      };
      const t = tool as ToolWithExecute;
      const originalExecute = t.execute;
      if (!originalExecute) {
        wrappedTools[name] = tool as ToolSet[string];
        continue;
      }
      const label = t.experimental_meta?.slackStatusLabel ?? `Calling ${name}…`;
      wrappedTools[name] = {
        ...tool,
        execute: async (input: unknown, options: unknown) => {
          // addTask() returns a PlanTask with an id; capture it for updateTask.
          let taskId: string | undefined;
          try {
            const task = await plan.addTask({ title: label });
            taskId = task?.id;
          } catch {
            /* tolerate — plan may not be bound yet */
          }
          const t0 = Date.now();
          try {
            const result = await originalExecute(input, options);
            try {
              await plan.updateTask({ id: taskId, status: 'complete' });
            } catch {
              /* best effort */
            }
            log.info({ tool: name, ok: true, latencyMs: Date.now() - t0 }, 'tool_call');
            return result;
          } catch (err) {
            try {
              await plan.updateTask({ id: taskId, status: 'error' });
            } catch {
              /* best effort */
            }
            log.warn({ tool: name, err, latencyMs: Date.now() - t0 }, 'tool_call_failed');
            throw err;
          }
        },
      } as ToolSet[string];
    }

    // Recent thread history from Slack via Chat SDK adapter.
    const recentHistory = (await toAiMessages(threadFetch.messages ?? [], {
      includeNames: true,
    })) as ModelMessage[];

    // Cross-thread recall (summaries + vector recall) from our Supabase store.
    // We keep the system layers (summaries, recall) but replace the thread
    // section with the live Slack history fetched above.
    const assembledRecall = assembleMessages({
      summaries: recallContext.summaries,
      thread: [],            // empty: rely on Slack history instead
      recall: recallContext.recall,
      currentUserText: userText,
    });
    // Keep only system-role layers (summaries + recall context).
    const systemLayers = assembledRecall.filter((m) => m.role === 'system');

    const messages: ModelMessage[] = [...systemLayers, ...recentHistory];
    // Ensure the conversation ends with the user's current text.
    const lastMsg = messages[messages.length - 1];
    if (
      !lastMsg ||
      lastMsg.role !== 'user' ||
      (typeof lastMsg.content === 'string' && lastMsg.content !== userText)
    ) {
      messages.push({ role: 'user', content: userText });
    }

    // Anthropic (and many providers) reject messages with empty text content
    // — "messages: text content blocks must be non-empty". A common trigger is
    // a Slack file upload with no caption: chat-sdk produces a multipart user
    // message where the text part is the empty string. Sanitize user messages
    // so empty text never reaches the model. (System/assistant/tool messages
    // don't surface this failure mode in practice.)
    const placeholder = '[attached content / no caption]';
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (!m || m.role !== 'user') continue;
      if (typeof m.content === 'string') {
        if (m.content.trim() === '') {
          messages[i] = { ...m, content: placeholder };
        }
        continue;
      }
      if (Array.isArray(m.content)) {
        const parts = m.content.map((p) => {
          if (p && typeof p === 'object' && (p as { type?: string }).type === 'text') {
            const tp = p as { type: 'text'; text?: string };
            if (!tp.text || tp.text.trim() === '') {
              return { ...tp, text: placeholder };
            }
          }
          return p;
        });
        messages[i] = { ...m, content: parts as typeof m.content };
      }
    }

    const systemPrompt = getSystemPrompt({
      slackUserId,
      teamId,
      channelId,
      currentDate: new Date().toISOString().slice(0, 10),
      toolNames: Object.keys(tools),
      skillCatalog: getAvailableSkills().map((s) => ({ name: s.name, description: s.description })),
      activeSkills: getAutoActiveSkills(userText).map((s) => ({ name: s.name, body: s.body })),
    });

    const agent = new ToolLoopAgent({
      model: gateway(env().LLM_MODEL),
      instructions: systemPrompt,
      tools: wrappedTools,
      stopWhen: stepCountIs(env().MAX_AGENT_STEPS),
      experimental_context: {
        slackUserId,
        teamId,
        channelId,
        threadTs: thread.id,
        composioEntityId: entityId,
        // The live Chat SDK thread, so file-delivering tools (render_artifact,
        // export_pdf) post through it. The SDK derives the real Slack channel +
        // thread_ts internally; `thread.id` is a composite adapter id, NOT a raw
        // Slack thread_ts, so a hand-rolled filesUploadV2 with it silently fails
        // to land the file in the thread.
        thread,
      },
    });

    const result = await agent.stream({ messages });
    // Re-trigger typing right before streaming so the indicator persists
    // through the model's first-token latency.
    await thread.startTyping().catch(() => {});
    // `fullStream` preserves step boundaries (text-delta, tool-call, tool-result,
    // step-start/finish) so the Slack adapter renders multi-tool runs with
    // proper separators instead of one mashed-together stream.
    await thread.post(result.fullStream);
    const finalText = await result.text;

    // Mark the plan complete once the response is streamed.
    try {
      await plan.complete({ completeMessage: 'Done' });
    } catch {
      /* best effort */
    }

    recordMessage({
      slackUserId,
      threadTs: thread.id,
      channelId,
      role: 'assistant',
      content: finalText,
    }).catch((err) => log.warn({ err }, 'record_assistant_failed'));

    const usage = await result.totalUsage;
    log.info(
      {
        surface,
        threadId: thread.id,
        latencyMs: Date.now() - t0,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        steps: (await result.steps).length,
      },
      'ekko.response',
    );
  } catch (err) {
    log.error({ err, surface, threadId: thread.id }, 'ekko.error');
    try {
      await thread.post(':warning: I hit an error pulling that together. Please try again.');
    } catch {
      /* best effort */
    }
  } finally {
    await mcpToolset.close().catch(() => {});
  }
}
