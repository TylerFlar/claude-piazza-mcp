import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";

export function registerManageTools(server: McpServer, client: PiazzaClient): void {
  server.tool(
    "edit_post",
    "Edit the title or content of an existing Piazza post. You must provide at least one of title or content.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number to edit"),
      title: z.string().optional().describe("New title/subject (omit to keep current)"),
      content: z.string().optional().describe("New body content (omit to keep current)"),
    },
    async ({ network_id, post_number, title, content }) => {
      if (!title && !content) {
        return {
          content: [{ type: "text", text: "Error: Must provide at least one of 'title' or 'content' to edit." }],
          isError: true,
        };
      }
      try {
        await client.updatePost(network_id, post_number, title, content);
        return {
          content: [{ type: "text", text: `Post @${post_number} updated.` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error editing post: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "delete_post",
    "Delete a Piazza post. This action is destructive and cannot be undone. Requires instructor/TA privileges.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number to delete"),
    },
    async ({ network_id, post_number }) => {
      try {
        await client.deletePost(network_id, post_number);
        return {
          content: [{ type: "text", text: `Post @${post_number} deleted.` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error deleting post: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "pin_post",
    "Pin or unpin a Piazza post. Pinned posts appear at the top of the feed.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number"),
      pin: z.boolean().default(true).describe("True to pin, false to unpin"),
    },
    async ({ network_id, post_number, pin }) => {
      try {
        await client.pinPost(network_id, post_number, pin);
        return {
          content: [
            {
              type: "text",
              text: `Post @${post_number} ${pin ? "pinned" : "unpinned"}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error ${pin ? "pinning" : "unpinning"} post: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "mark_duplicate",
    "Mark a Piazza post as a duplicate of another post. The duplicate will link to the original.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      duplicate_post: z.string().describe("The post number to mark as duplicate"),
      original_post: z.string().describe("The original post number it duplicates"),
      message: z.string().optional().describe("Optional message explaining the duplication"),
    },
    async ({ network_id, duplicate_post, original_post, message }) => {
      try {
        await client.markDuplicate(
          network_id,
          duplicate_post,
          original_post,
          message
        );
        return {
          content: [
            {
              type: "text",
              text: `Post @${duplicate_post} marked as duplicate of @${original_post}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error marking duplicate: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "mark_resolved",
    "Mark a Piazza question as resolved or unresolved.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number"),
      resolved: z.boolean().default(true).describe("True to mark resolved, false for unresolved"),
    },
    async ({ network_id, post_number, resolved }) => {
      try {
        await client.markResolved(network_id, post_number, resolved);
        return {
          content: [
            {
              type: "text",
              text: `Post @${post_number} marked as ${resolved ? "resolved" : "unresolved"}.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error marking resolved: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "mark_read",
    "Mark a Piazza post as read.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number to mark as read"),
    },
    async ({ network_id, post_number }) => {
      try {
        await client.markRead(network_id, post_number);
        return {
          content: [{ type: "text", text: `Post @${post_number} marked as read.` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error marking read: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
