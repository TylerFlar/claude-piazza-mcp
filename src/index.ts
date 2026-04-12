#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

if (process.env.MCP_TRANSPORT === "http") {
  const { default: express } = await import("express");
  const { StreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/streamableHttp.js"
  );
  const crypto = await import("crypto");

  const app = express();
  app.use(express.json());

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "GET") {
      const transport = transports.get(sessionId!);
      if (!transport) { res.status(404).send("Session not found"); return; }
      await transport.handleRequest(req, res);
    } else if (req.method === "POST") {
      if (!sessionId) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => crypto.randomUUID(),
          onsessioninitialized: (id) => { transports.set(id, transport); },
        });
        transport.onclose = () => {
          if (transport.sessionId) transports.delete(transport.sessionId);
        };
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } else {
        const transport = transports.get(sessionId);
        if (!transport) { res.status(404).send("Session not found"); return; }
        await transport.handleRequest(req, res);
      }
    } else if (req.method === "DELETE") {
      const transport = transports.get(sessionId!);
      if (transport) { await transport.close(); transports.delete(sessionId!); }
      res.status(200).send();
    } else {
      res.status(405).send("Method not allowed");
    }
  });

  const PORT = parseInt(process.env.MCP_PORT || "3100");
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MCP server listening on http://0.0.0.0:${PORT}/mcp`);
  });
} else {
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
