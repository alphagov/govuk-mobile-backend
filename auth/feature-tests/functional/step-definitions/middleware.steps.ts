import 'dotenv/config'
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { AuthDriver } from "../driver/auth.driver";
import { AuthFixtures } from "../fixtures/auth.fixtures";
import { expect } from "vitest";

const feature = await loadFeature(
  "feature-tests/functional/features/attestation.feature"
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
  
  ScenarioOutline(
    `Attestation middleware is ran prior to calls to protected services`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`, () => {
        context.user = mappedExamples[variables["user"]]
      });

      When(`the request is made to authenticate`, async () => {
        context.code = await authDriver.loginAndGetCode(context.user)
      })

      Then(`the attestation middleware is invoked`, async () => {
        const { access_token, id_token, refresh_token } = await authDriver.exchangeCodeForTokens(context.code)

        expect(access_token).toBeDefined()
        expect(id_token).toBeDefined()
        expect(refresh_token).toBeDefined()
      });
    }
  );
});
