import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";
import { formatCourse } from "../util/format.js";

export function registerCourseTools(server: McpServer, client: PiazzaClient): void {
  server.tool(
    "list_courses",
    "List all Piazza courses/networks the authenticated user is enrolled in. Returns course names, IDs, terms, and roles.",
    {},
    async () => {
      try {
        const classes = await client.getUserClasses();
        if (classes.length === 0) {
          return {
            content: [{ type: "text", text: "No active courses found." }],
          };
        }
        const formatted = classes.map(formatCourse).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Found ${classes.length} active course(s):\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error listing courses: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_course_info",
    "Get detailed information about a specific Piazza course/network including folders, instructors, term, and settings.",
    { network_id: z.string().describe("The Piazza network/course ID") },
    async ({ network_id }) => {
      try {
        const info = await client.getNetworkInfo(network_id);
        const lines: string[] = [];
        lines.push(`## ${info.name ?? "Course"}`);
        if (info.course_number) lines.push(`Course Number: ${info.course_number}`);
        if (info.term) lines.push(`Term: ${info.term}`);
        if (info.description) lines.push(`Description: ${info.description}`);
        if (info.created) lines.push(`Created: ${info.created}`);
        lines.push(`Status: ${info.is_active ? "Active" : "Inactive"}`);
        if (info.folders?.length) {
          lines.push(`\nFolders: ${info.folders.join(", ")}`);
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting course info: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_course_stats",
    "Get statistics for a Piazza course including participation data, post counts, and response metrics.",
    { network_id: z.string().describe("The Piazza network/course ID") },
    async ({ network_id }) => {
      try {
        const stats = await client.getStats(network_id);
        const lines: string[] = [];
        lines.push("## Course Statistics\n");
        for (const [key, value] of Object.entries(stats)) {
          if (typeof value === "object" && value !== null) {
            lines.push(`${key}: ${JSON.stringify(value, null, 2)}`);
          } else {
            lines.push(`${key}: ${value}`);
          }
        }
        return {
          content: [{ type: "text", text: lines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting course stats: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
