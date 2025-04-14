import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { AuthDriver } from "../driver/auth.driver";
import { AuthFixtures } from "../fixtures/auth.fixtures";
import { expect } from "vitest";

const feature = await loadFeature(
  "feature-tests/functional/attestation/features/middleware.feature"
);


describeFeature(feature, ({ BeforeAllScenarios, Scenario }) => {
  const defaultRegion = 'eu-west-2'
  const authDriver = new AuthDriver(process.env.APP_CLIENT_ID, defaultRegion);
  BeforeAllScenarios(() => {});
  
  Scenario(
    `Attestation middleware is ran prior to calls to protected services`,
    ({ Given, When, Then, context }) => {
      Given(`an app initiates a login with valid credentials`, () => {
        context.user = {
          ...AuthFixtures.valid,
          attestationToken: 'blah'
        };

        
      });
      When(`the request is made to authenticate`, async () => {
        expect(authDriver.initiateAuth(context.user)).resolves
      })

      Then(`the attestation middleware is invoked`, () => {
        console.log('TOOD: needs access to logs')
      });
    }
  );
});
