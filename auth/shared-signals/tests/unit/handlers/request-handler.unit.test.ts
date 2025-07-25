import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestHandler } from "../../../handlers/request-handler";
import { parseRequest } from "../../../parser";
import { handleCredentialChangeRequest } from "../../../handlers/credential-change-handler";
import { handleAccountPurgedRequest } from "../../../handlers/account-purged-handler";
import { ReasonPhrases, StatusCodes } from "http-status-codes";

// Mocks
vi.mock("../../../parser", () => ({
  parseRequest: vi.fn(),
}));
vi.mock("../../../handlers/credential-change-handler", () => ({
  handleCredentialChangeRequest: vi.fn(),
}));
vi.mock("../../../handlers/account-purged-handler", () => ({
  handleAccountPurgedRequest: vi.fn(),
}));

describe("requestHandler", () => {
  const region = "eu-west-2";
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = {
      ...process.env,
      USER_POOL_ID: "123",
      REGION: region,
    };
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });   

  it("dispatches credentialChangeSchema to handleCredentialChangeRequest", async () => {
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
    };
    (parseRequest as any).mockReturnValue(input);
    (handleCredentialChangeRequest as any).mockReturnValue({
      statusCode: StatusCodes.ACCEPTED,
      body: ReasonPhrases.ACCEPTED,
    });
    const result = await requestHandler(JSON.stringify(input));
    expect(handleCredentialChangeRequest).toHaveBeenCalledWith(input);
    expect(result.statusCode).toBe(StatusCodes.ACCEPTED);
    expect(consoleLogSpy).toHaveBeenCalledWith("CorrelationId: ", input.jti);
  });

  it("dispatches accountPurgedSchema to handleAccountPurgedRequest", async () => {
    const input = {
      iss: "https://issuer.example.com",
      jti: "123e4567-e89b-12d3-a456-426614174000",
      iat: 1721120400,
      aud: "https://audience.example.com",
      events: {
        "https://schemas.openid.net/secevent/risc/event-type/account-purged": {
          subject: {
            uri: "acct:someone@example.com",
            format: "acct",
          },
        },
      },
    };
    (parseRequest as any).mockReturnValue(input);
    (handleAccountPurgedRequest as any).mockReturnValue({
      statusCode: StatusCodes.NOT_IMPLEMENTED,
      body: ReasonPhrases.NOT_IMPLEMENTED,
    });
    const result = await requestHandler(JSON.stringify(input));
    expect(handleAccountPurgedRequest).toHaveBeenCalledWith(input);
    expect(consoleLogSpy).toHaveBeenCalledWith("CorrelationId: ", input.jti);
    expect(result.statusCode).toBe(StatusCodes.NOT_IMPLEMENTED);
  });

  it("should throw an error if no handler matches the parsed request", async () => {
    const input = {
      foo: "bar",
    };
    (parseRequest as any).mockReturnValue(input);

    await expect(() => requestHandler(JSON.stringify(input))).rejects.toThrow(
      "No handler found for parsed input"
    );
    expect(consoleLogSpy).toHaveBeenCalledWith("CorrelationId: ", undefined);
  });
});
