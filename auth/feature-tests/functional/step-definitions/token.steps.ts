import 'dotenv/config'
import {loadFeature, describeFeature} from "@amiceli/vitest-cucumber";
import {AuthDriver} from "../driver/auth.driver";
import {AuthFixtures} from "../fixtures/auth.fixtures";
import {expect} from "vitest";
import {JwtDecoder} from '../helper/jwt-decoder';


const feature = await loadFeature(
    "feature-tests/functional/features/token-generation.feature"
);

const mappedExamples: {
    [key: string]: any;
} = {
    'valid': AuthFixtures.valid,
    'invalid': AuthFixtures.invalid,
}


describeFeature(feature, ({ScenarioOutline}) => {
    const authDriver = new AuthDriver(
        process.env.CFN_AppUserPoolClientId as unknown as string,
        process.env.AUTH_URL as unknown as string,
        process.env.REDIRECT_URI as unknown as string,
    );

    const jwtDecoderObj = new JwtDecoder();

    ScenarioOutline.skip(
        `Successfully generate a token using PKCE`,
        ({Given, When, Then, context, And}, variables) => {
            context.tokens = {
                access_token: "",
                id_token: "",
                refresh_token: ""
            }

            Given(`an app initiates a login with <user> credentials`, () => {
                context.user = mappedExamples[variables["user"]]
            });

            When(`initiate the token exchange`, async () => {
                context.code = await authDriver.loginAndGetCode(context.user)
            })

            Then(`I should receive an auth tokens`, async () => {
                context.tokens = await authDriver.exchangeCodeForTokens(context.code)

                expect(context.tokens.access_token).toBeDefined();
                expect(context.tokens.id_token).toBeDefined();
                expect(context.tokens.refresh_token).toBeDefined();

            })
            And(`the tokens should have correct validity period`, () => {
                const tolerance = 5; // Allowable difference in seconds

                const accessTokenResponse = jwtDecoderObj.decode(context.tokens.access_token);
                const accessTokenValidityPeriod = jwtDecoderObj.calculateDuration(accessTokenResponse);
                expect(Math.abs(accessTokenValidityPeriod - 3600)).toBeLessThanOrEqual(tolerance); //Allow test delay for 5 seconds

                const idTokenRes = jwtDecoderObj.decode(context.tokens.id_token);
                const idTokenValidityPeriod = jwtDecoderObj.calculateDuration(idTokenRes);
                expect(Math.abs(idTokenValidityPeriod - 3600)).toBeLessThanOrEqual(tolerance); //Allow test delay for 5 seconds

                // Refresh token cannot be decoded at client side

            });

            And(`id_token should have correct email address`, () => {
                const response = jwtDecoderObj.decode(context.tokens.id_token);
                if (!response) {
                    throw new Error("Failed to decode id_token");
                }
                expect(response.email).toEqual(context.user.username);
            });
        });
});
