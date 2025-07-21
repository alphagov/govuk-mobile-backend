/**
 * Cookie
 * @interface ICookie
 * @property {string}  name      - The name of the cookie as supplied in the set-cookie header
 * @property {string}  value     - The value of the cookie as supplied in the set-cookie header
 * @property {string}  domain    - The domain if specified in the set-cookie header
 * @property {string}  path      - The path if specified in the set-cookie header
 * @property {date}    expires   - The expiration time if specified in the set-cookie header
 * @property {number}  maxAge    - The maxium age in milliseconds if specified in the set-cookie header
 * @property {boolean} secure    - The secure flag if specified in the set-cookie header
 * @property {boolean} httpOnly  - The httponly flag if specified in the set-cookie header
 * @property {union}   sameSite  - 'Strict' | 'Lax' | 'None'
 */
interface ICookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

/**
 * A parsed cookie
 * @interface IParsedCookie
 * @extends ICookie
 * @property {date} createdAt - Datetimestamp of when the cookie was parsed
 */
interface IParsedCookie extends ICookie {
  createdAt: Date;
}

export class Cookie implements IParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxage?: number;
  secure?: boolean;
  httponly?: boolean;
  samesite?: "Strict" | "Lax" | "None";
  createdAt: Date;
  toString = (): string => {
    return `${this.name}=${this.value}; ${this.domain ? `Domain=${this.domain}; ` : ""}${this.path ? `Path=${this.path}; ` : ""}${this.expires ? `Expires=${this.expires}; ` : ""}${this.maxage ? `MaxAge=${this.maxage}; ` : ""}${this.secure ? `Secure; ` : ""}${this.httponly ? `HttpOnly; ` : ""}${this.samesite ? `SameSite=${this.samesite};` : ""}`.replace(
      /(?:\r\n|\r|\n)/g,
      "",
    );
  };
  toClientString = (): string => {
    return `${this.name}=${this.value};`;
  };
}

const cookie_attributes = [
  "domain",
  "path",
  "expires",
  "maxage",
  "secure",
  "httponly",
  "samesite",
];

/**
 * Cookie storage and retrieval
 * @class CookieJar
 * @example
 * const parsed_cookie: Cookie = CookieJar.tryParse(cookieHeader);
 */
export class CookieJar {
  private cookies: Map<string, Cookie>;

  constructor(url: string, cookieHeaders: string[] | string) {
    this.cookies = new Map<string, Cookie>();
    if (url && cookieHeaders) {
      this.addCookie(url, cookieHeaders);
    }
  }

  public getCookiesForUrl(url: string) {
    if (!url) return;
    const urlDomain = this.getDomainFromUrl(url);
    const urlPath = this.getPathFromUrl(url);
    const isSecure = this.isSecure(url);

    const matchingCookies: Cookie[] = [];

    for (const [key, cookie] of this.cookies) {
      // Skip expired cookies
      if (this.isExpired(cookie)) {
        this.cookies.delete(key);
        continue;
      }

      // Check for domain match
      if (!this.domainMatches(cookie.domain, urlDomain)) {
        continue;
      }

      // Check for path match
      if (!this.pathMatches(cookie.path, urlPath)) {
        continue;
      }

      // Check secure flag
      if (cookie.secure && !isSecure) {
        continue;
      }

      matchingCookies.push(cookie);
    }

    // Sort by path length (most specific first) and then by creation time
    matchingCookies.sort((a, b) => {
      const pathLenDiff = (b.path?.length || 0) - (a.path?.length || 0);
      if (pathLenDiff !== 0) return pathLenDiff;

      const aCreated = (a as ParsedCookie).createdAt?.getTime() || 0;
      const bCreated = (b as ParsedCookie).createdAt?.getTime() || 0;
      return aCreated - bCreated;
    });

    return matchingCookies;
  }

  /**
   * Return true if the URL is secure
   */
  private isSecure(url: string): boolean {
    if (!url) return;
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === "https:";
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  /**
   * Extract domain from URL
   */
  private getDomainFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Extract path from URL
   */
  private getPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return "/";
    }
  }

  /**
   * Check if a cookie domain matches the current URL domain
   */
  private domainMatches(
    cookieDomain: string | undefined,
    urlDomain: string,
  ): boolean {
    if (!cookieDomain || !urlDomain) return true;

    const cleanCookieDomain = cookieDomain.startsWith(".")
      ? cookieDomain.substring(1)
      : cookieDomain;

    if (cleanCookieDomain === urlDomain) return true;

    if (cookieDomain.startsWith(".")) {
      return (
        urlDomain.endsWith(cleanCookieDomain) && urlDomain !== cleanCookieDomain
      );
    }
    return false;
  }

  /**
   * Check if a cookie path matches the current URL path
   */
  private pathMatches(
    cookiePath: string | undefined,
    urlPath: string,
  ): boolean {
    if (!cookiePath) return true;

    return urlPath.startsWith(cookiePath);
  }

  /**
   * Check if a cookie expired or bust maxAge
   */
  private isExpired(cookie: ParsedCookie): boolean {
    if (cookie.expires && cookie.expires < new Date()) {
      return true;
    }
    if (cookie.maxAge !== undefined) {
      const expiryTime = cookie.createdAt.getTime() + cookie.maxAge * 1000;
      return expiryTime < Date.now();
    }
    return false;
  }

  /**
   * Generate a unique key for storing cookies in the jar
   */
  private generateCookieKey(
    name: string,
    domain: string | undefined,
    path: string | undefined,
  ): string {
    return `${name}|${domain || ""}|${path || "/"}`;
  }

  /**
   * Parse a Set-Cookie header string into a Cookie object
   */
  static tryParse(cookieHeader: string): Cookie | void {
    if (!cookieHeader) return;
    const cookie: Cookie = new Cookie();
    cookie.createdAt = new Date();

    try {
      const pairs = cookieHeader
        .split(/;\s*/)
        .map((part) => part.trim())
        .filter((p) => p);

      for (const pair of pairs) {
        const [key, value] = pair.split("=").map((s) => s.trim());

        switch (key.toLowerCase()) {
          case "domain":
            cookie.domain = value?.startsWith(".") ? value : `.${value}`;
            break;
          case "path":
            cookie.path = value || "/";
            break;
          case "expires":
            cookie.expires = new Date(value);
            break;
          case "max-age":
            cookie.maxAge = parseInt(value, 10);
            break;
          case "secure":
            cookie.secure = true;
            break;
          case "httponly":
            cookie.httpOnly = true;
            break;
          case "samesite":
            cookie.sameSite = value as "Strict" | "Lax" | "None";
            break;
          default:
            cookie.name = key;
            cookie.value = value;
        }
      }

      return cookie;
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Add cookies from Set-Cookie headers for a given URL
   */
  public addCookie(url: string, setCookieHeaders: string[] | string): void {
    if (!url && !setCookieHeaders) return;
    const urlDomain = this.getDomainFromUrl(url);
    if (typeof setCookieHeaders === "string")
      setCookieHeaders = [setCookieHeaders];

    for (const header of setCookieHeaders) {
      const cookie: Cookie = CookieJar.tryParse(header);
      if (!cookie) continue;
      if (!cookie.domain) {
        cookie.domain = urlDomain;
      }
      if (!cookie.path) {
        cookie.path = "/";
      }
      const key = this.generateCookieKey(
        cookie.name,
        cookie.domain,
        cookie.path,
      );
      this.cookies.set(key, cookie);
    }
  }
}
