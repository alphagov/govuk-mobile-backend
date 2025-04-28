import querystring from "querystring";
import puppeteer from "puppeteer"

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

export class AuthDriver {
  private clientId: string;
  private authUrl: string;
  private redirectUri: string;

  constructor(clientId: string, authUrl: string, redirectUri: string) {
    this.clientId = clientId;
    this.authUrl = authUrl
    // must be a valid server and redirect uri to allow puppeteer to intercept the request
    this.redirectUri = redirectUri
  }

  async loginAndGetCode(input: LoginUserInput) {
    // Use puppeteer or simulate GET to /authorize
    const authorizeUrl = `${this.authUrl}/oauth2/authorize?` + querystring.stringify({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'email openid',
      state: 'xyz123' // (could be random)
    });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(authorizeUrl);

    await page.type('input[name="username"]', input.username);
    await page.type('input[name="password"]', input.password);
    await page.click('input[name="signInSubmitButton"]');

    await page.waitForNavigation();

    const redirectedUrl = page.url();

    const url = new URL(redirectedUrl);
    const code = url.searchParams.get('code');

    if (!code) throw new Error('No auth code found in redirect URL');
    await browser.close();

    return code;
  }

  async exchangeCodeForTokens(code: string, attestationHeader?: string): Promise<TokenExchangeResponse> {
    const response = await fetch(`${this.authUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(attestationHeader ? {
          'Attestation-Token': attestationHeader
        }: {})
      },
      body: querystring.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      return {
        status: response.status,
        statusText: await response.text()
      }
    }

    return {
      ...response.json(),
      status: response.status
    };
  }
}