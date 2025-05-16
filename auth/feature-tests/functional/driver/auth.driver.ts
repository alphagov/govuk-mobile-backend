import querystring from "querystring";
import puppeteer from "puppeteer"
import pkceChallenge from 'pkce-challenge';

export type LoginUserInput = {
  username: string;
  password: string;
}

export type TokenExchangeResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  status: number;
  statusText?: string;
}

interface ExchangeTokenInput {
  code: string;
  attestationHeader?: string;
  code_verifier: string;
}

export class AuthDriver {
  private clientId: string;
  private authUrl: string;
  private proxyUrl: string;
  private redirectUri: string;

  constructor(clientId: string, authUrl: string, redirectUri: string, proxyUrl: string) {
    this.clientId = clientId;
    this.authUrl = authUrl
    // used for token exchange
    this.proxyUrl = proxyUrl
    // must be a valid server and redirect uri to allow puppeteer to intercept the request
    this.redirectUri = redirectUri
  }

  async loginAndGetCode(input: LoginUserInput) {
  const { code_verifier, code_challenge } = await pkceChallenge();

    // Use puppeteer or simulate GET to /authorize
    const authorizeUrl = `${this.authUrl}/oauth2/authorize?` + querystring.stringify({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'email openid',
      code_challenge,
      code_challenge_method: 'S256',
      state: 'xyz123' // (could be random)
    });

    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto(authorizeUrl);

    await page.click('button[id="sign-in-button"]');

    await page.waitForNavigation();

    await page.type('input[name="email"]', input.username);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();


    await page.type('input[name="password"]', input.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const redirectedUrl = page.url();

    const url = new URL(redirectedUrl);
    const code = url.searchParams.get('code');

    if (!code) throw new Error('No auth code found in redirect URL');
    await browser.close();

    return {
      code,
      code_verifier
    };
  }

  async exchangeCodeForTokens({
    attestationHeader,
    code,
    code_verifier
  }: ExchangeTokenInput): Promise<TokenExchangeResponse> {
    const response = await fetch(`${this.proxyUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(attestationHeader ? {
          'X-Attestation-Token': attestationHeader
        }: {})
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
        statusText: await response.text()
      }
    }

    const data = await response.json();

    return {
      ...data,
      status: response.status
    };
  }
}