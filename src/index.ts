#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PiazzaClient } from "./client/piazza-client.js";
import { registerAllTools } from "./tools/register.js";

const email = process.env.PIAZZA_EMAIL;
const password = process.env.PIAZZA_PASSWORD;

if (!email || !password) {
  console.error(
    "Error: PIAZZA_EMAIL and PIAZZA_PASSWORD environment variables are required.\n" +
      "Set them when configuring the MCP server:\n" +
      '  claude mcp add piazza -e PIAZZA_EMAIL=you@school.edu -e PIAZZA_PASSWORD=yourpass -- node /path/to/dist/index.js'
  );
  process.exit(1);
}

const client = new PiazzaClient(email, password);

const server = new McpServer({
  name: "piazza-mcp",
  version: "1.0.0",
});

registerAllTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
