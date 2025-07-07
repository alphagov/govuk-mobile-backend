import { assert, describe, it, beforeEach, expect } from "vitest";
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

const request = promisify(https.request);

type METHOD_TYPE = "GET" | "POST";
type HTTP_RESPONSE = Partial<IncomingMessage> & {
  headers: IncomingHttpHeaders;
  body: string;
};

const COGNITO_DOMAIN =
  process.env.CFN_COGNITO_DOMAIN ||
  "eu-west-2fij6f25zh.auth.eu-west-2.amazoncognito.com";
const COGNITO_APP_CLIENT_ID =
  process.env.CFN_COGNITO_APP_CLIENT_ID || "121f51j1s4kmk9i98um0b5mphh";
const COGNITO_APP_CLIENT_REDIRECT_URL =
  process.env.CFN_COGNITO_APP_CLIENT_REDIRECT_URL ||
  "https%3A%2F%2Fd84l1y8p4kdic.cloudfront.net";
const USER_AGENT_IPHONE_16E = `Mozilla/5.0 (iPhone17,5; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FireKeepers/1.7.0`;
const redirectURL = `https://oidc.staging.account.gov.uk/authorize?client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=https%3A%2F%2Feu-west-2fij6f25zh.auth.eu-west-2.amazoncognito.com%2Foauth2%2Fidpresponse&scope=openid+emai
l&response_type=code&state=H4sIAAAAAAAAAE2RzZKbMBCE30VnwxoEGHzLLhhDgrGzrFlIpVwySPxJiBgwhlTePfIllVvP9NczUzW_AQJbgEdpwv0gqRfi-cZO1dMSrMBVOLzFlBdVK8pMlIqqEF2plV5rWGNVljmy9VVnXfnkcwGUw9D125eX3NSoMpud1uRVJmeUjzm58XaQW
zwIFAs04zkWkggZevabkAXY_gC8w22VPxmGKgp-rkAliICdyzDypiA-wcOSPYKleYRuMofuaUlrWh9YoCRxApP6QA92WQa280iYt07qAgZRyoQ3HZaShXYzhVEyp65IFGJLLYa_q7ohZPO8pLtvir17vjumYfl-Ve-U-wI36fD1VxR3xwv2hpBZia7eR0RnstPamufIxE5c4ta_KfHF_
9zz8oIii7Zeozys2_x4Nb-4Kcns47SH_NvoeX10665Zb--LJUg0uB4j22fJGTqfQewVpxC-uscP6_v77Tq_kcahpvEROEUWw5nO-cS17h4svbiY_v87UtUGUfWllNE4lPK_vowYWnib8aKtBi5nnIkkA1tlo23gWofmZgU6sCWI9ngFbs8vQ2ToKsYSJkSXNIwUycSqJalYJwbStexqq
ODPX7VNkNQ7AgAA.H4sIAAAAAAAAAAt7s0b129QvWy5GvXd7oSukfzKHcdEyyRizzXahAc_8QqoByFTZ5CAAAAA.3`;
//const emailAddress = "suityou01@yahoo.co.uk";
//const password = "XlmmE(i*j91/";
//const secret = "G5HDIWBUKFGVOUCOKFLFMSKHJMZVKNRUJRMVCQ2NJFLTKM2MK43A====";
const emailAddress = "suityou01@gmail.com";
const password = ">-3x3&At;iXn";

const secret = "JNHU4NCJKAZEMNKQINFEQM2PJJCDOUSYKZLUUT2HI5EVARRTJZLA====";
const code_verifier = generateRandomString(128);
const code_challenge = base64URL(
  createHmac("sha256", "").update(code_verifier).digest("hex"),
);
const journey = [
  {
    hostName: COGNITO_DOMAIN,
    path: `/oauth2/authorize?response_type=code&client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`,
    method: "GET",
  },
  {
    hostName: "signin.staging.account.gov.uk",
    path: "/sign-in-or-create?",
    method: "POST",
  },
  {},
  {},
];

const journeyLog = [];

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
  contentType: string = "application/x-www-form-url-encoded",
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
  };
}

function addJourneyLogEntry(
  request: HTTP_REQUEST,
  response: HTTP_RESPONSE,
  step: number,
) {
  journeyLog.push({
    hostName: request.hostname,
    path: request.path,
    statusCode: response.statusCode,
    step: step,
  });
}

