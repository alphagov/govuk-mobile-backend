import { describe, it, expect, vi, beforeEach } from "vitest";
import { lambdaHandler } from "../../app";
import { ZodError } from "zod";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import * as handlerModule from "../../handlers/request-handler";
import * as responseModule from "../../response";
import { CognitoError } from "../../errors";
import type { APIGatewayProxyEvent } from "aws-lambda";

// Mock the AWS SDK Client
vi.mock("@aws-sdk/client-cognito-identity-provider", async () => {
  process.env.REGION = "eu-west-2";
  const actual = await vi.importActual<any>(
    "@aws-sdk/client-cognito-identity-provider"
  );
  return {
    ...actual,
    CognitoIdentityProviderClient: vi.fn(),
  };
});

// Create a dummy event
const createEvent = (): APIGatewayProxyEvent =>
  ({
    httpMethod: "post",
    body: {
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
    },
    headers: {},
    isBase64Encoded: false,
    multiValueHeaders: {},
    multiValueQueryStringParameters: {},
    path: "/receiver",
    pathParameters: {},
    queryStringParameters: {},
    requestContext: {
      accountId: "123456789012",
      apiId: "1234",
      authorizer: {},
      httpMethod: "get",
      identity: {
        accessKey: "",
        accountId: "",
        apiKey: "",
        apiKeyId: "",
        caller: "",
        clientCert: {
          clientCertPem: "",
          issuerDN: "",
          serialNumber: "",
          subjectDN: "",
          validity: { notAfter: "", notBefore: "" },
        },
        cognitoAuthenticationProvider: "",
        cognitoAuthenticationType: "",
        cognitoIdentityId: "",
        cognitoIdentityPoolId: "",
        principalOrgId: "",
        sourceIp: "",
        user: "",
        userAgent: "",
        userArn: "",
      },
      path: "/receiver",
      protocol: "HTTP/1.1",
      requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
      requestTimeEpoch: 1428582896000,
      resourceId: "123456",
      resourcePath: "/receiver",
      stage: "dev",
    },
    resource: "",
    stageVariables: {},
  }) as unknown as APIGatewayProxyEvent;

describe("lambdaHandler", () => {
  const mockRequestHandler = vi.spyOn(handlerModule, "requestHandler");
  const mockGenerateResponse = vi.spyOn(responseModule, "generateResponse");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a successful response from requestHandler", async () => {
    const mockResponse = {
      statusCode: 200,
      body: JSON.stringify({ message: "Success" }),
    };

    mockRequestHandler.mockResolvedValue(mockResponse);

    const result = await lambdaHandler(createEvent());

    expect(mockRequestHandler).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  it("should return BAD_REQUEST when ZodError is thrown", async () => {
    const zodError = new ZodError([]);
    mockRequestHandler.mockRejectedValue(zodError);

    mockGenerateResponse.mockReturnValue({
      statusCode: StatusCodes.BAD_REQUEST,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: ReasonPhrases.BAD_REQUEST,
      }),
    });

    const result = await lambdaHandler(createEvent());

    expect(mockGenerateResponse).toHaveBeenCalledWith(
      StatusCodes.BAD_REQUEST,
      ReasonPhrases.BAD_REQUEST
    );
    expect(result.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  it("should return INTERNAL_SERVER_ERROR when CognitoError is thrown", async () => {
    const cognitoError = new CognitoError("Cognito failed");
    mockRequestHandler.mockRejectedValue(cognitoError);

    mockGenerateResponse.mockReturnValue({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      }),
    });

    const result = await lambdaHandler(createEvent());

    expect(mockGenerateResponse).toHaveBeenCalledWith(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR
    );
    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  it("should return INTERNAL_SERVER_ERROR for unknown error", async () => {
    const unknownError = new Error("Something went wrong");
    mockRequestHandler.mockRejectedValue(unknownError);

    mockGenerateResponse.mockReturnValue({
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      }),
    });

    const result = await lambdaHandler(createEvent());

    expect(mockGenerateResponse).toHaveBeenCalledWith(
      StatusCodes.INTERNAL_SERVER_ERROR,
      ReasonPhrases.INTERNAL_SERVER_ERROR
    );
    expect(result.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});
