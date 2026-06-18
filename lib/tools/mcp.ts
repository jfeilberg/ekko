import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { jsonSchema, dynamicTool } from 'ai';
import type { Tool } from 'ai';
import { connections } from './connections.generated';
import { withStatusLabel } from './registry';
import { log } from '../log';

export type MCPToolset = {
  tools: Record<string, Tool>;
  close: () => Promise<void>;
};

export async function getMcpToolset(): Promise<MCPToolset> {
  const clients: Array<Client> = [];
  const tools: Record<string, Tool> = {};

  for (const [serverName, cfg] of Object.entries(connections)) {
    if (cfg.type !== 'mcp') continue;
    try {
      const headers: Record<string, string> = {};
      if (cfg.authorization) headers['Authorization'] = cfg.authorization();

      const transport = new StreamableHTTPClientTransport(new URL(cfg.url), {
        requestInit: Object.keys(headers).length ? { headers } : undefined,
      });

      const client = new Client({ name: 'ekko', version: '1.0.0' });
      await client.connect(transport);
      clients.push(client);

      const { tools: serverTools } = await client.listTools();

      for (const mcpTool of serverTools) {
        const prefixedName = `${serverName}_${mcpTool.name}`;
        const aiTool = withStatusLabel(
          dynamicTool({
            description: mcpTool.description ?? `${prefixedName} tool`,
            inputSchema: jsonSchema(
              mcpTool.inputSchema as Parameters<typeof jsonSchema>[0],
            ),
            execute: async (input: unknown) => {
              const result = await client.callTool({
                name: mcpTool.name,
                arguments: input as Record<string, unknown>,
              });
              return result;
            },
          }) as unknown as Tool,
          `Using ${serverName}…`,
        );
        tools[prefixedName] = aiTool;
      }
    } catch (err) {
      log.warn({ err, serverName }, 'mcp_server_failed');
    }
  }

  return {
    tools,
    close: async () => {
      await Promise.allSettled(clients.map((c) => c.close()));
    },
  };
}
