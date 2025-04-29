import 'dotenv/config'
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { AuthDriver } from "../driver/auth.driver";
import { AuthFixtures } from "../fixtures/auth.fixtures";
import { LoggingDriver } from '../driver/logging.driver';
import { expect } from "vitest"
import { AttestationDriver } from '../driver/attestation.driver';

const feature = await loadFeature(
  "feature-tests/functional/features/attestation.feature"
);

const mappedExamples: {
  [key: string]: any;
} = {
  'valid': AuthFixtures.valid,
  'invalid': AuthFixtures.invalid,
  'missing': AuthFixtures.missing,
  'expired': AuthFixtures.expired,
}

type ScenarioVariables = { [key: string]: any };

const givenAnAppInitiatesLogin = (variables: ScenarioVariables, context: any) => {
  context.user = mappedExamples[variables["user"]]
}

const whenARequestIsMadeWithAttestationHeader = async (
  {
    variables,
    context,
    authDriver,
    attestationDriver,
  }: {
    variables: ScenarioVariables,
    context: any,
    authDriver: AuthDriver
    attestationDriver: AttestationDriver
  }
) => {
  if(variables["header"] === "valid") {
    // generate fresh attestation token for valid use-cases
    const { token } = await attestationDriver.getToken(process.env.ATTESTATION_APP_ID!)
    context.user['attestationToken'] = token
  } else {
    context.user['attestationToken'] = mappedExamples[variables["header"]]['attestationToken']
  }
  context.code = await authDriver.loginAndGetCode(context.user)
}

describeFeature(feature, ({ ScenarioOutline }) => {
  const authDriver = new AuthDriver(
    process.env.APP_CLIENT_ID as unknown as string,
    process.env.AUTH_URL as unknown as string,
    process.env.REDIRECT_URI as unknown as string,
  );

  const loggingDriver = new LoggingDriver();
  const attestationDriver = new AttestationDriver();

  ScenarioOutline(
    `Attestation middleware is ran prior to calls to protected services`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`,
        () => givenAnAppInitiatesLogin(variables, context));

      When(`the request is made to authenticate with <header> attestation header`,
        async () => whenARequestIsMadeWithAttestationHeader({
          variables, 
          context, 
          authDriver,
          attestationDriver
        }))

      Then(`the attestation middleware is invoked`, async () => {
        await authDriver.exchangeCodeForTokens(context.code)

        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000; // 60 seconds * 1000 ms

        const response = await loggingDriver.findLogMessageWithRetries({
          logGroupName: `/aws/lambda/${process.env.AUTH_PROXY_LOG_GROUP}`,
          searchString: 'Calling auth proxy',
          startTime: oneMinuteAgo,
          endTime: now,
        })

        expect(response).toBeDefined()
      });
    }
  );

  ScenarioOutline(
    `Attestation tokens are verified`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`,
        () => givenAnAppInitiatesLogin(variables, context));

      When(`the request is made to authenticate with <header> attestation header`,
        async () => whenARequestIsMadeWithAttestationHeader({
          variables, 
          context, 
          authDriver,
          attestationDriver
        }))

      Then(`the response status is <status>`, async () => {
        const { status } = await authDriver.exchangeCodeForTokens(context.code, context.user.attestationToken)
        expect(status).toEqual(Number(variables['status']))
      });
    }
  );

  ScenarioOutline(
    `Unsuccessful requests are logged`,
    ({ Given, When, Then, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`,
        () => givenAnAppInitiatesLogin(variables, context));

      When(`the request is made to authenticate with <header> attestation header`,
        async () => whenARequestIsMadeWithAttestationHeader({
          variables, 
          context, 
          authDriver,
          attestationDriver
        }))

      Then(`the unsuccessful request is logged`, async () => {
        await authDriver.exchangeCodeForTokens(context.code)

        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000; // 60 seconds * 1000 ms

        const response = await loggingDriver.findLogMessageWithRetries({
          logGroupName: `/aws/lambda/${process.env.AUTH_PROXY_LOG_GROUP}`,
          searchString: 'No attestation token header provided',
          startTime: oneMinuteAgo,
          endTime: now,
        })

        expect(response).toBeDefined()
      });
    }
  );
});
