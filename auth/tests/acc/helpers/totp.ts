import { createHmac } from "node:crypto";

/**
 * @fileoverview Creation and validation of TOTP
 * @module totp
 * @author Charles Benger-Stevenson <charles.stevenson@GDS13840>
 * @created 2025-07-04
 * @version 1.0.0
 * @since 1.0.0
 * TOTP is essentially "HMAC + Time" + Truncation
 * It creates a code that changes every 30 seconds but can be calculated independently by both the client and server
 * as long as they share a secret and have synronised clocks.
 *
 * Step-by-Step Process
 * 1. Time-Based Counter
 *
 * const time = Math.floor(Date.now() / 1000); // Current Unix timestamp
 * const timeCounter = Math.floor(time / 30); // Divide by 30-second window
 *
 * Both the client and the server calculate the same counter value. It it's 2:30:45 PM you both get the same "time slot" number.
 * This counter changes every 30 seconds, which is why TOTP codes expire
 *
 * 2. Secret Key Processing
 *
 * const secretBuffer = this.base32Decode(this.secret);
 *
 * The server gives you a secret during MFA setup, encoded in base32 (like 'JBSWY3DPEHPK3PXP'). This is normally displayed as a QR Code, but it can
 * be displayed in human readable form.
 *
 * This gets decoded into raw bytes that both sides use for the cryptographic operation.
 *
 * 3. HMAC-SHA1 Generation
 *
 * const counterBuffer = Buffer.alloc(8);
 * counterBuffer.writeBigUInt64BE(BigInt(counter));
 *
 * const hmac = createHmac("sha1", secretBuffer);
 * hmac.update(counterBuffer);
 * const hash = hmac.digest(); // 20-byte SHA1 hash
 *
 * This is the cryptographic heart. HMAC (Hash-based Message Authentication Code) takes your shared secret and the time counter, producting a 20-byte hash.
 * Because both sides use the same secret and counter, they get identical hashes.
 *
 * 4. Dynamic Truncation
 *
 * const offset = hash[hash.length -1] & 0x0f; // Last 4 bits as offset (0-15)
 * const truncatedHash = hash.subarray(offset, offset + 4); // Extract 4 bytes starting from the calculated offset
 *
 * This is the clever bit. Instead of always taking the first 4 bytes of the 20-byte hash, it uses the last 4 bits of the hash itself to determine
 * which 4 bytes to extract. This makes the selection "random" but deterministic.
 *
 * 5. Convert to Human-Readable
 *
 * const code = (truncatedHash.readUInt32BE(0) & 0x7fffffff) % Math.pow(10, 6);
 * return code.toString().padStart(6, "0");
 *
 * Read the 4 bytes as a 32-bit integer
 * Mask off the highest bit to ensure the number is positive
 * Take modulo 1,000,000 to get a 6-digit number
 * Pad with leading zeroes if needed
 */

import { createHmac } from "node:crypto";

/**
 * @fileoverview Creation and validation of TOTP - Improved version
 * @module totp
 * @author Charles Benger-Stevenson <charles.stevenson@GDS13840>
 * @created 2025-07-04
 * @version 1.1.0
 * @since 1.0.0
 */

/**
 * Generates a TOTP (Time-based One-Time Password)
 * Based on RFC 6238 - Compatible with Google Authenticator
 * @class TOTPGenerator
 */
class TOTPGenerator {
  private readonly secret: string;
  private readonly timeStep: number;
  private readonly digits: number;
  private readonly algorithm: string;

  /**
   * Creates an instance of TOTPGenerator
   * @constructor
   * @param {string} secret   - Base32 encrypted secret
   * @param {number} timeStep - Timestep in seconds; default is 30
   * @param {number} digits   - Number of digits in the TOTP; default is 6
   * @param {string} algorithm - Hash algorithm; default is 'sha1'
   */
  constructor(
    secret: string,
    timeStep: number = 30,
    digits: number = 6,
    algorithm: string = "sha1",
  ) {
    this.secret = secret.replace(/\s+/g, "").toUpperCase(); // Clean and normalize
    this.timeStep = timeStep;
    this.digits = digits;
    this.algorithm = algorithm;
  }

  /**
   * Generate TOTP for current time or specified timestamp
   * @method generate
   * @param {number} timestamp - Unix timestamp in seconds (defaults to current time)
   * @returns {string} 6-digit TOTP code
   */
  generate(timestamp?: number): string {
    const time = timestamp || Math.floor(Date.now() / 1000);
    const timerCounter = Math.floor(time / this.timeStep);

    return this.generateTOTP(timerCounter);
  }

  /**
   * Generate TOTP for multiple time windows (useful for debugging)
   * @method generateMultiple
   * @param {number} windowCount - Number of windows to generate (before and after current)
   * @returns {Object} Object with current time and codes for multiple windows
   */
  generateMultiple(windowCount: number = 2): {
    currentTime: number;
    codes: Array<{ window: number; code: string; timestamp: number }>;
  } {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentTime / this.timeStep);
    const codes = [];

