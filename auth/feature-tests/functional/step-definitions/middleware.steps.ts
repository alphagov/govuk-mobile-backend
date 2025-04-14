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
  'invalid': AuthFixtures.invalid,
}

describeFeature(feature, ({ ScenarioOutline }) => {
  const defaultRegion = 'eu-west-2'
  const authDriver = new AuthDriver(process.env.APP_CLIENT_ID as unknown as string, defaultRegion);
  
  ScenarioOutline(
    `Attestation middleware is ran prior to calls to protected services`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`, () => {
        context.user = mappedExamples[variables["user"]]
      });

      When(`the request is made to authenticate`, async () => {
        await authDriver.initiateAuth(context.user)
          .catch((error) => {
            context.error = error
          })
      })

      Then(`the attestation middleware is invoked`, () => {
        expect(context.error).toEqual(new Error('Failed to initiate authentication: PreAuthentication failed with error No attestation token.'))
      });
    }
  );
});
