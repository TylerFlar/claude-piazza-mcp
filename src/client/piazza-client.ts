import {
  PiazzaAuthError,
  PiazzaApiError,
  PiazzaNetworkError,
  type PiazzaApiResponse,
  type ClassInfo,
  type NetworkInfo,
  type Post,
  type FeedItem,
  type UserInfo,
  type UserStatus,
  type CreatePostOptions,
  type FilterOptions,
} from "./types.js";

const BASE_URL = "https://piazza.com";
const API_URL = `${BASE_URL}/logic/api`;
const CSRF_URL = `${BASE_URL}/main/csrf_token`;
const LOGIN_URL = `${BASE_URL}/class`;

const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 500;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Log to stderr so it doesn't interfere with MCP stdio */
function log(msg: string): void {
  process.stderr.write(`[piazza-mcp] ${msg}\n`);
}

function generateNonce(): string {
  const time = Date.now().toString(36);
  const rand = Math.round(Math.random() * 1679616).toString(36);
  return time + rand;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PiazzaClient {
  private cookies: Map<string, string> = new Map();
  private email: string;
  private password: string;
  private authenticated = false;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  /** Merge Set-Cookie headers from a response into our cookie jar */
  private mergeCookies(response: Response): void {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      const nameValue = cookie.split(";")[0];
      const eqIdx = nameValue.indexOf("=");
      if (eqIdx > 0) {
        const name = nameValue.substring(0, eqIdx).trim();
        const value = nameValue.substring(eqIdx + 1).trim();
        this.cookies.set(name, value);
      }
    }
    // Fallback if getSetCookie not available
    if (setCookies.length === 0) {
      const raw = response.headers.get("set-cookie");
      if (raw) {
        const nameValue = raw.split(";")[0];
        const eqIdx = nameValue.indexOf("=");
        if (eqIdx > 0) {
          const name = nameValue.substring(0, eqIdx).trim();
          const value = nameValue.substring(eqIdx + 1).trim();
          this.cookies.set(name, value);
        }
      }
    }
  }

  /** Get the full Cookie header string from our jar */
  private getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  /** Get the session_id value (used as CSRF token for API calls) */
  private getSessionId(): string | null {
    return this.cookies.get("session_id") ?? null;
  }

  /** Authenticate with Piazza using CSRF token + form-based login */
  async login(): Promise<void> {
    try {
      // Step 1: Get CSRF token
      log("Fetching CSRF token...");
      const csrfResponse = await fetch(CSRF_URL, {
        method: "GET",
        headers: { "User-Agent": USER_AGENT },
        redirect: "manual",
      });
      const csrfRaw = await csrfResponse.text();
      log(`CSRF response (${csrfResponse.status}): ${csrfRaw.substring(0, 200)}`);

      // Response looks like: "token=ABCDEF1234;" — extract the token value
      const csrfToken = csrfRaw
        .replace(/"/g, "")
        .replace(/;/g, "")
        .split("=")[1]
        ?.trim();

      if (!csrfToken) {
        throw new PiazzaAuthError(
          `Failed to extract CSRF token from response: ${csrfRaw}`
        );
      }

      // Collect all cookies from the CSRF response (AWSALB, session_id, etc.)
      this.mergeCookies(csrfResponse);
      log(`Cookies after CSRF: ${this.getCookieHeader().substring(0, 100)}...`);

      // Step 2: POST login with form data
      log("Posting login form...");
      const formBody = new URLSearchParams({
        from: "/signup",
        email: this.email,
        password: this.password,
        remember: "on",
        csrf_token: csrfToken,
      });

      const loginResponse = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          Cookie: this.getCookieHeader(),
        },
        body: formBody.toString(),
        redirect: "manual",
      });

      log(`Login response status: ${loginResponse.status}`);

      // Merge cookies from login response (updates session_id, AWSALB, etc.)
      this.mergeCookies(loginResponse);

      let sessionId = this.getSessionId();
      log(`Session from form login: ${sessionId ? "found" : "not found"}`);

      // If no session cookie yet, try the JSON API as fallback
      if (!sessionId) {
        log("Trying JSON API login fallback...");
        const nonce = generateNonce();
        const jsonResponse = await fetch(
          `${API_URL}?method=user.login&aid=${nonce}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": USER_AGENT,
              Cookie: this.getCookieHeader(),
            },
            body: JSON.stringify({
              method: "user.login",
              params: { email: this.email, pass: this.password },
            }),
            redirect: "manual",
          }
        );

        log(`JSON login response status: ${jsonResponse.status}`);
        this.mergeCookies(jsonResponse);
        sessionId = this.getSessionId();

        const responseText = await jsonResponse.text();
        log(`JSON login response body: ${responseText.substring(0, 300)}`);

        try {
          const body = JSON.parse(responseText) as PiazzaApiResponse;
          if (body.error) {
            throw new PiazzaAuthError(`Login failed: ${body.error}`);
          }
        } catch (parseError) {
          if (parseError instanceof PiazzaAuthError) throw parseError;
          log(`JSON parse failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          throw new PiazzaAuthError(
            `Piazza returned non-JSON response (HTTP ${jsonResponse.status}): ${responseText.substring(0, 200)}`
          );
        }
      }

      if (!sessionId) {
        throw new PiazzaAuthError(
          "Login completed but no session cookie received. Check your credentials."
        );
      }

      log("Authentication successful.");
      this.authenticated = true;
    } catch (error) {
      if (error instanceof PiazzaAuthError) throw error;
      throw new PiazzaNetworkError(
        `Failed to connect to Piazza: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /** Ensure we have an active session, logging in if needed */
  async ensureAuthenticated(): Promise<void> {
    if (!this.authenticated || !this.getSessionId()) {
      await this.login();
    }
  }

  /** Make an API request to Piazza with retry and re-auth logic */
  async request<T = unknown>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    await this.ensureAuthenticated();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const nonce = generateNonce();
        const url = `${API_URL}?method=${encodeURIComponent(method)}&aid=${nonce}`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
            Cookie: this.getCookieHeader(),
            "CSRF-Token": this.getSessionId() ?? "",
          },
          body: JSON.stringify({
            method,
            params,
          }),
        });

        if (response.status === 401 || response.status === 403) {
          // Session expired — re-authenticate and retry once
          this.authenticated = false;
          await this.login();
          continue;
        }

        if (!response.ok) {
          throw new PiazzaNetworkError(
            `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const body = (await response.json()) as PiazzaApiResponse<T>;

        if (body.error) {
          // Check if it's an auth error
          const errLower = body.error.toLowerCase();
          if (
            errLower.includes("not authenticated") ||
            errLower.includes("session") ||
            errLower.includes("login") ||
            errLower.includes("unauthorized")
          ) {
            this.authenticated = false;
            if (attempt < MAX_RETRIES - 1) {
              await this.login();
              continue;
            }
            throw new PiazzaAuthError(body.error);
          }
          throw new PiazzaApiError(body.error);
        }

        return body.result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (error instanceof PiazzaAuthError || error instanceof PiazzaApiError) {
          throw error;
        }

        // Network error — retry with backoff
        if (attempt < MAX_RETRIES - 1) {
          await sleep(BACKOFF_BASE_MS * Math.pow(2, attempt));
          continue;
        }
      }
    }

    throw lastError ?? new PiazzaNetworkError("Request failed after retries");
  }

  // ─── User Methods ──────────────────────────────────────────────

  async getUserStatus(): Promise<UserStatus> {
    return this.request<UserStatus>("user.status");
  }

  async getUserClasses(): Promise<ClassInfo[]> {
    const status = await this.getUserStatus();
    const classes: ClassInfo[] = [];

    // networks can be an array or object depending on the API response
    const networks = status.networks;
    const items: Array<Record<string, unknown>> = Array.isArray(networks)
      ? networks
      : Object.values(networks ?? {});

    for (const info of items) {
      classes.push({
        nid: String(info.id ?? info.nid ?? ""),
        name: String(info.name ?? info.my_name ?? "Unnamed"),
        term: String(info.term ?? ""),
        num: String(info.course_number ?? ""),
        is_ta: info.is_ta === true,
        status: String(info.status ?? "active"),
      });
    }

    return classes.filter((c) => c.status === "active" && c.nid);
  }

  // ─── Network/Course Methods ────────────────────────────────────

  async getNetworkInfo(nid: string): Promise<NetworkInfo> {
    return this.request<NetworkInfo>("network.get", { nid });
  }

  async getStats(nid: string): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("network.get_stats", { nid });
  }

  // ─── Post/Content Methods ─────────────────────────────────────

  async getPost(nid: string, cid: string): Promise<Post> {
    return this.request<Post>("content.get", { nid, cid });
  }

  async getFeed(
    nid: string,
    limit = 20,
    offset = 0
  ): Promise<FeedItem[]> {
    const result = await this.request<{ feed: FeedItem[] }>("network.get_my_feed", {
      nid,
      limit,
      offset,
      sort: "updated",
    });
    return result.feed ?? [];
  }

  async search(nid: string, query: string): Promise<FeedItem[]> {
    const result = await this.request<FeedItem[]>("network.search", {
      nid,
      query,
    });
    return Array.isArray(result) ? result : [];
  }

  async filterFeed(nid: string, opts: FilterOptions): Promise<FeedItem[]> {
    const params: Record<string, unknown> = { nid };
    if (opts.folder) params.folder = opts.folder;
    if (opts.following) params.following = true;
    if (opts.unread) params.unread = true;
    if (opts.updated) params.updated = true;

    const result = await this.request<{ feed: FeedItem[] }>(
      "network.filter_feed",
      params
    );
    return result.feed ?? [];
  }

  // ─── Create Methods ───────────────────────────────────────────

  async createPost(nid: string, opts: CreatePostOptions): Promise<Post> {
    return this.request<Post>("content.create", {
      nid,
      type: opts.type,
      subject: opts.title,
      content: opts.content,
      folders: opts.folders ?? [],
      anonymous: opts.anonymous ? "yes" : "no",
      config: {},
    });
  }

  async createFollowup(
    nid: string,
    cid: string,
    content: string,
    anonymous = false
  ): Promise<unknown> {
    return this.request("content.create", {
      nid,
      cid,
      type: "followup",
      content,
      anonymous: anonymous ? "yes" : "no",
    });
  }

  async createReply(
    nid: string,
    cid: string,
    followupId: string,
    content: string,
    anonymous = false
  ): Promise<unknown> {
    return this.request("content.create", {
      nid,
      cid,
      parent_cid: followupId,
      type: "feedback",
      content,
      anonymous: anonymous ? "yes" : "no",
    });
  }

  // ─── Answer Methods ───────────────────────────────────────────

  async postStudentAnswer(
    nid: string,
    cid: string,
    content: string,
    revision: number,
    anonymous = false
  ): Promise<unknown> {
    return this.request("content.answer", {
      nid,
      cid,
      content,
      revision,
      type: "s_answer",
      anonymous: anonymous ? "yes" : "no",
    });
  }

  async postInstructorAnswer(
    nid: string,
    cid: string,
    content: string,
    revision: number,
    anonymous = false
  ): Promise<unknown> {
    return this.request("content.answer", {
      nid,
      cid,
      content,
      revision,
      type: "i_answer",
      anonymous: anonymous ? "yes" : "no",
    });
  }

  async markGoodAnswer(
    nid: string,
    cid: string,
    type: string
  ): Promise<unknown> {
    return this.request("content.mark_good", {
      nid,
      cid,
      type,
    });
  }

  async removeGoodAnswer(
    nid: string,
    cid: string,
    type: string
  ): Promise<unknown> {
    return this.request("content.unmark_good", {
      nid,
      cid,
      type,
    });
  }

  // ─── Management Methods ───────────────────────────────────────

  async updatePost(
    nid: string,
    cid: string,
    subject?: string,
    content?: string
  ): Promise<unknown> {
    const params: Record<string, unknown> = { nid, cid };
    if (subject !== undefined) params.subject = subject;
    if (content !== undefined) params.content = content;
    return this.request("content.update", params);
  }

  async deletePost(nid: string, cid: string): Promise<unknown> {
    return this.request("content.delete", { nid, cid });
  }

  async pinPost(nid: string, cid: string, pin: boolean): Promise<unknown> {
    return this.request(pin ? "content.pin" : "content.unpin", { nid, cid });
  }

  async markDuplicate(
    nid: string,
    cidDupe: string,
    cidTo: string,
    message?: string
  ): Promise<unknown> {
    const params: Record<string, unknown> = {
      nid,
      cid: cidDupe,
      duplicateof: cidTo,
    };
    if (message) params.msg = message;
    return this.request("content.mark_duplicate", params);
  }

  async markResolved(
    nid: string,
    cid: string,
    resolved: boolean
  ): Promise<unknown> {
    return this.request("content.mark_resolved", {
      nid,
      cid,
      resolved: resolved ? "1" : "0",
    });
  }

  async markRead(nid: string, cid: string): Promise<unknown> {
    return this.request("content.mark_read", { nid, cid });
  }

  // ─── User Methods (Network) ───────────────────────────────────

  async getAllUsers(nid: string): Promise<UserInfo[]> {
    const result = await this.request<UserInfo[]>("network.get_all_users", {
      nid,
    });
    return Array.isArray(result) ? result : [];
  }

  async getUsers(nid: string, userIds: string[]): Promise<UserInfo[]> {
    const result = await this.request<UserInfo[]>("network.get_users", {
      nid,
      ids: userIds,
    });
    return Array.isArray(result) ? result : [];
  }
}
