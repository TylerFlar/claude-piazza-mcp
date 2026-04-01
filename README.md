# claude-piazza-mcp

An MCP (Model Context Protocol) server that gives Claude full access to Piazza, the educational Q&A platform. Supports 22 tools covering courses, posts, answers, follow-ups, user management, and more.

## Setup

### Prerequisites

- Node.js >= 20
- A Piazza account (email + password)

### Install & Build

```bash
git clone https://github.com/TylerFlar/claude-piazza-mcp.git
cd claude-piazza-mcp
npm install
npm run build
```

### Add to Claude Code

```bash
claude mcp add piazza \
  -e PIAZZA_EMAIL=you@school.edu \
  -e PIAZZA_PASSWORD=yourpassword \
  -- node /path/to/claude-piazza-mcp/dist/index.js
```

Or add manually to your Claude Code settings:

```json
{
  "mcpServers": {
    "piazza": {
      "command": "node",
      "args": ["/path/to/claude-piazza-mcp/dist/index.js"],
      "env": {
        "PIAZZA_EMAIL": "you@school.edu",
        "PIAZZA_PASSWORD": "yourpassword"
      }
    }
  }
}
```

## Tools

### Courses
| Tool | Description |
|------|-------------|
| `list_courses` | List all enrolled Piazza courses |
| `get_course_info` | Get detailed course info (folders, instructors, settings) |
| `get_course_stats` | Get course statistics (participation, post counts) |

### Reading Posts
| Tool | Description |
|------|-------------|
| `get_post` | Get full post with answers, follow-ups, endorsements |
| `get_feed` | Get recent posts feed with pagination |
| `search_posts` | Search posts by keyword |
| `filter_posts` | Filter by folder, following status, unread |

### Creating Content
| Tool | Description |
|------|-------------|
| `create_post` | Create a question, note, or poll |
| `create_followup` | Add a follow-up discussion to a post |
| `create_reply` | Reply to a follow-up discussion |

### Answering
| Tool | Description |
|------|-------------|
| `post_student_answer` | Post/update the student answer |
| `post_instructor_answer` | Post/update the instructor answer |
| `mark_answer_good` | Endorse an answer or follow-up |
| `remove_answer_good` | Remove an endorsement |

### Management
| Tool | Description |
|------|-------------|
| `edit_post` | Edit a post's title or content |
| `delete_post` | Delete a post |
| `pin_post` | Pin/unpin a post |
| `mark_duplicate` | Mark a post as duplicate |
| `mark_resolved` | Mark a question as resolved/unresolved |
| `mark_read` | Mark a post as read |

### Users
| Tool | Description |
|------|-------------|
| `list_users` | List all users in a course |
| `get_user_profile` | Get specific user profiles |

## Finding Your Course ID

1. Log into [piazza.com](https://piazza.com)
2. Navigate to your course
3. The URL will look like `https://piazza.com/class/abc123xyz` — the course ID is `abc123xyz`

## How It Works

This server uses Piazza's internal API (there is no official public API). Authentication is done via email/password, and a session cookie is maintained for the lifetime of the server process. The server automatically handles session expiry and re-authentication.

## License

MIT
