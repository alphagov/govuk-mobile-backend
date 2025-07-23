// cognitoClient.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@aws-sdk/client-cognito-identity-provider", () => {
  return {
    CognitoIdentityProviderClient: vi.fn().mockImplementation((config) => ({
      config,
      __mock: true,
    })),
  };
});

describe("cognitoClient", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  it("throws an error if REGION is not set", async () => {
    delete process.env.REGION;

    // Because the module throws at import time, we test via dynamic import
    await expect(import("../../../cognito/client")).rejects.toThrow(
      "REGION environment variable is not set"
    );
  });

  it("initializes CognitoIdentityProviderClient with correct region", async () => {
    process.env.REGION = "eu-west-2";

    const module = await import("../../../cognito/client");
    const client = module.cognitoClient;

    expect(client).toMatchObject({
      config: { region: "eu-west-2" },
      __mock: true,
    });
  });
});
