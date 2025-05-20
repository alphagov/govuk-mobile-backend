import { describe, expect, it } from "vitest";
import { isJwksOrThrow } from "../../../type-guards/jwks";

describe("Jwks type guard", () => {
    it("should return true for a valid JWKS object", () => {
        const validJwks = {
            keys: [
                {
                    kty: "RSA",
                    kid: "1234",
                    use: "sig",
                    n: "someModulus",
                    e: "AQAB"
                }
            ]
        };
        expect(isJwksOrThrow(validJwks)).toBe(true);
    });

    it("should return false if keys property is missing", () => {
        const invalidJwks = {};
        expect(() => isJwksOrThrow(invalidJwks))
            .toThrowError(
                "JWKS does not contain keys"
            )
    });

    it("should return false if keys is not an array", () => {
        const invalidJwks = { keys: "not-an-array" };
        expect(() => isJwksOrThrow(invalidJwks))
            .toThrowError(
                "JWKS does not contain keys"
            )
    });

    it("should return false if keys array contains invalid key objects", () => {
        const invalidJwks = {
            keys: [
                {
                    kty: "RSA"
                    // missing kid, use, n, e
                }
            ]
        };
        expect(() => isJwksOrThrow(invalidJwks))
            .toThrowError(
                "JWKS contains invalid keys"
            )
    });

    it("should return false for null or undefined", () => {
        expect(() => isJwksOrThrow(null))
            .toThrowError(
                "JWKS is not an object"
            )
        expect(() => isJwksOrThrow(undefined))
            .toThrowError(
                "JWKS is not an object"
            )
    });

    it("should return false for non-object types", () => {

        expect(() => isJwksOrThrow(123))
            .toThrowError(
                "JWKS is not an object"
            )
        expect(() => isJwksOrThrow("string"))
            .toThrowError(
                "JWKS is not an object"
            )
        expect(() => isJwksOrThrow([]))
            .toThrowError(
                "JWKS does not contain keys"
            )
    });
});