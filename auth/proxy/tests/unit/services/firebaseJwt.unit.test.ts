import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { validateFirebaseJWT } from "../../../services";
import { JsonWebTokenError, decode } from "jsonwebtoken";
import { UnknownAppError } from "../../../services";

vi.mock('jsonwebtoken', async (importOriginal) => {
    const originalModule = await importOriginal<typeof import('jsonwebtoken')>();

    return {
        ...originalModule, // Include all original exports
        verify: vi.fn((token, secretOrPublicKey, options, callback) => {
            if (token === "valid-token") {
                callback(null, { sub: "mocked-app-id", exp: Math.floor(Date.now() / 1000) + 3600 });
            } else if (token === "expired-token") {
                callback(new JsonWebTokenError("Token expired"));
            } else {
                callback(new JsonWebTokenError("Invalid token"));
            }
        }),
        decode: vi.fn().mockReturnValue({
            sub: "mocked-app-id",
            exp: Math.floor(Date.now() / 1000) + 3600,
            header: {
                alg: "RS256",
                kid: "mocked-kid",
            },
        }),
        JsonWebTokenError: class extends Error {
            constructor(message: string) {
                super(message);
                this.name = "JsonWebTokenError";
            }
        }
    };
});

global.fetch = vi.fn(() =>
    Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
            keys: [
                {
                    kty: "RSA",
                    alg: "RS256",
                    use: "sig",
                    kid: "mocked-kid",
                    n: "mocked-n",
                    e: "mocked-e",
                },
            ],
        }),
    }),
);

vi.mock("jwk-to-pem", () => ({
    __esModule: true,
    default: vi.fn(() => "mocked-public-key"),
}));

describe("firebaseJwt", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should return void for a valid token", async () => {
        await expect(validateFirebaseJWT({
            token: "valid-token",
            firebaseAppIds: ["mocked-app-id"],
        })).resolves.toBeUndefined();
    });

    it("should throw an error if kid is not found", async () => {
        (decode as Mock).mockReturnValueOnce({
            sub: "mocked-app-id",
            exp: Math.floor(Date.now() / 1000) + 3600,
            header: {
                alg: "RS256",
            },
        });

        await expect(validateFirebaseJWT({
            token: "valid-token",
            firebaseAppIds: ["mocked-app-id"],
        })).rejects.toThrow(JsonWebTokenError);
    })

    it("should throw an error if the token is invalid", async () => {
        await expect(validateFirebaseJWT({
            token: "invalid-token",
            firebaseAppIds: ["mocked-app-id"],
        })).rejects.toThrow(JsonWebTokenError);
    });

    it("should throw an error if the token is expired", async () => {
        await expect(validateFirebaseJWT({
            token: "expired-token",
            firebaseAppIds: ["mocked-app-id"],
        })).rejects.toThrow(JsonWebTokenError);
    });

    it("should throw an error if the app ID is not known", async () => {
        await expect(validateFirebaseJWT({
            token: "valid-token",
            firebaseAppIds: ["unknown-app-id"],
        })).rejects.toThrow(UnknownAppError);
    });
});