describe("auth sign in journey", () => {
  let code_verifier: string = "";
  let code_challenge: string = "";
  let path: string = "";

  beforeEach(() => {
    path = `/oauth2/authorize?response_type=code&client_id=${COGNITO_APP_CLIENT_ID}&redirect_uri=${COGNITO_APP_CLIENT_REDIRECT_URL}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`;
    path = path.replace(/[\r\n]+/gm, "");
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
      const redirect = await requestAsyncHandleRedirects(options, cookieJar);
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

      addJourneyLogEntry(request, response, 1);

      let csrf = extractCSRFTokenHelper(response.body);

      // Click the sign in button
      /*
			const clickOptions: RequestOptions = createHttpClientOptions(
        1,
        cookieJar,
      );
			*/

      const clickOptions = {
        hostname: request.hostname,
        path: request.path,
        port: 443,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieJar
            .getCookiesForUrl(signinOrCreateUrl)
            .map((c) => c.toClientString())
            .join(" "),
          Accept: "text/html,application/xhtml+xml,application/xml;",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "User-Agent": USER_AGENT_IPHONE_16E,
          Origin: `https://${request.hostname}`,
          Referrer: "https://signin.staging.account.gov.uk/sign-in-or-create",
        },
      };

      let formData = new URLSearchParams({
        _csrf: csrf,
        supportInternationalNumbers: "",
      });

      const signInResponse = await requestAsyncHandleRedirects(
        clickOptions,
        cookieJar,
        formData.toString(),
      );

      addJourneyLogEntry(signInResponse.request, signInResponse.response, 2);

      const emailForm: FormData = parseFormFromHtml(
        signInResponse.response.body,
      );

      expect(emailForm.action).toEqual("/enter-email");
      expect(emailForm.method).toEqual("post");
      expect(emailForm.inputs[1].name).toEqual("email");

      formData = new URLSearchParams({
        _csrf: emailForm.csrf,
        email: "charles.stevenson@digital.cabinet-office.gov.uk",
      });

      const enterEmailUrl = `https://${clickOptions.hostname}${emailForm.action}`;

      // Submit the email address
      const emailOptions = {
        hostname: clickOptions.hostname,
        path: emailForm.action,
        port: 443,
        method: emailForm.method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieJar
            .getCookiesForUrl(enterEmailUrl)
            .map((c) => c.toClientString())
            .join(" "),
          Accept: "text/html,application/xhtml+xml,application/xml;",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "User-Agent": USER_AGENT_IPHONE_16E,
          Origin: `https://${clickOptions.hostname}`,
          Referrer: "https://signin.staging.account.gov.uk/sign-in-or-create",
        },
      };

      const emailResponse = await requestAsyncHandleRedirects(
        emailOptions,
        cookieJar,
        formData.toString(),
      );

      addJourneyLogEntry(emailResponse.request, emailResponse.response, 3);

      try {
        const passwordForm: FormData = parseFormFromHtml(
          emailResponse.response.body,
        );
      } catch (e) {
        console.log(emailResponse.response.body);
        throw new Error(e);
      }
      // Submit the password
      const passwordOptions = {
        hostname: clickOptions.hostname,
        path: passwordForm.action,
        port: 443,
        method: passwordForm.method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieJar
            .getCookiesForUrl(enterEmailUrl)
            .map((c) => c.toClientString())
            .join(" "),
          Accept: "text/html,application/xhtml+xml,application/xml;",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "User-Agent": USER_AGENT_IPHONE_16E,
          Origin: `https://${clickOptions.hostname}`,
          Referrer: "https://signin.staging.account.gov.uk/sign-in-or-create",
        },
      };

      formData = new URLSearchParams({
        _csrf: passwordForm.csrf,
        password: password,
      });

      const enterPasswordUrl = `https://${clickOptions.hostname}${passwordForm.action}`;

      const passwordResponse = await requestAsyncHandleRedirects(
        passwordOptions,
        cookieJar,
        formData.toString(),
      );

      addJourneyLogEntry(
        passwordResponse.request,
        passwordResponse.response,
        4,
      );

      const totpForm: FormData = parseFormFromHtml(
        passwordResponse.response.body,
      );

      // Submit the password
      const mfaOptions = {
        hostname: clickOptions.hostname,
        path: totpForm.action,
        port: 443,
        method: totpForm.method,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieJar
            .getCookiesForUrl(enterEmailUrl)
            .map((c) => c.toClientString())
            .join(" "),
          Accept: "text/html,application/xhtml+xml,application/xml;",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "User-Agent": USER_AGENT_IPHONE_16E,
          Origin: `https://${clickOptions.hostname}`,
          Referrer: "https://signin.staging.account.gov.uk/sign-in-or-create",
        },
      };

      console.log("Wait for 1s to simulate user delay");
      await sleep(1000);
      console.log("Resuming test");

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

      const enterMFAUrl = `https://${mfaOptions.hostname}${totpForm.action}`;

      const totpResponse = await requestAsyncHandleRedirects(
        mfaOptions,
        cookieJar,
        formData.toString(),
      );

      addJourneyLogEntry(totpResponse.request, totpResponse.response, 5);
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
