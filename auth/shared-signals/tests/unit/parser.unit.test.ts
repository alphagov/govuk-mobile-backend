import { describe, it, expect } from "vitest";
import { parseRequest } from "../../parser";
import { ZodError } from "zod";

describe("parseRequest", () => {
  it("should parse a valid credentialChangeSchema input", () => {
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
    const result = parseRequest(input);
    expect(result).toEqual(input);
  });

  it("should parse a valid accountPurgedSchema input", () => {
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
    const result = parseRequest(input);
    expect(result).toEqual(input);
  });

  it("should throw ZodError on invalid input (missing fields)", () => {
    const badInputMissingSubject = {
      iss: "https://identity.example.com",
      jti: "123e4567-e89b-12d3-a456-426614174000",
      iat: 1721126400,
      aud: "https://service.example.gov.uk",
      events: {
        "https://schemas.openid.net/secevent/caep/event-type/credential-change":
          {
            change_type: "update",
            credential_type: "password",
          },
        "https://vocab.account.gov.uk/secevent/v1/credentialChange/eventInformation":
          {
            email: "user@example.com",
          },
      },
    };

    expect(() => parseRequest(badInputMissingSubject)).toThrow(ZodError);
  });

  it("should throw ZodError on invalid input (extra fields)", () => {
    const badInputMissingExtraField = {
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
      extraField: 123,
    };
    expect(() => parseRequest(badInputMissingExtraField)).toThrow(ZodError);
  });

  it("should throw ZodError with wrong structure", () => {
    const badInput = {
      foo: "bar",
    };
    expect(() => parseRequest(badInput)).toThrow(ZodError);
  });
});
