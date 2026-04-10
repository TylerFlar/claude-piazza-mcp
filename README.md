# claude-piazza-mcp

MCP server that integrates with [Piazza](https://piazza.com) (educational Q&A platform) via the Model Context Protocol, for use with Claude Code and Claude Desktop.

> **⚠️ Disclaimer** — Piazza does not offer a public API. This server reverse-engineers Piazza's internal JSON API and mimics browser requests with a spoofed User-Agent. This may violate Piazza's Terms of Service. Use at your own risk.

## Architecture

The server communicates over **stdio** transport using the MCP SDK. On startup it authenticates with Piazza via a two-step flow: fetch a CSRF token, then POST a form-based login (with a JSON API fallback). A session cookie is stored in-memory and used as a CSRF token for all subsequent API calls. The `PiazzaClient` class wraps Piazza's internal REST-style API (`piazza.com/logic/api?method=...`), handling automatic re-authentication on 401/403 responses and exponential-backoff retries (up to 3 attempts) for network errors.

## Prerequisites

- Node.js >= 20
- A Piazza account (email + password)

## Setup

### 1. Install & Build

```bash
git clone https://github.com/TylerFlar/claude-piazza-mcp.git
cd claude-piazza-mcp
npm install
npm run build
```

### 2. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PIAZZA_EMAIL` | Yes | Your Piazza account email address |
| `PIAZZA_PASSWORD` | Yes | Your Piazza account password |

### 3. MCP Client Configuration

**Claude Code (CLI):**

```bash
claude mcp add piazza \
  -e PIAZZA_EMAIL=you@school.edu \
  -e PIAZZA_PASSWORD=yourpassword \
  -- node /absolute/path/to/claude-piazza-mcp/dist/index.js
```

**Claude Desktop / Claude Code (JSON config):**

```json
{
  "mcpServers": {
    "piazza": {
      "command": "node",
      "args": ["/absolute/path/to/claude-piazza-mcp/dist/index.js"],
      "env": {
        "PIAZZA_EMAIL": "you@school.edu",
        "PIAZZA_PASSWORD": "yourpassword"
      }
    }
  }
}
```

## Tools Reference

### Courses (3 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `list_courses` | *(none)* | List all enrolled Piazza courses with names, IDs, terms, and roles |
| `get_course_info` | `network_id: string` | Get detailed course info (folders, instructors, term, settings) |
| `get_course_stats` | `network_id: string` | Get course statistics (participation, post counts, response metrics) |

### Reading Posts (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `get_post` | `network_id: string, post_number: string` | Get full post with answers, follow-ups, and endorsements |
| `get_feed` | `network_id: string, limit?: number (=20), offset?: number (=0)` | Get recent posts feed with pagination, sorted by last updated |
| `search_posts` | `network_id: string, query: string` | Search posts by keyword |
| `filter_posts` | `network_id: string, folder?: string, following?: boolean, unread?: boolean` | Filter feed by folder, following status, or unread status |

### Creating Content (3 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `create_post` | `network_id: string, type: "question"\|"note"\|"poll", title: string, content: string, folders?: string[] (=[]), anonymous?: boolean (=false)` | Create a new question, note, or poll |
| `create_followup` | `network_id: string, post_number: string, content: string, anonymous?: boolean (=false)` | Add a follow-up discussion to a post |
| `create_reply` | `network_id: string, post_number: string, followup_id: string, content: string, anonymous?: boolean (=false)` | Reply to a follow-up discussion |

### Answers (4 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `post_student_answer` | `network_id: string, post_number: string, content: string, revision?: number (=0), anonymous?: boolean (=false)` | Post or update the collaborative student answer (wiki-style) |
| `post_instructor_answer` | `network_id: string, post_number: string, content: string, revision?: number (=0), anonymous?: boolean (=false)` | Post or update the instructor answer (requires instructor/TA privileges) |
| `mark_answer_good` | `network_id: string, post_number: string, type: "i_answer"\|"s_answer"\|"followup"` | Endorse an answer or follow-up ("good answer" button) |
| `remove_answer_good` | `network_id: string, post_number: string, type: "i_answer"\|"s_answer"\|"followup"` | Remove an endorsement |

### Management (6 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `edit_post` | `network_id: string, post_number: string, title?: string, content?: string` | Edit a post's title or content (at least one required) |
| `delete_post` | `network_id: string, post_number: string` | Delete a post (destructive, requires instructor/TA privileges) |
| `pin_post` | `network_id: string, post_number: string, pin?: boolean (=true)` | Pin or unpin a post |
| `mark_duplicate` | `network_id: string, duplicate_post: string, original_post: string, message?: string` | Mark a post as duplicate of another |
| `mark_resolved` | `network_id: string, post_number: string, resolved?: boolean (=true)` | Mark a question as resolved or unresolved |
| `mark_read` | `network_id: string, post_number: string` | Mark a post as read |

### Users (2 tools)

| Tool | Parameters | Description |
|------|-----------|-------------|
| `list_users` | `network_id: string` | List all users (students, instructors, TAs) with names, emails, and roles |
| `get_user_profile` | `network_id: string, user_ids: string[]` | Get profile information for specific users by ID |

## Finding Your Course ID

1. Log into [piazza.com](https://piazza.com)
2. Navigate to your course
3. The URL will look like `https://piazza.com/class/abc123xyz` — the course ID is `abc123xyz`

## Internal API Layer

### `PiazzaClient`

- **Purpose**: Wraps Piazza's internal JSON API at `piazza.com/logic/api?method=<method>&aid=<nonce>`
- **Auth flow**:
  1. `GET /main/csrf_token` — extract token from `"token=ABCDEF1234;"` response, collect cookies
  2. `POST /class` with form-encoded email/password/csrf_token — merge session cookies
  3. Fallback: `POST /logic/api?method=user.login` with JSON payload if step 2 yields no session
  4. All subsequent requests include `Cookie` header (from in-memory jar) and `CSRF-Token` header (session_id cookie value)
  5. On 401/403 or auth-related error messages — automatic re-login and retry
- **Key methods**:

  | Method | Piazza API method | Description |
  |--------|------------------|-------------|
  | `getUserStatus()` | `user.status` | Get authenticated user info and network list |
  | `getUserClasses()` | `user.status` | Parse active courses from user status |
  | `getNetworkInfo(nid)` | `network.get` | Get course details |
  | `getStats(nid)` | `network.get_stats` | Get course statistics |
  | `getPost(nid, cid)` | `content.get` | Fetch full post content |
  | `getFeed(nid, limit, offset)` | `network.get_my_feed` | Paginated feed |
  | `search(nid, query)` | `network.search` | Keyword search |
  | `filterFeed(nid, opts)` | `network.filter_feed` | Filtered feed |
  | `createPost(nid, opts)` | `content.create` | Create question/note/poll |
  | `createFollowup(nid, cid, content, anon)` | `content.create` | Create followup (type: followup) |
  | `createReply(nid, cid, followupId, content, anon)` | `content.create` | Reply to followup (type: feedback) |
  | `postStudentAnswer(nid, cid, content, rev, anon)` | `content.answer` | Student answer (type: s_answer) |
  | `postInstructorAnswer(nid, cid, content, rev, anon)` | `content.answer` | Instructor answer (type: i_answer) |
  | `markGoodAnswer(nid, cid, type)` | `content.mark_good` | Endorse content |
  | `removeGoodAnswer(nid, cid, type)` | `content.unmark_good` | Remove endorsement |
  | `updatePost(nid, cid, subject?, content?)` | `content.update` | Edit post |
  | `deletePost(nid, cid)` | `content.delete` | Delete post |
  | `pinPost(nid, cid, pin)` | `content.pin` / `content.unpin` | Pin/unpin |
  | `markDuplicate(nid, cidDupe, cidTo, msg?)` | `content.mark_duplicate` | Mark duplicate |
  | `markResolved(nid, cid, resolved)` | `content.mark_resolved` | Resolve/unresolve |
  | `markRead(nid, cid)` | `content.mark_read` | Mark read |
  | `getAllUsers(nid)` | `network.get_all_users` | List all users |
  | `getUsers(nid, userIds)` | `network.get_users` | Get specific users |

- **Error handling**: Three custom error classes propagate through tool handlers:
  - `PiazzaAuthError` — credential or session failures
  - `PiazzaApiError` — Piazza returned an error in the response body
  - `PiazzaNetworkError` — HTTP errors, connection failures, timeout
  - Retry: up to 3 attempts with exponential backoff (500ms base). Auth errors trigger re-login before retry. Non-auth `PiazzaApiError` and `PiazzaAuthError` are thrown immediately without retry.

## Data Models

Key TypeScript interfaces from `src/client/types.ts`:

```typescript
interface Post {
  id: string;
  nr: number;
  type: string;              // "question" | "note" | "poll"
  status: string;
  subject?: string;
  content?: string;
  created: string;
  updated?: string;
  folders: string[];
  tags: string[];
  children?: ChildContent[];
  history?: PostRevision[];
  change_log?: ChangeLogEntry[];
  tag_good_arr?: TagGood[];
  unique_views?: number;
  no_answer: number;
  no_answer_followup?: number;
  is_pinned?: boolean;
  anonymous?: string;
}

interface ChildContent {
  id: string;
  type: string;              // "i_answer" | "s_answer" | "followup" | "feedback"
  uid?: string;
  subject?: string;
  content?: string;
  created: string;
  anonymous?: string;
  history?: PostRevision[];
  children?: ChildContent[];
  tag_endorse?: string[];
  no_upvotes?: number;
}

interface FeedItem {
  nr: number;
  id: string;
  subject?: string;
  type?: string;
  created?: string;
  modified?: string;
  content_snipet?: string;   // sic — Piazza's typo
  no_answer: number;
  is_new?: boolean;
  folders?: string[];
  tags?: string[];
  num_favorites?: number;
}

interface ClassInfo {
  nid: string;
  name: string;
  term: string;
  num: string;
  is_ta: boolean;
  status: string;
  course_number?: string;
}

interface UserInfo {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  photo?: string;
  days?: number;
  admin?: boolean;
  answered?: number;
  asks?: number;
  views?: number;
}

interface PiazzaApiResponse<T = unknown> {
  result: T;
  error: string | null;
  aid: string;
}
```

## Development

```bash
npm run dev    # Watch mode — recompiles on file changes
npm run build  # Production build (tsc)
npm start      # Run the built server (node dist/index.js)
```

## Security Considerations

- **Credential storage**: Email and password are passed as environment variables and held in-process memory. They are never written to disk by the server.
- **Session management**: Session cookies are stored in an in-memory `Map` for the lifetime of the process. No persistent cookie storage.
- **User-Agent spoofing**: The client sends a Chrome 131 User-Agent string to mimic browser traffic.
- **Data access**: With valid credentials, the server has full read/write access to all courses the account is enrolled in — including creating, editing, and deleting posts.
- **No rate limiting**: The server does not implement rate limiting beyond retry backoff. Heavy use may trigger Piazza's server-side rate limits.
- **Unofficial API**: Piazza's internal API is undocumented and may change without notice, breaking this server.

## License

MIT
