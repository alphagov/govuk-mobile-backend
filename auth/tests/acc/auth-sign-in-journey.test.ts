import {
  assert,
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  vi,
} from "vitest";
import {
  OutgoingHttpHeaders,
  IncomingMessage,
  IncomingHttpHeaders,
} from "node:http";
import https from "node:https";
import url, { URLSearchParams } from "node:url";
import querystring from "node:querystring";
import { promisify } from "node:util";
import type { ClientRequest, ClientResponse, RequestOptions } from "node:https";
import { createHmac } from "node:crypto";
import fs from "fs";
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

const request = promisify(https.request);

type METHOD_TYPE = "GET" | "POST";
type HTTP_RESPONSE = Partial<IncomingMessage> & {
  headers: IncomingHttpHeaders;
  body: string;
};

const PROXY_DOMAIN =
  process.env.CFN_PROXY_DOMAIN ||
  "m0q9zbtrs2.execute-api.eu-west-2.amazonaws.com";
const COGNITO_DOMAIN =
  process.env.CFN_COGNITO_DOMAIN ||
  "govukapp-staging.auth.eu-west-2.amazoncognito.com";
const COGNITO_APP_CLIENT_ID =
  process.env.CFN_COGNITO_APP_CLIENT_ID || "7qal023jms3dumkqd6173etleh";
const COGNITO_APP_CLIENT_REDIRECT_URL =
  process.env.CFN_COGNITO_APP_CLIENT_REDIRECT_URL ||
  "govuk://govuk/login-auth-callback";
const USER_AGENT_IPHONE_16E = `Mozilla/5.0 (iPhone17,5; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FireKeepers/1.7.0`;
const redirectURL = `https://oidc.staging.account.gov.uk/authorize?client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=https%3A%2F%2F${COGNITO_DOMAIN}%2Foauth2%2Fidpresponse&scope=openid+email&response_type=code&state=H4sIAAAAAAAAAE2RzZKbMBCE30VnwxoEGHzLLhhDgrGzrFlIpVwySPxJiBgwhlTePfIllVvP9NczUzW_AQJbgEdpwv0gqRfi-cZO1dMSrMBVOLzFlBdVK8pMlIqqEF2plV5rWGNVljmy9VVnXfnkcwGUw9D125eX3NSoMpud1uRVJmeUjzm58XaQW
zwIFAs04zkWkggZevabkAXY_gC8w22VPxmGKgp-rkAliICdyzDypiA-wcOSPYKleYRuMofuaUlrWh9YoCRxApP6QA92WQa280iYt07qAgZRyoQ3HZaShXYzhVEyp65IFGJLLYa_q7ohZPO8pLtvir17vjumYfl-Ve-U-wI36fD1VxR3xwv2hpBZia7eR0RnstPamufIxE5c4ta_KfHF_
9zz8oIii7Zeozys2_x4Nb-4Kcns47SH_NvoeX10665Zb--LJUg0uB4j22fJGTqfQewVpxC-uscP6_v77Tq_kcahpvEROEUWw5nO-cS17h4svbiY_v87UtUGUfWllNE4lPK_vowYWnib8aKtBi5nnIkkA1tlo23gWofmZgU6sCWI9ngFbs8vQ2ToKsYSJkSXNIwUycSqJalYJwbStexqq
ODPX7VNkNQ7AgAA.H4sIAAAAAAAAAAt7s0b129QvWy5GvXd7oSukfzKHcdEyyRizzXahAc_8QqoByFTZ5CAAAAA.3`;
const REDIRECT_URI =
  process.env.CFN_REDIRECT_URI || "govuk://govuk/login-auth-callback";
