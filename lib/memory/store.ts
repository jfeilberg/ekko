import { embed } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { env } from '../env';
import { db } from '../db';
import { log } from '../log';

export type StoreInput = {
  slackUserId: string;
  threadTs: string;
  channelId: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: unknown;
};

export async function recordMessage(input: StoreInput): Promise<void> {
  let embedding: number[] | null = null;
  if (input.role !== 'tool' && input.content.trim().length > 0) {
    try {
      const { embedding: vec } = await embed({
        model: gateway.embedding(env().EMBEDDING_MODEL),
        value: input.content,
      });
      embedding = vec as unknown as number[];
    } catch (err) {
      log.warn({ err }, 'embed_failed');
    }
  }

  try {
    const sql = db();
    // pgvector accepts string-formatted vectors: '[0.1,0.2,...]'
    const embeddingLiteral = embedding ? `[${embedding.join(',')}]` : null;
    await sql`
      INSERT INTO messages (slack_user_id, thread_ts, channel_id, role, content, tool_calls, embedding)
      VALUES (
        ${input.slackUserId}, ${input.threadTs}, ${input.channelId},
        ${input.role}, ${input.content},
        ${input.toolCalls ? sql.json(input.toolCalls as Parameters<typeof sql.json>[0]) : null},
        ${embeddingLiteral}::vector
      )
    `;
  } catch (err) {
    log.warn({ err, role: input.role, threadTs: input.threadTs }, 'record_message_failed');
  }
}

export async function ensureSlackUser(slackUserId: string, teamId: string): Promise<string> {
  const entityId = `slack:${teamId}:${slackUserId}`;
  const sql = db();
  await sql`
    INSERT INTO slack_users (slack_user_id, team_id, composio_entity_id)
    VALUES (${slackUserId}, ${teamId}, ${entityId})
    ON CONFLICT (slack_user_id) DO NOTHING
  `;
  return entityId;
}
