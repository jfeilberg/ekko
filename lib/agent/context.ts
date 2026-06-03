import type { ModelMessage } from 'ai';

export type ThreadRow = { role: 'user' | 'assistant'; content: string; created_at: string };
export type SummaryRow = { summary: string; created_at: string };
export type Recall = { content: string; similarity: number };

export type AssembleInput = {
  summaries: SummaryRow[];
  thread: ThreadRow[];     // order doesn't matter; we sort
  recall: Recall[];
  currentUserText: string;
};

export function assembleMessages(input: AssembleInput): ModelMessage[] {
  const out: ModelMessage[] = [];

  if (input.summaries.length) {
    const text = input.summaries
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((s) => `- ${s.summary}`)
      .join('\n');
    out.push({ role: 'system', content: `Earlier summary of this conversation:\n${text}` });
  }

  if (input.recall.length) {
    const text = input.recall
      .slice()
      .sort((a, b) => b.similarity - a.similarity)
      .map((r) => `- ${r.content}`)
      .join('\n');
    out.push({ role: 'system', content: `Other relevant context from past conversations:\n${text}` });
  }

  const ordered = input.thread.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  // Drop trailing user row if it equals currentUserText (already going to be appended).
  const last = ordered[ordered.length - 1];
  if (ordered.length && last?.role === 'user' && last?.content === input.currentUserText) {
    ordered.pop();
  }
  for (const row of ordered) out.push({ role: row.role, content: row.content });

  out.push({ role: 'user', content: input.currentUserText });
  return out;
}

export async function loadContext(args: {
  slackUserId: string;
  threadTs: string;
  currentUserText: string;
}): Promise<AssembleInput> {
  const { db } = await import('../db');
  const { embed } = await import('ai');
  const { gateway } = await import('@ai-sdk/gateway');
  const { env } = await import('../env');
  const sql = db();

  const RECENT_LIMIT = 12;
  const RECALL_LIMIT = 5;

  const [threadRows, summaryRows] = await Promise.all([
    sql<ThreadRow[]>`
      SELECT role, content, created_at FROM messages
      WHERE slack_user_id = ${args.slackUserId}
        AND thread_ts = ${args.threadTs}
        AND role IN ('user', 'assistant')
      ORDER BY created_at DESC
      LIMIT ${RECENT_LIMIT}
    `,
    sql<SummaryRow[]>`
      SELECT summary, created_at FROM summaries
      WHERE slack_user_id = ${args.slackUserId}
        AND thread_ts = ${args.threadTs}
      ORDER BY created_at ASC
    `,
  ]);

  let recall: Recall[] = [];
  try {
    const { embedding } = await embed({ model: gateway.embedding(env().EMBEDDING_MODEL), value: args.currentUserText });
    const embeddingLiteral = `[${embedding.join(',')}]`;
    recall = await sql<Recall[]>`
      SELECT * FROM match_messages(
        ${embeddingLiteral}::vector,
        ${args.slackUserId},
        ${args.threadTs},
        ${RECALL_LIMIT}
      )
    `;
  } catch {
    recall = [];
  }

  return {
    summaries: summaryRows,
    thread: threadRows.slice().reverse(),
    recall,
    currentUserText: args.currentUserText,
  };
}
