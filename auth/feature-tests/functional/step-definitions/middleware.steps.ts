import 'dotenv/config'
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { AuthDriver } from "../driver/auth.driver";
import { AuthFixtures } from "../fixtures/auth.fixtures";
import { LoggingDriver } from '../driver/logging.driver';
import { expect } from "vitest"

const feature = await loadFeature(
  "feature-tests/functional/features/attestation.feature"
);

const mappedExamples: {
  [key: string]: any;
} = {
  'valid': AuthFixtures.valid,
  'invalid': AuthFixtures.invalid,
}

const givenAnAppInitiatesLogin = (variables: {
  [key: string]: any;
}, context: any) => {
  context.user = mappedExamples[variables["user"]]
}

describeFeature(feature, ({ ScenarioOutline }) => {
  const authDriver = new AuthDriver(
    process.env.APP_CLIENT_ID as unknown as string, 
    process.env.AUTH_URL as unknown as string,
    process.env.REDIRECT_URI as unknown as string,
  );

  const loggingDriver = new LoggingDriver({
    region: 'eu-west-2'
  })
  
  ScenarioOutline(
    `Attestation middleware is ran prior to calls to protected services`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`, givenAnAppInitiatesLogin);

      When(`the request is made to authenticate with <user> attestation header`, async () => {
        context.user['attestationToken'] = mappedExamples[variables["user"]]['attestationToken']
        context.code = await authDriver.loginAndGetCode(context.user)
      })

      Then(`the attestation middleware is invoked`, async () => {
        await authDriver.exchangeCodeForTokens(context.code)
        
        const response = await loggingDriver.findLogMessageWithRetries({
          logGroupName: '/aws/lambda/...',
          searchString: 'Calling auth proxy',
        })

        expect(response).toBeDefined()
      });
    }
  );

  ScenarioOutline(
    `Invalid attestation tokens are rejected`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`, givenAnAppInitiatesLogin);

      When(`the request is made to authenticate with <user> attestation header`, async () => {
        context.user['attestationToken'] = mappedExamples[variables["user"]]['attestationToken']
        context.code = await authDriver.loginAndGetCode(context.user)
      })

      Then(`the request is rejected with a <response> status`, async () => {
        const { access_token, id_token, refresh_token, status, statusText } = await authDriver.exchangeCodeForTokens(context.code)

        expect(access_token).toBeUndefined()
        expect(id_token).toBeUndefined()
        expect(refresh_token).toBeUndefined()
        expect(status).toBe(variables['status'])
      });
    }
  );
});
