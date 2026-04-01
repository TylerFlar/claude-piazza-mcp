/** Raw API response wrapper */
export interface PiazzaApiResponse<T = unknown> {
  result: T;
  error: string | null;
  aid: string;
}

/** User's class/network listing */
export interface ClassInfo {
  nid: string;
  name: string;
  term: string;
  num: string;
  is_ta: boolean;
  status: string;
  course_number?: string;
}

/** Detailed network/course info */
export interface NetworkInfo {
  id: string;
  name: string;
  description: string;
  term: string;
  course_number: string;
  folders: string[];
  created: string;
  prof_hash: Record<string, string>;
  status: string;
  is_active: boolean;
}

/** Post revision history entry */
export interface PostRevision {
  subject: string;
  content: string;
  created: string;
  uid: string;
  anon: string;
}

/** Change log entry */
export interface ChangeLogEntry {
  type: string;
  when: string;
  uid: string;
  name?: string;
  anon?: string;
  data?: string;
}

/** Tag good entry (endorsement) */
export interface TagGood {
  type: string;  // "i_answer", "s_answer", "followup"
  id?: string;
  role?: string;
}

/** Child content (answer, followup, reply) */
export interface ChildContent {
  id: string;
  type: string;  // "i_answer", "s_answer", "followup", "feedback"
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

/** Full post object */
export interface Post {
  id: string;
  nr: number;
  type: string;  // "question", "note", "poll"
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
  bucket_name?: string;
  bucket_order?: number;
  config?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

/** Feed item (lightweight post summary) */
export interface FeedItem {
  nr: number;
  id: string;
  subject?: string;
  type?: string;
  created?: string;
  modified?: string;
  content_snipet?: string;
  no_answer: number;
  is_new?: boolean;
  folders?: string[];
  tags?: string[];
  num_favorites?: number;
  log?: ChangeLogEntry[];
}

/** User info from network */
export interface UserInfo {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  role?: string;
  photo?: string;
  days?: number;
  admin?: boolean;
  us?: boolean;
  answered?: number;
  asks?: number;
  views?: number;
}

/** Network statistics */
export interface NetworkStats {
  total_posts: number;
  total_questions: number;
  total_notes: number;
  total_users: number;
  average_response_time?: number;
  posts_by_day?: Record<string, number>;
  top_users?: Array<{ uid: string; name: string; contributions: number }>;
}

/** User status / profile */
export interface UserStatus {
  uid: string;
  email: string;
  name: string;
  networks: Array<Record<string, unknown>> | Record<string, Record<string, unknown>>;
  config?: Record<string, unknown>;
}

/** Options for creating a post */
export interface CreatePostOptions {
  type: "question" | "note" | "poll";
  title: string;
  content: string;
  folders?: string[];
  anonymous?: boolean;
}

/** Options for filtering feed */
export interface FilterOptions {
  folder?: string;
  following?: boolean;
  unread?: boolean;
  updated?: boolean;
}

/** Custom error types */
export class PiazzaAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiazzaAuthError";
  }
}

export class PiazzaApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiazzaApiError";
  }
}

export class PiazzaNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PiazzaNetworkError";
  }
}
