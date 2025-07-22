import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import {
  OutgoingHttpHeaders,
  IncomingMessage,
  IncomingHttpHeaders,
} from "node:http";
import https from "node:https";
import { URLSearchParams } from "node:url";
import querystring from "node:querystring";
import type { ClientRequest, ClientResponse, RequestOptions } from "node:https";
import { CookieJar } from "./helpers";
import type { Cookie } from "./helpers";
import { extractCSRFTokenHelper } from "./helpers";
import {
  requestAsync,
  requestAsyncHandleRedirects,
  parseFormFromHtml,
  TOTPGenerator,
  sleep,
} from "./helpers";
import type { FormData, FormField, InputField } from "./helpers";
import { deepDiff, deepEqual, DiffResult, DiffEntry } from "./helpers/diff";
import { generatePKCEPair } from "./helpers";
import type { PKCE_PAIR } from "./helpers";
import { addJourneyLogEntry, getJourneyLogEntries } from "./helpers";
import dotenv from "dotenv";
// Systems Manager Client
import { SSMClient, GetParametersCommand } from "@aws-sdk/client-ssm";
// Secrets Manager Client
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

dotenv.config();

type METHOD_TYPE = "GET" | "POST";
type HTTP_RESPONSE = Partial<IncomingMessage> & {
  headers: IncomingHttpHeaders;
  body: string;
};

/**
 * Parameterisation
 */
const region = process.env["REGION"] ?? "eu-west-2";

const PROXY_DOMAIN = "m0q9zbtrs2.execute-api.eu-west-2.amazonaws.com"
const ONELOGIN_OIDC_STAGING_DOMAIN = "oidc.staging.account.gov.uk";
const ONELOGIN_STAGING_DOMAIN = "staging.account.gov.uk";
const COGNITO_DOMAIN = "govukapp-staging.auth.eu-west-2.amazoncognito.com";
const COGNITO_APP_CLIENT_ID = "7qal023jms3dumkqd6173etleh";
const COGNITO_APP_CLIENT_REDIRECT_URL = "govuk://govuk/login-auth-callback"; 
const USER_AGENT_IPHONE_16E = `Mozilla/5.0 (iPhone17,5; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FireKeepers/1.7.0`;

const pkcePair: PKCE_PAIR = generatePKCEPair();
const { code_verifier, code_challenge } = pkcePair;
const originalRequest = https.request; //Sneaky selective mocking
const journey = [
  {
    hostName: COGNITO_DOMAIN,
    path: `/oauth2/authorize?response_type=code&client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`,
    method: "GET",
    describeAs: "Begin auth flow",
  },
  {
    hostName: ONELOGIN_STAGING_DOMAIN,
    path: "/sign-in-or-create?",
    method: "POST",
    describeAs: "Click Sign In",
  },
  {
    hostName: "",
    path: "",
    method: "",
    describeAs: "Enter Email Address",
  },
  {
    hostName: "",
    path: "",
    method: "",
    describeAs: "Enter password",
  },
  {
    hostName: "",
    path: "",
    method: "",
    describeAs: "Enter MFA",
  },
  {
    hostName: PROXY_DOMAIN,
    path: "/staging/oauth2/token",
    method: "POST",
    describeAs: "Token exchange",
  },
];

function createHttpClientOptions(
  journeyStep: number,
  cookieJar: CookieJar,
  contentType: string = "application/x-www-form-urlencoded",
  referrer: string = "https://signin.staging.account.gov.uk/sign-in-or-create",
): RequestOptions {
  const { hostName, path, method } = journey[journeyStep];
  return {
    hostname: hostName,
    path: path,
    port: 443,
    method: method,
    headers: {
      "Content-Type": contentType,
      Cookie: cookieJar
        .getCookiesForUrl(`https://${hostName}${path}`)
        .map((c) => c.toClientString())
        .join(" "),
      Accept: "text/html,application/xhtml+xml,application/xml;",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
      "User-Agent": USER_AGENT_IPHONE_16E,
      Origin: `https://${hostName}`,
      Referrer: referrer,
    },
  } as RequestOptions;
}

