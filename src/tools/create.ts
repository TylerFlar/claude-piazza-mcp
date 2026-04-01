import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";

export function registerCreateTools(server: McpServer, client: PiazzaClient): void {
  server.tool(
    "create_post",
    "Create a new post (question, note, or poll) in a Piazza course.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      type: z.enum(["question", "note", "poll"]).describe("Type of post to create"),
      title: z.string().describe("Post title/subject"),
      content: z.string().describe("Post body content (HTML supported)"),
      folders: z.array(z.string()).default([]).describe("Folders to file the post under"),
      anonymous: z.boolean().default(false).describe("Post anonymously to classmates"),
    },
    async ({ network_id, type, title, content, folders, anonymous }) => {
      try {
        const post = await client.createPost(network_id, {
          type,
          title,
          content,
          folders,
          anonymous,
        });
        return {
          content: [
            {
              type: "text",
              text: `Post created successfully! Post @${post.nr ?? post.id} (${type})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error creating post: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "create_followup",
    "Create a follow-up discussion on an existing Piazza post.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number to add a follow-up to"),
      content: z.string().describe("Follow-up content"),
      anonymous: z.boolean().default(false).describe("Post anonymously"),
    },
    async ({ network_id, post_number, content, anonymous }) => {
      try {
        await client.createFollowup(network_id, post_number, content, anonymous);
        return {
          content: [
            {
              type: "text",
              text: `Follow-up added to post @${post_number}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error creating follow-up: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "create_reply",
    "Reply to a follow-up discussion on a Piazza post.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number"),
      followup_id: z.string().describe("The follow-up ID to reply to"),
      content: z.string().describe("Reply content"),
      anonymous: z.boolean().default(false).describe("Reply anonymously"),
    },
    async ({ network_id, post_number, followup_id, content, anonymous }) => {
      try {
        await client.createReply(
          network_id,
          post_number,
          followup_id,
          content,
          anonymous
        );
        return {
          content: [
            {
              type: "text",
              text: `Reply added to follow-up on post @${post_number}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error creating reply: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
