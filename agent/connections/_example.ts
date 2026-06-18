// Copy this file to agent/connections/<name>.ts to add a remote MCP server.
// The filename becomes the tool prefix, e.g. acme.ts → acme_<tool>.
import { defineConnection } from 'ekko';
export default defineConnection({
  type: 'mcp',
  url: 'https://mcp.example.com',
  authorization: () => `Bearer ${process.env.EXAMPLE_TOKEN ?? ''}`,
});
