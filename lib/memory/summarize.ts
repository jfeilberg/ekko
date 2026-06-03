import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { env } from '../env';
import { db } from '../db';

const COMPACT_THRESHOLD = 40;
const COMPACT_BATCH = 30;

type Row = { id: number; role: string; content: string };

export async function compactOldMessages(): Promise<{ threadsCompacted: number; messagesSummarized: number }> {
  const sql = db();

  // Get distinct (user, thread) pairs that have messages.
  const groups = await sql<{ slack_user_id: string; thread_ts: string }[]>`
    SELECT DISTINCT slack_user_id, thread_ts FROM messages
  `;

  let threadsCompacted = 0;
  let messagesSummarized = 0;

  for (const { slack_user_id: slackUserId, thread_ts: threadTs } of groups) {
    const lastRows = await sql<{ covered_through_id: number }[]>`
      SELECT covered_through_id FROM summaries
      WHERE slack_user_id = ${slackUserId} AND thread_ts = ${threadTs}
      ORDER BY id DESC LIMIT 1
    `;
    const sinceId = lastRows[0]?.covered_through_id ?? 0;

    const candidates = await sql<Row[]>`
      SELECT id, role, content FROM messages
      WHERE slack_user_id = ${slackUserId}
        AND thread_ts = ${threadTs}
        AND id > ${sinceId}
        AND role IN ('user', 'assistant')
      ORDER BY id ASC
    `;

    if (candidates.length < COMPACT_THRESHOLD) continue;

    const batch = candidates.slice(0, COMPACT_BATCH);
    const transcript = batch.map((r) => `${r.role}: ${r.content}`).join('\n');

    const { text: summary } = await generateText({
      model: gateway(env().LLM_MODEL),
      prompt: `Summarize the following Slack agent conversation succinctly. Keep decisions, facts, and unresolved questions. 5-10 bullet points.\n\n${transcript}`,
    });

    const lastRow = batch[batch.length - 1];
    if (!lastRow) continue;

    await sql`
      INSERT INTO summaries (slack_user_id, thread_ts, summary, covered_through_id)
      VALUES (${slackUserId}, ${threadTs}, ${summary}, ${lastRow.id})
    `;

    threadsCompacted += 1;
    messagesSummarized += batch.length;
  }

  return { threadsCompacted, messagesSummarized };
}
