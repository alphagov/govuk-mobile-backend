import 'dotenv/config'
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { AuthDriver, TokenExchangeResponse } from "../driver/auth.driver";
import { AuthFixtures } from "../fixtures/auth.fixtures";
import { expect } from "vitest";
import { JwtDecoder } from '../helper/jwt-decoder';
import {Then} from "cucumber";


const feature = await loadFeature(
  "feature-tests/functional/features/token-generation.feature"
);

const mappedExamples: {
  [key: string]: any;
} = {
  'valid': AuthFixtures.valid,
  'invalid': AuthFixtures.invalid,
}


describeFeature(feature, ({ ScenarioOutline }) => {
  const authDriver = new AuthDriver(
    process.env.APP_CLIENT_ID as unknown as string,
    process.env.AUTH_URL as unknown as string,
    process.env.REDIRECT_URI as unknown as string,
  );

  const jwtDecoderObj = new JwtDecoder();

  ScenarioOutline(
    `Successfully generate a token using PKCE`,
    ({ Given, When, Then, context, And }, variables) => {
      let access_token: string;
      let id_token: string;
      let refresh_token: string;

      Given(`an app initiates a login with <user> credentials`, () => {
        context.user = mappedExamples[variables["user"]]
      });

      When(`initiate the token exchange`, async () => {
        context.code = await authDriver.loginAndGetCode(context.user)
      })

      Then(`I should receive an auth tokens`, async () => {
        const tokens: TokenExchangeResponse = await authDriver.exchangeCodeForTokens(context.code)

        access_token = tokens.access_token;
        id_token = tokens.id_token;
        refresh_token = tokens.refresh_token;

        expect(access_token).toBeDefined();
        expect(id_token).toBeDefined();
        expect(refresh_token).toBeDefined();

      })
      And(`the tokens should have correct validity period`, () => {
        const accessTokenResponse = jwtDecoderObj.decode(access_token);
        const accessTokenValidityPeriod = calculateDuration(accessTokenResponse);
        const tolerance = 5; // Allowable difference in seconds
        expect(Math.abs(accessTokenValidityPeriod - 3600)).toBeLessThanOrEqual(tolerance); //Allow test delay for 5 seconds

        const idTokenRes = jwtDecoderObj.decode(id_token);
        const idTokenValidityPeriod = calculateDuration(idTokenRes);
        expect(Math.abs(idTokenValidityPeriod - 3600)).toBeLessThanOrEqual(tolerance); //Allow test delay for 5 seconds

        // Refresh token cannot be decoded at client side
        
      });

      And(`id_token should have correct email address`, () => {
        const response = jwtDecoderObj.decode(id_token);
        if (!response) {
          throw new Error("Failed to decode id_token");
        } 
        expect(response.email).toEqual(context.user.username);
      });
    });
});

const calculateDuration = (res: any) => {
  if (res === null || res === undefined) {
    throw new Error("Token payload is null or undefined.");
  }
  const exp = res.exp;
  if (!exp) {
    throw new Error("Expiration time (exp) not found in the token payload.");
  }

  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds

  const remainingDuration = exp - currentTime;
  return remainingDuration;
}