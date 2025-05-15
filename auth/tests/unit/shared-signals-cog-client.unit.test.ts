import { Template } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll, expect } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

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

describe("Test verify secrets manager presence", () => {
    let resourceUnderTest: {
        Type: any
        Properties: any
    }

    beforeAll(() => {
        const yamlTemplate: any = load(readFileSync("template.yaml", "utf-8"), {
            schema: schema,
        });
        template = Template.fromJSON(yamlTemplate);

        const resource = template.findResources("AWS::SecretsManager::Secret");
        resourceUnderTest = resource['SharedSignalSecretsManager'] as any; 
    });

    it("should have secrets in secrets manager", async () => {
       
        expect(resourceUnderTest.Properties.Name).equal("/shared-signal/secrets-config");
        expect(resourceUnderTest.Properties.Description).equal("Shared Signal Secrets");
        const returnedSecret = JSON.parse(resourceUnderTest.Properties.SecretString['Fn::Sub']);
        
        const {client_id, client_secret, auth_url, audience} = returnedSecret;
        
        expect(client_id).toBeDefined();
        expect(client_secret).toBeDefined();
        expect(auth_url).toBeDefined();
        expect(audience).toBeDefined();
        
    });

    it("should have correct tags", () => {  
        const tags = resourceUnderTest.Properties.Tags;
        expect(tags).toBeDefined();
        expect(tags).toHaveLength(3);
        expect(tags[0].Key).toEqual("Product");
        expect(tags[1].Key).toEqual("Environment");
        expect(tags[2].Key).toEqual("System");
    });

});