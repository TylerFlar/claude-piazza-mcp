import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PiazzaClient } from "../client/piazza-client.js";
import { formatPost, formatFeedItem } from "../util/format.js";

export function registerPostTools(server: McpServer, client: PiazzaClient): void {
  server.tool(
    "get_post",
    "Get a full Piazza post including the question body, all answers (student and instructor), follow-up discussions, and endorsements. Use the post number (e.g. '123' for @123).",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      post_number: z.string().describe("The post number (e.g., '123' for @123)"),
    },
    async ({ network_id, post_number }) => {
      try {
        const post = await client.getPost(network_id, post_number);
        return {
          content: [{ type: "text", text: formatPost(post) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting post: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "get_feed",
    "Get the feed of recent posts in a Piazza course, sorted by most recently updated. Supports pagination.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      limit: z.number().default(20).describe("Maximum number of posts to return (default 20)"),
      offset: z.number().default(0).describe("Number of posts to skip for pagination (default 0)"),
    },
    async ({ network_id, limit, offset }) => {
      try {
        const feed = await client.getFeed(network_id, limit, offset);
        if (feed.length === 0) {
          return {
            content: [{ type: "text", text: "No posts found in feed." }],
          };
        }
        const formatted = feed.map(formatFeedItem).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Showing ${feed.length} post(s) (offset ${offset}):\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error getting feed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "search_posts",
    "Search for posts in a Piazza course by keyword. Returns matching posts with their numbers and subjects.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      query: z.string().describe("Search query string"),
    },
    async ({ network_id, query }) => {
      try {
        const results = await client.search(network_id, query);
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: `No posts found matching "${query}".` }],
          };
        }
        const formatted = results.map(formatFeedItem).join("\n");
        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} result(s) for "${query}":\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error searching posts: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    "filter_posts",
    "Filter the post feed by folder, following status, or unread status.",
    {
      network_id: z.string().describe("The Piazza network/course ID"),
      folder: z.string().optional().describe("Filter by folder name"),
      following: z.boolean().optional().describe("Only show posts you're following"),
      unread: z.boolean().optional().describe("Only show unread posts"),
    },
    async ({ network_id, folder, following, unread }) => {
      try {
        const results = await client.filterFeed(network_id, {
          folder,
          following,
          unread,
        });
        if (results.length === 0) {
          return {
            content: [{ type: "text", text: "No posts match the filter criteria." }],
          };
        }
        const formatted = results.map(formatFeedItem).join("\n");
        const filters: string[] = [];
        if (folder) filters.push(`folder: ${folder}`);
        if (following) filters.push("following");
        if (unread) filters.push("unread");
        return {
          content: [
            {
              type: "text",
              text: `Found ${results.length} post(s) [${filters.join(", ")}]:\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error filtering posts: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
