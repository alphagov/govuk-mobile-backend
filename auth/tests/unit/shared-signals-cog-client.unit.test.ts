import {Template} from "aws-cdk-lib/assertions";
import {schema} from "yaml-cfn";
import {describe, it, beforeAll, expect} from "vitest";
import {readFileSync} from "fs";
import {load} from "js-yaml";

let template: Template;

describe("Test shared signal M2M cognito client", () => {
    let resourceUnderTest: {
        Type: any
        Properties: any
    }

    beforeAll(() => {
        const yamlTemplate: any = load(readFileSync("template.yaml", "utf-8"), {
            schema: schema,
        });
        template = Template.fromJSON(yamlTemplate);

        const resource = template.findResources("AWS::Cognito::UserPoolClient");
        resourceUnderTest = resource['CognitoM2MClient'] as any; //find Machine to Machine cognito client
    });

    it('should have type of Cognito user pool client', () => {
        expect(resourceUnderTest.Type).equal("AWS::Cognito::UserPoolClient");
    })

    it("should refer to cognito user pool", () => {
        expect(resourceUnderTest.Properties.UserPoolId.Ref).equal("CognitoUserPool");
    });

    it("has cognito as supported identity provider", () => {
        expect(resourceUnderTest.Properties.SupportedIdentityProviders).includes('COGNITO');
    });

    it("has correct Allowed OAuth Flow", () => {
        expect(resourceUnderTest.Properties.AllowedOAuthFlows).includes('client_credentials');
    });

    it("has AllowedOAuthScopes defined", () => {
        expect(resourceUnderTest.Properties.AllowedOAuthScopes).toBeDefined()
    });

    it("should generate secret", () => {
        expect(resourceUnderTest.Properties.GenerateSecret).equal(true);
    });

    it("has correct access token validity", () => {
        expect(resourceUnderTest.Properties.AccessTokenValidity).equal(3600);
    });
});
