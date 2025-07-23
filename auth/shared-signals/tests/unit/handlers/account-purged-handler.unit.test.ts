import { describe, it, expect, vi, beforeAll, Mock, afterAll } from "vitest";

import {
  AccountPurgedRequest,
  handleAccountPurgedRequest,
} from "../../../handlers/account-purged-handler";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

vi.mock("../../../cognito/delete-user", () => ({
  adminDeleteUser: vi.fn(),
}));

vi.mock("../../../cognito/sign-out-user", () => ({
  adminGlobalSignOut: vi.fn(),
}));

import { adminDeleteUser } from "../../../cognito/delete-user";
import { adminGlobalSignOut } from "../../../cognito/sign-out-user";

describe("handleAccountPurgedRequest", () => {
  const region = "eu-west-2";

  const consoleMock = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  beforeAll(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: "123",
      REGION: region,
    };
    vi.clearAllMocks();
    consoleMock.mockReset();
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it("returns ACCEPTED for account purged events", async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
    (adminDeleteUser as Mock).mockResolvedValue(true);

    const input = {
      aud: "example-audience",
      iat: 1718000000,
      iss: "https://issuer.example.com",
      jti: "unique-jti-12345",
      events: {
        "https://schemas.openid.net/secevent/risc/event-type/account-purged": {
          subject: {
            format: "urn:example:format",
            uri: "urn:example:uri:12345",
          },
        },
      },
    } as AccountPurgedRequest;

    const response = await handleAccountPurgedRequest(input);
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.ACCEPTED,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: StatusCodes.ACCEPTED,
    });
  });
});
