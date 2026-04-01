/**
 * Lightweight HTML-to-text converter for Piazza post content.
 * Handles common HTML elements, preserves LaTeX, and decodes entities.
 * No external dependencies.
 */

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&laquo;": "«",
  "&raquo;": "»",
  "&bull;": "•",
  "&hellip;": "…",
};

function decodeEntities(text: string): string {
  // Named entities
  let result = text.replace(/&\w+;/g, (match) => ENTITY_MAP[match] ?? match);
  // Numeric entities (decimal)
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );
  // Numeric entities (hex)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
  return result;
}

export function htmlToText(html: string): string {
  if (!html) return "";

  let text = html;

  // Remove script and style blocks
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Preserve code blocks
  text = text.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
    return `\n\`\`\`\n${decodeEntities(code.replace(/<[^>]*>/g, ""))}\n\`\`\`\n`;
  });
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
    return `\n\`\`\`\n${decodeEntities(code.replace(/<[^>]*>/g, ""))}\n\`\`\`\n`;
  });

  // Inline code
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, code) => {
    return `\`${decodeEntities(code.replace(/<[^>]*>/g, ""))}\``;
  });

  // Convert links
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url, label) => {
    const cleanLabel = label.replace(/<[^>]*>/g, "").trim();
    if (cleanLabel === url || !cleanLabel) return url;
    return `${cleanLabel} (${url})`;
  });

  // Convert images to alt text or placeholder
  text = text.replace(/<img[^>]*alt="([^"]*)"[^>]*\/?>/gi, (_, alt) => alt || "[image]");
  text = text.replace(/<img[^>]*\/?>/gi, "[image]");

  // Headings
  text = text.replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, content) => {
    const prefix = "#".repeat(parseInt(level));
    return `\n${prefix} ${content.replace(/<[^>]*>/g, "").trim()}\n`;
  });

  // Lists
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
    return `\n- ${content.replace(/<[^>]*>/g, "").trim()}`;
  });
  text = text.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // Block elements → newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  text = text.replace(/<\/div>/gi, "\n");
  text = text.replace(/<\/blockquote>/gi, "\n");
  text = text.replace(/<blockquote[^>]*>/gi, "\n> ");
  text = text.replace(/<\/tr>/gi, "\n");
  text = text.replace(/<\/td>/gi, "\t");
  text = text.replace(/<hr\s*\/?>/gi, "\n---\n");

  // Bold and italic (strip tags, keep content)
  text = text.replace(/<\/?(?:strong|b)>/gi, "**");
  text = text.replace(/<\/?(?:em|i)>/gi, "*");

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Decode HTML entities
  text = decodeEntities(text);

  // Normalize whitespace (preserve newlines)
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n /g, "\n");
  text = text.replace(/ \n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.trim();

  return text;
}
