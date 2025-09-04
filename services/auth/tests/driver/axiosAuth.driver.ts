import querystring from 'querystring';
import pkceChallenge from 'pkce-challenge';
import { AuthDriver } from './auth.driver';
import {
  ExchangeTokenInput,
  LoginUserInput,
  LoginUserResponse,
  RefreshTokenResponse,
  RevokeTokenResponse,
  TokenExchangeResponse,
} from '../types/user';
import { TOTP } from 'totp-generator';
import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { load } from 'cheerio';

export class AxiosAuthDriver implements AuthDriver {
  private clientId: string;
  private authUrl: string;
  private proxyUrl: string;
  private redirectUri: string;
  proxyDomain: string;
  proxyPath: string;
  oneLoginDomain: string;
  client: any;

  constructor(
    clientId: string,
    authUrl: string,
    redirectUri: string,
    proxyUrl: string,
    oneLoginEnvironment: string,
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
    const jar = new CookieJar();
    this.client = wrapper(
      axios.create({
        jar,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
  }

  clearCookies() {
    this.client.defaults.jar = new CookieJar();
  }

  private extractCSRFToken(html: string): string {
    const $ = load(html);
    const input = $(`input[name="_csrf"]`);
    return input.val();
  }

  async loginAndGetCode(input: LoginUserInput): Promise<LoginUserResponse> {
    this.clearCookies();
    const { code_verifier, code_challenge } = await pkceChallenge();
    const authorizeEndpoint =
      `${this.authUrl}/oauth2/authorize?` +
      querystring.stringify({
        client_id: this.clientId,
        response_type: 'code',
        redirect_uri: this.redirectUri,
        scope: 'openid email',
        code_challenge,
        code_challenge_method: 'S256',
        state: 'debug123',
        idpidentifier: 'onelogin',
      });

    const authResponse = await this.client.get(`https://${authorizeEndpoint}`, {
      body: null,
      method: 'GET',
    });

    const csrfToken = this.extractCSRFToken(authResponse.data);

    await this.client.post(
      `https://${this.oneLoginDomain}/sign-in-or-create?`,
      querystring.stringify({
        _csrf: csrfToken,
      }),
    );

    await this.client.post(
      `https://${this.oneLoginDomain}/enter-email?`,
      querystring.stringify({
        _csrf: csrfToken,
        email: input.email,
      }),
    );

    await this.client.post(
      `https://${this.oneLoginDomain}/enter-password?`,
      querystring.stringify({
        _csrf: csrfToken,
        password: input.password,
      }),
    );

    const { otp } = TOTP.generate(input.totpSecret);

    const totpFormResponse = await this.client.post(
      `https://${this.oneLoginDomain}/enter-authenticator-app-code?`,
      querystring.stringify({
        _csrf: csrfToken,
        code: otp,
      }),
    );

    const redirectedUrl = new URL(totpFormResponse.request.res.responseUrl);
    const code = redirectedUrl.searchParams.get('code');

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
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(attestationHeader
          ? {
              'X-Attestation-Token': attestationHeader,
            }
          : {}),
      },
      body: querystring.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
        code_verifier,
        scope: 'email openid',
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

  async refreshAccessToken(
    refreshToken: string,
    attestationHeader: string,
  ): Promise<RefreshTokenResponse> {
    return fetch(`${this.proxyUrl}oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(attestationHeader
          ? {
              'X-Attestation-Token': attestationHeader,
            }
          : {}),
      },
      body: querystring.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        refresh_token: refreshToken,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to refresh access token: ${response.statusText}`,
          );
        }
        return response.json();
      })
      .then((data) => ({
        access_token: data.access_token,
      }));
  }

  async revokeToken(
    refreshToken: string,
    headers?: Record<string, string>,
  ): Promise<RevokeTokenResponse> {
    return await fetch(`${this.proxyUrl}oauth2/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers,
      },
      body: querystring.stringify({
        refresh_token: refreshToken,
        client_id: this.clientId,
      }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to revoke refresh token: ${response.statusText}`,
        );
      }
      return {
        status: response.status,
        statusText: response.statusText,
      };
    });
  }
}
