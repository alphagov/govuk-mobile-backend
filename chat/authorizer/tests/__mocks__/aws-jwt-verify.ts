import { CognitoAccessTokenPayload } from "aws-jwt-verify/jwt-model";
import { vi } from "vitest";

export const mockPayload: CognitoAccessTokenPayload = {
  sub: "user-123",
  scope: "openid",
  auth_time: 1234567890,
  iss: "issuer",
  exp: 1234567899,
  iat: 1234567890,
  jti: "jwt-id",
  origin_jti: "origin-jwt-id",
  username: "testuser",
  event_id: "event-id",
  token_use: "access",
  client_id: "test-client-id",
  version: 2,
};

export const CognitoJwtVerifier = {
  create: vi.fn(() => ({
    verify: vi.fn(async (token: string) => {
      if (token === "valid-token") {
        return mockPayload;
      } else {
        throw new Error("Invalid token");
      }
    }),
  })),
};
