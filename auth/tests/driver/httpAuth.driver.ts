import querystring from "querystring";
import pkceChallenge from "pkce-challenge";
import {
  addJourneyLogEntry,
  CookieJar,
  extractCSRFTokenHelper,
  parseFormFromHtml,
  requestAsyncHandleRedirects,
} from "../acc/helpers";
import { RequestOptions } from "http";
import { expect } from "vitest";
import { AuthDriver } from "./auth.driver";
import { ExchangeTokenInput, LoginUserInput, LoginUserResponse, RefreshTokenResponse, TokenExchangeResponse } from "../types/user";
import { TOTP } from "totp-generator"

export class HttpAuthDriver implements AuthDriver {
  private clientId: string;
  private authUrl: string;
  private proxyUrl: string;
  private redirectUri: string;
  proxyDomain: string;
  proxyPath: string;
  oneLoginDomain: string;

  constructor(
    clientId: string,
    authUrl: string,
    redirectUri: string,
    proxyUrl: string,
    oneLoginEnvironment: string
  ) {
    this.clientId = clientId;
    this.authUrl = authUrl;
    // used for token exchange
    this.proxyUrl = proxyUrl;
    // must be a valid server and redirect uri to allow puppeteer to intercept the request
    this.redirectUri = redirectUri;
    this.proxyDomain = new URL(proxyUrl).hostname;
    this.proxyPath = new URL(proxyUrl).pathname;
    this.oneLoginDomain = `signin.${oneLoginEnvironment}.account.gov.uk`;
  }

  createHttpClientOptions(
    journeyStep: number,
    cookieJar: CookieJar,
    journey,
    contentType: string = "application/x-www-form-urlencoded",
    referrer: string = "https://signin.staging.account.gov.uk/sign-in-or-create"
  ): RequestOptions {
    const { hostName, path, method } =
      journey[journeyStep];

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
        "User-Agent": "Mozilla/5.0 (iPhone17,5; CPU iPhone OS 18_3_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 FireKeepers/1.7.0",
        Origin: `https://${hostName}`,
        Referrer: referrer,
      },
    } as RequestOptions;
  }

  async loginAndGetCode(input: LoginUserInput): Promise<LoginUserResponse> {
    const { code_verifier, code_challenge } = await pkceChallenge();

    const journey = [
      {
        hostName: this.authUrl,
        path: `/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&code_challenge=${code_challenge}&code_challenge_method=S256&scope=openid+email&idpidentifier=onelogin`,
        method: "GET",
        describeAs: "Begin auth flow",
      },
      {
        hostName: this.oneLoginDomain,
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
        hostName: this.proxyDomain,
        path: `${this.proxyPath}/oauth2/token`,
        method: "POST",
        describeAs: "Token exchange",
      },
    ];
    const cookieJar = new CookieJar();

    const options: RequestOptions = this.createHttpClientOptions(
      0,
      cookieJar,
      journey
    );

    const redirect = await requestAsyncHandleRedirects(
      options,
      cookieJar,
      null
    );

    const { response, request } = redirect;

    expect(response.statusCode).toEqual(200);
    expect(request.hostname).toEqual(this.oneLoginDomain);
    expect(request.path).toEqual("/sign-in-or-create?");

    //Sign in or create page
    const signinOrCreateUrl = `https://${request.hostname}${request.path}`;

    // Cache the cookies
    await cookieJar.addCookie(
      signinOrCreateUrl,
      response.headers["set-cookie"]
    );

    // The redirect to /sign-in-or-create
    addJourneyLogEntry(request, response);

    let csrf = extractCSRFTokenHelper(response.body);

    // Click the sign in button
    const clickOptions: RequestOptions = this.createHttpClientOptions(1, cookieJar, journey);

    let formData = new URLSearchParams({
      _csrf: csrf,
      supportInternationalNumbers: "",
    });

    const signInResponse = await requestAsyncHandleRedirects(
      clickOptions,
      cookieJar,
      formData.toString()
    );

    addJourneyLogEntry(signInResponse.request, signInResponse.response);

    const emailForm: FormData = parseFormFromHtml(signInResponse.response.body);

    expect(emailForm.action).toEqual("/enter-email");
    expect(emailForm.method).toEqual("post");
    expect(emailForm.inputs[1].name).toEqual("email");

    formData = new URLSearchParams({
      _csrf: emailForm.csrf,
      email: input.email,
    });

    // Very hacky but more readable than what we had.
    journey[2].hostName = journey[1].hostName;
    journey[2].path = emailForm.action;
    journey[2].method = "POST";

    // Submit the email address
    const emailOptions: RequestOptions = this.createHttpClientOptions(2, cookieJar, journey);

    const emailResponse = await requestAsyncHandleRedirects(
      emailOptions,
      cookieJar,
      formData.toString()
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
    const passwordOptions: RequestOptions = this.createHttpClientOptions(
      3,
      cookieJar,
      journey
    );

    formData = new URLSearchParams({
      _csrf: passwordForm.csrf,
      isReauthJourney: false,
      password: input.password,
    });

    const passwordResponse = await requestAsyncHandleRedirects(
      passwordOptions,
      cookieJar,
      formData.toString()
    );

    addJourneyLogEntry(passwordResponse.request, passwordResponse.response);

    const totpForm: FormData = parseFormFromHtml(
      passwordResponse.response.body
    );

    // Submit the MFA
    // Very hacky but more readable than what we had.
    journey[4].hostName = journey[1].hostName;
    journey[4].path = totpForm.action;
    journey[4].method = totpForm.method;

    // Submit the password
    // Submit the email address
    const mfaOptions: RequestOptions = this.createHttpClientOptions(4, cookieJar, journey);

    // const generator = new TOTPGenerator(input.totpSecret);
    const { otp } = TOTP.generate(input.totpSecret);
    // const currentCode = generator.generate();

    formData = new URLSearchParams({
      _csrf: totpForm.csrf,
      code: otp,
    });

    const totpResponse = await requestAsyncHandleRedirects(
      mfaOptions,
      cookieJar,
      formData.toString()
    );

    addJourneyLogEntry(totpResponse.request, totpResponse.response);
    expect(totpResponse.response.statusCode).toEqual(200);

    const codeURL = new URL(
      `https://${totpResponse.request.hostname}${totpResponse.request.path}`
    );

    const code = codeURL.searchParams.get("code");

    expect(code).toBeTruthy();

    return {
      code: code!,
      code_verifier,
    };
  }

  async exchangeCodeForTokens({
    attestationHeader,
    code,
    code_verifier,
  }: ExchangeTokenInput): Promise<TokenExchangeResponse> {
    const response = await fetch(`${this.proxyUrl}oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(attestationHeader
          ? {
              "X-Attestation-Token": attestationHeader,
            }
          : {}),
      },
      body: querystring.stringify({
        grant_type: "authorization_code",
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier,
        scope: "email openid",
      }),
    });

    if (!response.ok) {
      return {
        status: response.status,
        statusText: await response.text(),
      };
    }

    const data = await response.json();

    return {
      ...data,
      status: response.status,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return fetch(`${this.proxyUrl}oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({
        grant_type: "refresh_token",
        client_id: this.clientId,
        refresh_token: refreshToken,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to refresh access token: ${response.statusText}`);
        }
        return response.json();
      })
      .then((data) => ({
        access_token: data.access_token,
      }));
  }
}
