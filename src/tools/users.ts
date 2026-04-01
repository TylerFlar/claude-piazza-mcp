import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";
import { formatUser } from "../util/format.js";

export function registerUserTools(server: McpServer, client: PiazzaClient): void {
  server.tool(
    "list_users",
    "List all users (students, instructors, TAs) in a Piazza course with their names, emails, and roles.",
    { network_id: z.string().describe("The Piazza network/course ID") },
    async ({ network_id }) => {
      try {
        const users = await client.getAllUsers(network_id);
        if (users.length === 0) {
          return {
            content: [{ type: "text", text: "No users found in this course." }],
          };
        }
        const formatted = users.map(formatUser).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Found ${users.length} user(s):\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error listing users: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_user_profile",
    "Get profile information for specific users in a Piazza course by their user IDs.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      user_ids: z.array(z.string()).describe("Array of user IDs to look up"),
    },
    async ({ network_id, user_ids }) => {
      try {
        const users = await client.getUsers(network_id, user_ids);
        if (users.length === 0) {
          return {
            content: [{ type: "text", text: "No users found for the given IDs." }],
          };
        }
        const formatted = users.map(formatUser).join("\n");
        return {
          content: [{ type: "text", text: formatted }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting user profiles: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