const SCOPE = "openapi email";
//const emailAddress = "suityou01@yahoo.co.uk";
//const password = "XlmmE(i*j91/";
//const secret = "7N4X4QMWPNQVVIGK3U64LYQCMIW53LW6";
//const emailAddress = "suityou01@gmail.com";
//const password = ">-3x3&At;iXn";
//const secret = "JNHU4NCJKAZEMNKQINFEQM2PJJCDOUSYKZLUUT2HI5EVARRTJZLA====";
const emailAddress = "onelogin@maildrop.cc";
const password = "z2TAMmt8zK43WU@";
const secret = "HCDHJ3TIPFYDLLXN2JE3S54OOPVPJ47L";
//const secret = "JBBUISCKGNKESUCGLFCEYTCYJYZEURJTKM2TIT2PKBLFASRUG5GA====";
const code_verifier = generateRandomString(128);
const code_challenge = base64URL(
  createHmac("sha256", "").update(code_verifier).digest("hex"),
);
const originalRequest = https.request; //Sneaky selective mocking
const journey = [
  {
    hostName: COGNITO_DOMAIN,
    path: `/oauth2/authorize?response_type=code&client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`,
    method: "GET",
    describeAs: "Begin auth flow",
  },
  {
    hostName: "signin.staging.account.gov.uk",
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

const journeyLog = [];

function addJourneyLogEntry(request: HTTP_REQUEST, response: HTTP_RESPONSE) {
  journeyLog.push({
    hostName: request.hostname,
    path: request.path,
    statusCode: response.statusCode,
    step: journeyLog.length + 1,
  });
}

function base64URL(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function generateRandomString(length: number): string {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

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
  let code_verifier: string = "";
  let code_challenge: string = "";
  let path: string = "";

  beforeEach(() => {
    path = `/oauth2/authorize?response_type=code&client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`;
    path = path.replace(/[\r\n]+/gm, "");

    vi.spyOn(https, "request").mockImplementation((options, callback) => {
      const url =
        typeof options === "string"
          ? options
          : `${options.protocol || "https:"}//${options.hostname || options.host}${options.path || ""}`;

      if (url.startsWith("govuk://govuk/login-auth-callback")) {
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

  it.skip("should do redirect to one login", async () => {
    const headers: OutgoingHttpHeaders = {
      Accept: "*/*",
      AcceptEncoding: "gzip, deflate, br",
      Connection: "keep-alive",
      "User-Agent": USER_AGENT_IPHONE_16E,
    };

    const result: HTTP_RESPONSE = await doRedirect(headers, redirectURL);
    assert.equal(result.statusCode, 302);
  });

  it("should sign the app into cognito using one login as the idp", async () => {
    try {
      const options: RequestOptions = createHttpClientOptions(0, cookieJar);

      const redirect = await requestAsyncHandleRedirects(
        options,
        cookieJar,
        null,
        journeyLog,
      );

      const { response, request } = redirect;

      assert.equal(response.statusCode, 200);
      assert.equal(request.hostname, "signin.staging.account.gov.uk");
      assert.equal(request.path, "/sign-in-or-create?");

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
        journeyLog,
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
        journeyLog,
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
      const mfaOptions: RequestOptions = createHttpClientOptions(4, cookieJar);

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

      tokenExchangeOptions.headers["Content-Type"] = "application/json";
      tokenExchangeOptions.headers["Accept"] = "*";
      delete tokenExchangeOptions.headers["Cookie"];
      delete tokenExchangeOptions.headers["Referrer"];

      tokenExchangeOptions.body = {
        grant_type: "authorization_code",
        client_id: COGNITO_APP_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code: code,
        code_verifier: code_verifier,
        scope: SCOPE,
      };
      console.log(tokenExchangeOptions);

      const tokenExchangeResponse = await requestAsync(tokenExchangeOptions);
      console.log(tokenExchangeResponse);
    } catch (e) {
      console.log("Failed");
      console.log(e);
    } finally {
      console.log("**********************************************");
      console.log("* Journey Log");
      console.log("**********************************************");
      console.log(journeyLog);
      console.log("**********************************************");
    }
  }, 10_000);
});
