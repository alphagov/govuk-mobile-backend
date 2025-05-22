import { Cookie } from "./cookie";
import type { CookieAttributes } from "./cookie";
import { describe, it, expect } from "vitest";

describe("Cookie helper tests", () => {
    it("should parse a cookie", () => {
	const test_cookie = "csrf-state=u0nqoYovBK5OQbNqe9ZSlC3MRVgSKUddzNfgrtlG9wJeZt3lpOuei9KJKGOX8sTH8MUCNNvX308ChZHVJnOiretXVKgWOPD026zA0qdyKASn0Wh58dJjNW0WgPPg3IvA2UuDqLAYIPHTMXSDkeJ423kxDPtyZRvyxqgan9Bhq7Y; Expires=Mon, 19-May-2025 14:02:49 GMT; Path=/; Secure; HttpOnly; SameSite=None";
	let parsed_cookie: Map<string, CookieAttributes> = Cookie.tryParse(test_cookie);
	expect(parsed_cookie.get("csrf-state")).to.equal("u0nqoYovBK5OQbNqe9ZSlC3MRVgSKUddzNfgrtlG9wJeZt3lpOuei9KJKGOX8sTH8MUCNNvX308ChZHVJnOiretXVKgWOPD026zA0qdyKASn0Wh58dJjNW0WgPPg3IvA2UuDqLAYIPHTMXSDkeJ423kxDPtyZRvyxqgan9Bhq7Y"); // pragma: allowlist secret
	expect(parsed_cookie.get("Expires")).to.equal("Mon, 19-May-2025 14:02:49 GMT");
	expect(parsed_cookie.get("Path")).to.equal("/");
	expect(parsed_cookie.get("Secure")).to.equal(true);
	expect(parsed_cookie.get("HttpOnly")).to.equal(true);
	expect(parsed_cookie.get("SameSite")).to.equal("None");
    });
    
});
