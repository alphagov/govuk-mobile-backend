import { describe, it, expect, vi, beforeAll, Mock, afterAll } from "vitest";

import {
  CredentialChangeRequest,
  handleCredentialChangeRequest,
} from "../../../handlers/credential-change-handler";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

// Mock adminGlobalSignOut
vi.mock("../../../cognito/client", () => ({
  adminGlobalSignOut: vi.fn(),
}));

import { adminGlobalSignOut } from "../../../cognito/client";

describe("handleCredentialChangeRequest", () => {
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

  it("returns ACCEPTED for password change events", async () => {
    (adminGlobalSignOut as Mock).mockResolvedValue(true);
    const input = {
      iss: "https://identity.example.com",
      jti: "123e4567-e89b-12d3-a456-426614174000",
      iat: 1721126400,
      aud: "https://service.example.gov.uk",
      events: {
        "https://schemas.openid.net/secevent/caep/event-type/credential-change":
          {
            change_type: "update",
            credential_type: "password",
            subject: {
              uri: "urn:example:account:1234567890",
              format: "urn:example:format:account-id",
            },
          },
        "https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation":
          {
            email: "user@example.com",
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);
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

  it("returns NOT_IMPLEMENTED for non-password credential changes", async () => {
    const input = {
      iss: "https://identity.example.com",
      jti: "123e4567-e89b-12d3-a456-426614174000",
      iat: 1721126400,
      aud: "https://service.example.gov.uk",
      events: {
        "https://schemas.openid.net/secevent/caep/event-type/credential-change":
          {
            change_type: "update",
            credential_type: "email",
            subject: {
              uri: "urn:example:account:1234567890",
              format: "urn:example:format:account-id",
            },
          },
        "https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation":
          {
            email: "user@example.com",
          },
      },
    } as CredentialChangeRequest;

    const response = await handleCredentialChangeRequest(input);
    expect(response).toEqual({
      body: JSON.stringify({
        message: ReasonPhrases.NOT_IMPLEMENTED,
      }),
      headers: {
        "Content-Type": "application/json",
      },
      statusCode: StatusCodes.NOT_IMPLEMENTED,
    });
  });
});
