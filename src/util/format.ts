import { htmlToText } from "./html.js";
import type { Post, FeedItem, ClassInfo, UserInfo } from "../client/types.js";

function formatDate(dateStr: string): string {
  if (!dateStr) return "unknown";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function getAuthorName(post: Post, uid: string | undefined): string {
  if (!uid) return "Anonymous";
  if (post.anonymous === "yes" || post.anonymous === "stud") return "Anonymous";
  // Try to find name in change_log or tag_good_arr
  for (const entry of post.change_log ?? []) {
    if (entry.uid === uid && entry.anon !== "yes") {
      return entry.name ?? entry.uid;
    }
  }
  return uid;
}

export function formatPost(post: Post): string {
  const lines: string[] = [];

  // Header
  const nr = post.nr ?? "?";
  const subject = htmlToText(post.history?.[0]?.subject ?? post.subject ?? "Untitled");
  lines.push(`## Post @${nr}: ${subject}`);

  // Metadata
  const meta: string[] = [];
  meta.push(`Type: ${post.type ?? "unknown"}`);
  if (post.folders?.length) meta.push(`Folders: ${post.folders.join(", ")}`);
  meta.push(`Date: ${formatDate(post.created)}`);
  if (post.unique_views != null) meta.push(`Views: ${post.unique_views}`);
  if (post.no_answer === 1) meta.push("UNANSWERED");
  if (post.is_pinned) meta.push("PINNED");
  lines.push(meta.join(" | "));
  lines.push("");

  // Body
  const content = post.history?.[0]?.content ?? post.content ?? "";
  lines.push(htmlToText(content));

  // Tags
  if (post.tags?.length) {
    lines.push("");
    lines.push(`Tags: ${post.tags.join(", ")}`);
  }

  // Instructor Answer
  if (post.children) {
    const iAnswer = post.children.find(
      (c) => c.type === "i_answer"
    );
    if (iAnswer) {
      lines.push("");
      const endorsed = (post.tag_good_arr ?? []).some(
        (t) => t.type === "i_answer"
      )
        ? " (endorsed)"
        : "";
      lines.push(`### Instructor Answer${endorsed}`);
      const authorName = getAuthorName(post, iAnswer.uid);
      lines.push(`By: ${authorName} | Date: ${formatDate(iAnswer.created)}`);
      lines.push(htmlToText(iAnswer.history?.[0]?.content ?? iAnswer.content ?? ""));
    }
  }

  // Student Answer
  if (post.children) {
    const sAnswer = post.children.find(
      (c) => c.type === "s_answer"
    );
    if (sAnswer) {
      lines.push("");
      const endorsed = (post.tag_good_arr ?? []).some(
        (t) => t.type === "s_answer"
      )
        ? " (endorsed)"
        : "";
      lines.push(`### Student Answer${endorsed}`);
      const authorName = getAuthorName(post, sAnswer.uid);
      lines.push(`By: ${authorName} | Date: ${formatDate(sAnswer.created)}`);
      lines.push(htmlToText(sAnswer.history?.[0]?.content ?? sAnswer.content ?? ""));
    }
  }

  // Follow-ups
  if (post.children) {
    const followups = post.children.filter(
      (c) => c.type === "followup"
    );
    if (followups.length > 0) {
      lines.push("");
      lines.push("### Follow-ups");
      for (let i = 0; i < followups.length; i++) {
        const fu = followups[i];
        const fuAuthor = fu.anonymous === "yes" ? "Anonymous" : fu.uid ?? "Unknown";
        lines.push("");
        lines.push(`#### #${i + 1} by ${fuAuthor} (${formatDate(fu.created)})`);
        lines.push(htmlToText(fu.subject ?? fu.content ?? ""));

        // Follow-up replies
        if (fu.children?.length) {
          for (const reply of fu.children) {
            const replyAuthor =
              reply.anonymous === "yes" ? "Anonymous" : reply.uid ?? "Unknown";
            lines.push(
              `  > Reply by ${replyAuthor} (${formatDate(reply.created)}): ${htmlToText(reply.subject ?? reply.content ?? "")}`
            );
          }
        }
      }
    }
  }

  return lines.join("\n");
}

export function formatFeedItem(item: FeedItem): string {
  const status = item.no_answer === 1 ? " [UNANSWERED]" : "";
  const unread = item.is_new ? " [NEW]" : "";
  return `@${item.nr}: ${htmlToText(item.subject ?? "Untitled")}${status}${unread} (${item.type ?? "post"}, ${formatDate(item.modified ?? item.created ?? "")})`;
}

export function formatCourse(course: ClassInfo): string {
  const parts: string[] = [];
  parts.push(`${course.name ?? "Unnamed Course"}`);
  if (course.num) parts.push(`(${course.num})`);
  if (course.term) parts.push(`- ${course.term}`);
  parts.push(`| ID: ${course.nid}`);
  if (course.is_ta) parts.push("| Role: TA/Instructor");
  return parts.join(" ");
}

export function formatUser(user: UserInfo): string {
  const parts: string[] = [];
  parts.push(user.name ?? "Unknown");
  if (user.email) parts.push(`<${user.email}>`);
  if (user.role) parts.push(`(${user.role})`);
  if (user.days != null) parts.push(`| Last active: ${user.days} days ago`);
  return parts.join(" ");
}
