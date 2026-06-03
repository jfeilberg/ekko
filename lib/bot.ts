import { Chat, type Thread, type StateAdapter } from 'chat';
import { createSlackAdapter, SlackAdapter } from '@chat-adapter/slack';
import { createMemoryState } from '@chat-adapter/state-memory';
import { createRedisState } from '@chat-adapter/state-redis';
import { env } from './env';
import { log } from './log';
import { isAllowed, ACCESS_DENIED_MESSAGE } from './access';
import { runTurn } from './agent/run-turn';
import { getSuggestedPrompts } from './agent/suggested-prompts';
import { composioClient } from './tools/composio';
import { ensureSlackUser } from './memory/store';

type EkkoChat = Chat<{ slack: ReturnType<typeof createSlackAdapter> }>;

let bot: EkkoChat | null = null;
let stateAdapter: StateAdapter | null = null;

/** Strip platform prefix like `slack:C0123ABC` → `C0123ABC`. */
export function bareId(id: string): string {
  const parts = id.split(':');
  return parts[parts.length - 1] ?? id;
}

/** Extract Slack team ID from the raw message payload (best-effort). */
function extractTeamId(raw: unknown): string {
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if (typeof r['team_id'] === 'string') return r['team_id'];
    if (typeof r['team'] === 'string') return r['team'];
  }
  return 'unknown';
}

function registerHandlers(chat: EkkoChat): void {
  chat.onNewMention(async (thread, message) => {
    const subject = { userId: message.author.userId, channelId: bareId(thread.channelId) };
    if (!isAllowed(subject)) {
      log.info({ ...subject }, 'ekko.denied');
      await thread.post(ACCESS_DENIED_MESSAGE);
      return;
    }
    log.info({ surface: 'mention', threadId: thread.id, ...subject }, 'ekko.request');
    await thread.subscribe();
    await runTurn({
      thread,
      slackUserId: subject.userId,
      teamId: extractTeamId(message.raw),
      channelId: subject.channelId,
      userText: message.text ?? '',
      surface: 'mention',
    });
  });

  chat.onSubscribedMessage(async (thread, message) => {
    const subject = { userId: message.author.userId, channelId: bareId(thread.channelId) };
    if (!isAllowed(subject)) return; // silent deny on follow-ups; the user already saw the denial on the mention
    log.info({ surface: 'follow_up', threadId: thread.id, ...subject }, 'ekko.request');
    await runTurn({
      thread,
      slackUserId: subject.userId,
      teamId: extractTeamId(message.raw),
      channelId: subject.channelId,
      userText: message.text ?? '',
      surface: 'follow_up',
    });
  });

  chat.onSlashCommand('/ekko', async (event) => {
    const subject = { userId: event.user.userId, channelId: bareId(event.channel.id) };
    if (!isAllowed(subject)) {
      await event.channel.post(ACCESS_DENIED_MESSAGE);
      return;
    }
    const question = event.text.trim();
    if (!question) {
      await event.channel.post('Ask me something, e.g. `/ekko What is on my plate today?`');
      return;
    }
    log.info({ surface: 'slash', channelId: subject.channelId, userId: subject.userId }, 'ekko.request');
    await runTurn({
      thread: event.channel as unknown as Thread,
      slackUserId: subject.userId ?? '',
      teamId: extractTeamId(event.raw),
      channelId: subject.channelId ?? '',
      userText: question,
      surface: 'slash',
    });
  });

  chat.onAssistantThreadStarted(async (event) => {
    const userId = event.userId;
    const channelId = event.channelId;
    const threadTs = event.threadTs;
    const teamId = event.context?.teamId ?? 'unknown';

    // Resolve entity ID so Composio can list per-user connections.
    let entityId = `slack:${teamId}:${userId}`;
    try {
      entityId = await ensureSlackUser(userId, teamId);
    } catch (err) {
      log.warn({ err }, 'assistant_thread_ensure_user_failed');
    }

    let connectedToolkits: string[] = [];
    const c = composioClient();
    if (c) {
      try {
        const conns = await c.connectedAccounts.list({ userIds: [entityId] });
        const seen = new Set<string>();
        for (const item of (conns.items ?? [])) {
          const slug = (item as { toolkit?: { slug?: string } }).toolkit?.slug;
          if (slug && !seen.has(slug)) {
            seen.add(slug);
            connectedToolkits.push(slug);
          }
        }
      } catch (err) {
        log.warn({ err }, 'composio_list_connections_failed');
      }
    }

    const prompts = getSuggestedPrompts({ connectedToolkits });
    const slackAdapter = event.adapter as SlackAdapter;
    const threadId = `slack:${channelId}:${threadTs}`;

    try {
      await slackAdapter.postMessage(threadId, "Hi! Ask me anything, or pick a suggestion below.");
    } catch (err) {
      log.warn({ err }, 'assistant_thread_welcome_failed');
    }

    if (connectedToolkits.length === 0) {
      try {
        await slackAdapter.postMessage(
          threadId,
          "I have no tools connected to your account yet. Just say what you need — " +
          "*'connect Gmail'*, *'connect Linear'*, *'connect Notion'* — and I'll generate a one-click " +
          "authorization link scoped to your Slack user. (Connecting via dashboard.composio.dev directly " +
          "binds the connection to a different identity and I won't see it.)"
        );
      } catch (err) {
        log.warn({ err }, 'assistant_thread_composio_hint_failed');
      }
    }

    try {
      await slackAdapter.setSuggestedPrompts(channelId, threadTs, prompts);
    } catch (err) {
      log.warn({ err }, 'set_suggested_prompts_failed');
    }
  });
}

export function getBot(): EkkoChat {
  if (bot) return bot;
  const e = env();
  stateAdapter = e.REDIS_URL ? createRedisState({ url: e.REDIS_URL }) : createMemoryState();
  const chat = new Chat({
    userName: 'ekko',
    adapters: {
      slack: createSlackAdapter({
        botToken: e.SLACK_BOT_TOKEN,
        signingSecret: e.SLACK_SIGNING_SECRET,
      }),
    },
    state: stateAdapter,
  });
  registerHandlers(chat);
  log.info({ state: e.REDIS_URL ? 'redis' : 'memory' }, 'ekko.boot');
  bot = chat;
  return bot;
}