describe("auth sign in journey", () => {
  let path: string = "";

  beforeEach(() => {
    path = `/oauth2/authorize?response_type=code&client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`;
    path = path.replace(/[\r\n]+/gm, "");
    vi.spyOn(https, "request").mockImplementation((options, callback) => {
      const url =
        typeof options === "string"
          ? options
          : `${options.protocol || "https:"}//${options.hostname || options.host}${options.path || ""}`;

      if (url.startsWith(COGNITO_APP_CLIENT_REDIRECT_URL)) {
        // Create a mock response

        const mockResponse = {
          complete: true,
          statusCode: 200,
          headers: { "content-type": "application/json" },
          on: vi.fn((event, handler) => {
            if (event === "data") {
              handler(Buffer.from(JSON.stringify({ success: true })));
            } else if (event === "end") {
              handler();
            }
          }),
          setEncoding: vi.fn(),
        };

        // Create a mock request object
        const mockRequest = {
          on: vi.fn(),
          write: vi.fn(),
          end: vi.fn(() => {
            if (callback) callback(mockResponse);
          }),
          abort: vi.fn(),
        };
        return mockRequest;
      }

      // Use original request for all other URLs
      return originalRequest.call(https, options, callback);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const cookieJar = new CookieJar();

  it(
    "should sign the app into cognito using one login as the idp",
    // { retry: 3, timeout: 10_000 },
    async () => {
      try {
        const options: RequestOptions = createHttpClientOptions(0, cookieJar);

        const redirect = await requestAsyncHandleRedirects(
          options,
          cookieJar,
          null,
        );

        const { response, request } = redirect;

        expect(response.statusCode).toEqual(200);
        // expect(request.hostname).toEqual(ONELOGIN_STAGING_DOMAIN);
        expect(request.path).toEqual("/sign-in-or-create?");

        //Sign in or create page
        const signinOrCreateUrl = `https://${request.hostname}${request.path}`;

        // Cache the cookies
        await cookieJar.addCookie(
          signinOrCreateUrl,
          response.headers["set-cookie"],
        );

        // The redirect to /sign-in-or-create
        addJourneyLogEntry(request, response);

        let csrf = extractCSRFTokenHelper(response.body);

        // Click the sign in button
        const clickOptions: RequestOptions = createHttpClientOptions(
          1,
          cookieJar,
        );

        let formData = new URLSearchParams({
          _csrf: csrf,
          supportInternationalNumbers: "",
        });

        const signInResponse = await requestAsyncHandleRedirects(
          clickOptions,
          cookieJar,
          formData.toString(),
        );

        addJourneyLogEntry(signInResponse.request, signInResponse.response);

        const emailForm: FormData = parseFormFromHtml(
          signInResponse.response.body,
        );

        expect(emailForm.action).toEqual("/enter-email");
        expect(emailForm.method).toEqual("post");
        expect(emailForm.inputs[1].name).toEqual("email");

        formData = new URLSearchParams({
          _csrf: emailForm.csrf,
          email: emailAddress,
        });

        const enterEmailUrl = `https://${clickOptions.hostname}${emailForm.action}`;

        // Very hacky but more readable than what we had.
        journey[2].hostName = journey[1].hostName;
        journey[2].path = emailForm.action;
        journey[2].method = "POST";

        // Submit the email address
        const emailOptions: RequestOptions = createHttpClientOptions(
          2,
          cookieJar,
        );

        const emailResponse = await requestAsyncHandleRedirects(
          emailOptions,
          cookieJar,
          formData.toString(),
        );

        addJourneyLogEntry(emailResponse.request, emailResponse.response);

        let passwordForm: FormData;
        try {
          passwordForm = parseFormFromHtml(emailResponse.response.body);
        } catch (e) {
          console.log(emailResponse.response.body);
          throw new Error(e);
        }

        // Very hacky but more readable than what we had.
        journey[3].hostName = journey[1].hostName;
        journey[3].path = passwordForm.action;
        journey[3].method = passwordForm.method;

        // Submit the password
        // Submit the email address
        const passwordOptions: RequestOptions = createHttpClientOptions(
          3,
          cookieJar,
        );

        formData = new URLSearchParams({
          _csrf: passwordForm.csrf,
          isReauthJourney: false,
          password: password,
        });

        const enterPasswordUrl = `https://${clickOptions.hostname}${passwordForm.action}`;

        const passwordResponse = await requestAsyncHandleRedirects(
          passwordOptions,
          cookieJar,
          formData.toString(),
        );

        addJourneyLogEntry(passwordResponse.request, passwordResponse.response);

        const totpForm: FormData = parseFormFromHtml(
          passwordResponse.response.body,
        );

        // Submit the MFA
        // Very hacky but more readable than what we had.
        journey[4].hostName = journey[1].hostName;
        journey[4].path = totpForm.action;
        journey[4].method = totpForm.method;

        // Submit the password
        // Submit the email address
        const mfaOptions: RequestOptions = createHttpClientOptions(
          4,
          cookieJar,
        );

        const generator = new TOTPGenerator(secret);
        const currentTime = Math.floor(Date.now() / 1000);
        const currentCode = generator.generate();
        const previousCode = generator.generate(currentTime - 30);
        const nextCode = generator.generate(currentTime + 30);

        console.log(`Current code ${currentCode}`);
        console.log(`Previous code ${previousCode}`);
        console.log(`Next code ${nextCode}`);

        console.log(generator.getTimeWindow());

        formData = new URLSearchParams({
          _csrf: totpForm.csrf,
          code: currentCode,
        });

        const totpResponse = await requestAsyncHandleRedirects(
          mfaOptions,
          cookieJar,
          formData.toString(),
        );

        addJourneyLogEntry(totpResponse.request, totpResponse.response);

        const codeURL = new URL(
          `https://${totpResponse.request.hostname}${totpResponse.request.path}`,
        );

        const code = codeURL.searchParams.get("code");

        const tokenExchangeOptions: RequestOptions = createHttpClientOptions(
          5,
          cookieJar,
        );

        tokenExchangeOptions.headers["Content-Type"] =
          "application/x-www-form-urlencoded";
        tokenExchangeOptions.headers["Accept"] = "*/*";
        tokenExchangeOptions.headers["x-attestation-token"] = "";
        delete tokenExchangeOptions.headers["Cookie"];
        delete tokenExchangeOptions.headers["Referrer"];

        const tokenFormData = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: COGNITO_APP_CLIENT_ID,
          redirect_uri: REDIRECT_URI,
          code: code,
          code_verifier: code_verifier,
          scope: SCOPE,
        });

        const tokenExchangeResponse = await requestAsync(
          tokenExchangeOptions,
          tokenFormData.toString(),
        );
        const tokens = JSON.parse(tokenExchangeResponse.body);

        expect(tokens["id_token"]).toBeTruthy();
        expect(tokens["access_token"]).toBeTruthy();
        expect(tokens["refresh_token"]).toBeTruthy();
        expect(tokens["expires_in"]).toEqual(300);
        expect(tokens["token_type"]).toEqual("Bearer");

        tokens["id_token"] =
          tokens["id_token"].substring(0, 100) + "*******redacted*******";
        tokens["access_token"] =
          tokens["access_token"].substring(0, 100) + "*******redacted*******";
        tokens["refresh_token"] =
          tokens["refresh_token"].substring(0, 100) + "*******redacted*******";

        console.log(tokens);
      } catch (e) {
        console.log("Failed");
        console.log(e);
      } finally {
        console.log("**********************************************");
        console.log("* Journey Log");
        console.log("**********************************************");
        console.log(getJourneyLogEntries());
        console.log("**********************************************");
      }
    },
  );
});
