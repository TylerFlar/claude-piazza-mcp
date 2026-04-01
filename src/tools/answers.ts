import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";

export function registerAnswerTools(server: McpServer, client: PiazzaClient): void {
  server.tool(
    "post_student_answer",
    "Post or update the student answer on a Piazza question. The student answer is a collaborative wiki-style answer that any student can edit.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number to answer"),
      content: z.string().describe("Answer content (HTML supported)"),
      revision: z.number().default(0).describe("Revision number (0 for new answer, increment for edits)"),
      anonymous: z.boolean().default(false).describe("Answer anonymously"),
    },
    async ({ network_id, post_number, content, revision, anonymous }) => {
      try {
        await client.postStudentAnswer(
          network_id,
          post_number,
          content,
          revision,
          anonymous
        );
        return {
          content: [
            {
              type: "text",
              text: `Student answer posted on @${post_number}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error posting student answer: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "post_instructor_answer",
    "Post or update the instructor answer on a Piazza question. Requires instructor/TA privileges.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number to answer"),
      content: z.string().describe("Answer content (HTML supported)"),
      revision: z.number().default(0).describe("Revision number (0 for new answer, increment for edits)"),
      anonymous: z.boolean().default(false).describe("Answer anonymously"),
    },
    async ({ network_id, post_number, content, revision, anonymous }) => {
      try {
        await client.postInstructorAnswer(
          network_id,
          post_number,
          content,
          revision,
          anonymous
        );
        return {
          content: [
            {
              type: "text",
              text: `Instructor answer posted on @${post_number}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error posting instructor answer: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "mark_answer_good",
    "Mark an answer or follow-up as 'good answer' (endorse it). This is equivalent to the 'good answer' button on Piazza.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number"),
      type: z
        .enum(["i_answer", "s_answer", "followup"])
        .describe("Which content to endorse: i_answer (instructor), s_answer (student), or followup"),
    },
    async ({ network_id, post_number, type }) => {
      try {
        await client.markGoodAnswer(network_id, post_number, type);
        return {
          content: [
            {
              type: "text",
              text: `Marked ${type} as good answer on @${post_number}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error marking good answer: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "remove_answer_good",
    "Remove a 'good answer' endorsement from an answer or follow-up.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number"),
      type: z
        .enum(["i_answer", "s_answer", "followup"])
        .describe("Which content to un-endorse"),
    },
    async ({ network_id, post_number, type }) => {
      try {
        await client.removeGoodAnswer(network_id, post_number, type);
        return {
          content: [
            {
              type: "text",
              text: `Removed good answer mark from ${type} on @${post_number}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error removing good answer: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
