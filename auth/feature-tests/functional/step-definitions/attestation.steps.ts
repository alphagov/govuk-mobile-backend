import 'dotenv/config'
import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber";
import { AuthDriver } from "../driver/auth.driver";
import { AuthFixtures } from "../fixtures/auth.fixtures";
import { LoggingDriver } from '../driver/logging.driver';
import { expect } from "vitest"
import { AttestationDriver } from '../driver/attestation.driver';
import { testConfig } from '../common/config';

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
  'unknown_app': AuthFixtures.unknown,
}

type ScenarioVariables = { [key: string]: any };

const givenAnAppInitiatesLogin = (variables: ScenarioVariables, context: any) => {
  context.user = mappedExamples[variables["user"]]
}

const whenARequestIsMadeWithAttestationHeader = async (
  {
    variables,
    context,
    attestationDriver,
  }: {
    variables: ScenarioVariables,
    context: any,
    attestationDriver: AttestationDriver
  }
) => {
  context.code = 'abcd1234'

  if (variables["header"] === "valid") {
    // generate fresh attestation token for valid use-cases
    const { token } = await attestationDriver.getToken(testConfig.firebaseIosAppId)
    context.user['attestationToken'] = token
  } else if (variables["header"] === "unknown_app") {
    const { token } = await attestationDriver.getToken(testConfig.unknownAndroidAppId)
    context.user['attestationToken'] = token
  } else {
    context.user['attestationToken'] = mappedExamples[variables["header"]]['attestationToken']
  }
}

const thenRequestIsLogged = async (
  {
    variables,
    loggingDriver,
    authDriver,
    context,
  }: {
    variables: ScenarioVariables,
    loggingDriver: LoggingDriver,
    authDriver: AuthDriver,
    context: any,
  }
) => {
  await authDriver.exchangeCodeForTokens({
    code: context.code,
    attestationHeader: context.user.attestationToken,
    code_verifier: context.code_verifier
  })

  const logMessageMap = {
    "success": "Attestation token is valid",
    "failure": "Catchall error",
  }

  const searchString = logMessageMap[variables["log"] as keyof typeof logMessageMap]

  return await loggingDriver.findLogMessageWithRetries({
    logGroupName: testConfig.authProxyLogGroup,
    searchString,
  })
}

describeFeature(feature, ({ ScenarioOutline }) => {
  const authDriver = new AuthDriver(
    testConfig.appClientId,
    testConfig.authUrl,
    testConfig.redirectUri,
    testConfig.proxyUrl
  );

  const loggingDriver = new LoggingDriver();
  const attestationDriver = new AttestationDriver();

  ScenarioOutline(
    `Attestation tokens are verified`,
    ({ Given, When, Then, And, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`,
        () => givenAnAppInitiatesLogin(variables, context));

      When(`the request is made to authenticate with <header> attestation header`,
        async () => whenARequestIsMadeWithAttestationHeader({
          variables,
          context,
          attestationDriver
        }))

      Then(`the response status is <status>`, async () => {
        const { status, statusText } = await authDriver.exchangeCodeForTokens({
          code: context.code,
          attestationHeader: context.user.attestationToken,
          code_verifier: context.code_verifier
        })
        expect(status).toEqual(Number(variables['status']))
        context.response = {
          statusText
        }
      });

      And(`the response message is <message>`, async () => {
        if (variables['message']) {
          expect(JSON.parse(context.response.statusText)?.message).toEqual(variables['message'])
        }
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
          attestationDriver
        }))

      Then(`the <log> request is logged`, async () => {
        const response = await thenRequestIsLogged({
          variables,
          loggingDriver,
          authDriver,
          context
        })

        expect(response).toBeDefined()
      });
    }
  );

  ScenarioOutline(
    `Valid attestation tokens are accepted`,
    ({ Given, When, Then, And, context }, variables) => {
      Given(`an app initiates a login with <user> credentials`,
        () => givenAnAppInitiatesLogin(variables, context));

      When(`the request is made to authenticate with <header> attestation header`,
        async () => whenARequestIsMadeWithAttestationHeader({
          variables,
          context,
          attestationDriver
        }))

      Then(`the <log> request is logged`, async () => {
        const response = await thenRequestIsLogged({
          variables,
          loggingDriver,
          authDriver,
          context
        })

        expect(response).toBeDefined()
      });
    }
  );
});