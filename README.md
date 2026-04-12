# @tasque/piazza-mcp

MCP server for Piazza Q&A platform via reverse-engineered internal API.

> **Warning** — Piazza has no public API. This uses reverse-engineered endpoints that may break or violate their Terms of Service.

## Tools

| Tool | Description |
|------|-------------|
| `list_courses` | List all enrolled Piazza courses |
| `get_course_info` | Get detailed course info |
| `get_course_stats` | Get course statistics |
| `get_post` | Get full post with answers and follow-ups |
| `get_feed` | Get recent posts feed with pagination |
| `search_posts` | Search posts by keyword |
| `filter_posts` | Filter feed by folder, following, or unread |
| `create_post` | Create a question, note, or poll |
| `create_followup` | Add a follow-up to a post |
| `create_reply` | Reply to a follow-up |
| `post_student_answer` | Post or update the student answer |
| `post_instructor_answer` | Post or update the instructor answer |
| `mark_answer_good` | Endorse an answer or follow-up |
| `remove_answer_good` | Remove an endorsement |
| `edit_post` | Edit a post's title or content |
| `delete_post` | Delete a post (instructor/TA only) |
| `pin_post` | Pin or unpin a post |
| `mark_duplicate` | Mark a post as duplicate |
| `mark_resolved` | Mark a question as resolved |
| `mark_read` | Mark a post as read |
| `list_users` | List all course members |
| `get_user_profile` | Get user profiles by ID |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PIAZZA_EMAIL` | Yes | Piazza account email |
| `PIAZZA_PASSWORD` | Yes | Piazza account password |

## Auth Setup

Set both environment variables. The server authenticates via form-based login with CSRF token extraction. Sessions are maintained in memory with automatic re-authentication on 401/403.

## Development

```bash
npm install
npm run build
npm start        # stdio mode
```
