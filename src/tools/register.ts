import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";
import { registerCourseTools } from "./courses.js";
import { registerPostTools } from "./posts.js";
import { registerUserTools } from "./users.js";
import { registerCreateTools } from "./create.js";
import { registerAnswerTools } from "./answers.js";
import { registerManageTools } from "./manage.js";

export function registerAllTools(server: McpServer, client: PiazzaClient): void {
  registerCourseTools(server, client);
  registerPostTools(server, client);
  registerUserTools(server, client);
  registerCreateTools(server, client);
  registerAnswerTools(server, client);
  registerManageTools(server, client);
}
