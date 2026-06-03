/**
 * PERSONAL extension point: add MCP servers here. They will be connected on every turn
 * and their tools merged into the agent loop alongside Composio, custom, and builtin tools.
 *
 * - `url`: HTTPS endpoint of the MCP server (StreamableHTTP transport)
 * - `authorization`: a function (so env vars are read at runtime, not at module init)
 *   returning the value of the Authorization header. Omit for unauthenticated servers.
 *
 * Tool names are prefixed with the server key, e.g. an MCP tool `search` on a server
 * named `mycompany` becomes `mycompany_search` in the agent's tool list.
 *
 * Example:
 *   mycompany: {
 *     url: 'https://mcp.mycompany.com',
 *     authorization: () => `Bearer ${process.env.MYCOMPANY_TOKEN ?? ''}`,
 *   },
 */
export type MCPServerConfig = {
  url: string;
  authorization?: () => string;
};

export const mcpServers: Record<string, MCPServerConfig> = {};