    for (let i = -windowCount; i <= windowCount; i++) {
      const counter = currentCounter + i;
      const code = this.generateTOTP(counter);
      const windowTime = counter * this.timeStep;
      codes.push({
        window: i,
        code: code,
        timestamp: windowTime,
      });
    }

    return {
      currentTime,
      codes,
    };
  }

  /**
   * Does the actual TOTP generation
   * @method generateTOTP
   * @param {number} counter - timer rounded to the nearest time step
   * @returns {string} Returns the TOTP
   */
  private generateTOTP(counter: number): string {
    try {
      // Convert secret from base32 to buffer
      const secretBuffer = this.base32Decode(this.secret);

      // Convert counter to 8-byte buffer (big-endian)
      const counterBuffer = Buffer.alloc(8);
      counterBuffer.writeBigUInt64BE(BigInt(counter));

      // Generate HMAC using specified algorithm (default SHA1)
      const hmac = createHmac(this.algorithm, secretBuffer);
      hmac.update(counterBuffer);
      const hash = hmac.digest();

      // Dynamic Truncation (RFC 6238 Section 5.3)
      const offset = hash[hash.length - 1] & 0xf;
      const truncatedHash = hash.subarray(offset, offset + 4);

      // Convert to integer and apply modulo
      const code =
        (truncatedHash.readUInt32BE(0) & 0x7fffffff) %
        Math.pow(10, this.digits);

      // Pad with leading zeroes
      return code.toString().padStart(this.digits, "0");
    } catch (error) {
      throw new Error(`TOTP generation failed: ${error.message}`);
    }
  }

  /**
   * Verify a TOTP code against current time with tolerance
   * @method verify
   * @param {string} code - The TOTP to be verified
   * @param {number} tolerance - Number of time steps to check before/after current time
   * @returns {boolean} Returns true if the supplied code is valid
   */
  verify(code: string, tolerance: number = 1): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentTime / this.timeStep);

    // Check current window and adjacent windows
    for (let i = -tolerance; i <= tolerance; i++) {
      const testCode = this.generateTOTP(currentCounter + i);
      if (testCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get detailed verification info (useful for debugging)
   * @method verifyDetailed
   * @param {string} code - The TOTP to be verified
   * @param {number} tolerance - Number of time steps to check before/after current time
   * @returns {Object} Detailed verification result
   */
  verifyDetailed(
    code: string,
    tolerance: number = 1,
  ): {
    isValid: boolean;
    matchedWindow?: number;
    currentTime: number;
    testedCodes: Array<{ window: number; code: string; timestamp: number }>;
  } {
    const currentTime = Math.floor(Date.now() / 1000);
    const currentCounter = Math.floor(currentTime / this.timeStep);
    const testedCodes = [];
    let matchedWindow = undefined;

    for (let i = -tolerance; i <= tolerance; i++) {
      const testCode = this.generateTOTP(currentCounter + i);
      const windowTime = (currentCounter + i) * this.timeStep;

      testedCodes.push({
        window: i,
        code: testCode,
        timestamp: windowTime,
      });

      if (testCode === code && matchedWindow === undefined) {
        matchedWindow = i;
      }
    }

    return {
      isValid: matchedWindow !== undefined,
      matchedWindow,
      currentTime,
      testedCodes,
    };
  }

  /**
   * Decode base32 string to buffer - Enhanced version
   * @method base32Decode
   * @param {string} base32 - Base32 encoded string
   * @returns {Buffer} Returns Buffer containing decoded string
   */
  private base32Decode(base32: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    // Remove whitespace and convert to uppercase
    const cleanInput = base32.replace(/\s+/g, "").toUpperCase();

    // Remove padding characters if present
    const noPadding = cleanInput.replace(/=+$/, "");

    let bits = "";

    for (const char of noPadding) {
      const index = alphabet.indexOf(char);
      if (index === -1) {
        throw new Error(`Invalid base32 character: ${char}`);
      }
      bits += index.toString(2).padStart(5, "0");
    }

    const bytes: number[] = [];
    // Process in 8-bit chunks, but don't include incomplete final chunk
    for (let i = 0; i < bits.length - 4; i += 8) {
      const byte = bits.substring(i, i + 8);
      if (byte.length === 8) {
        bytes.push(parseInt(byte, 2));
      }
    }

    return Buffer.from(bytes);
  }

  /**
   * Get the current time window information
   * @method getTimeWindow
   * @returns {Object} Current time window information
   */
  getTimeWindow(): {
    currentTime: number;
    windowStart: number;
    windowEnd: number;
    secondsRemaining: number;
    counter: number;
  } {
    const currentTime = Math.floor(Date.now() / 1000);
    const counter = Math.floor(currentTime / this.timeStep);
    const windowStart = counter * this.timeStep;
    const windowEnd = windowStart + this.timeStep;
    const secondsRemaining = windowEnd - currentTime;

    return {
      currentTime,
      windowStart,
      windowEnd,
      secondsRemaining,
      counter,
    };
  }
}

export { TOTPGenerator };
