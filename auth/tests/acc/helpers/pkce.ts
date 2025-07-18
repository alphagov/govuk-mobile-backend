import { createHash } from "node:crypto";

/**
 * PKCE Pair
 * @typedef {PKCE_PAIR} PKCE_PAIR
 */
type PKCE_PAIR = {
  code_verifier: string;
  code_challenge: string;
};

/** @function base64URL
 * Converts a string to a base64 encoded string
 * @param {string} input - The string to be encoded
 * @returns {string} The base64 encoded string
 */
const base64URL = (input: string): string => {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
};

/** @function generateRandomString
 * Generates a random string of specified length from permitted characters for creating a code verifier
 * @param {number} length - The length the called wishes the random string to be
 * @returns {string} The random string
 */
const generateRandomString = (length: number): string => {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

/** @function generatePKCEPair
 * Creates a code verifier and code challenge for an Oauth2 PKCE challenge
 * @returns {PKCE_PAIR} Returns the freshly calculated PKCE Pair
 */
const generatePKCEPair = (): PKCE_PAIR => {
  const code_verifier = generateRandomString(128);
  const code_challenge = base64URL(
    createHash("sha256").update(code_verifier).digest(),
  );
  return {
    code_verifier: code_verifier,
    code_challenge: code_challenge,
  } as PKCE_PAIR;
};

export { generatePKCEPair };

export type { PKCE_PAIR };
