import { Cookie } from "./cookie";
import type { CookieAttributes } from "./cookie";
import { describe, it, expect } from "vitest";

describe("Cookie helper tests", () => {
    it("should parse a cookie", () => {
	const test_cookie = "csrf-state=u0nqoYovBK5OQbNqe9ZSlC3MRVgSKUddzNfgrtlG9wJeZt3lpOuei9KJKGOX8sTH8MUCNNvX308ChZHVJnOiretXVKgWOPD026zA0qdyKASn0Wh58dJjNW0WgPPg3IvA2UuDqLAYIPHTMXSDkeJ423kxDPtyZRvyxqgan9Bhq7Y; Expires=Mon, 19-May-2025 14:02:49 GMT; Path=/; Secure; HttpOnly; SameSite=None";
	let parsed_cookie: Map<string, CookieAttributes> = Cookie.tryParse(test_cookie);
	console.log(parsed_cookie);
    });
});
