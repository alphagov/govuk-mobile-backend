import { beforeAll, describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";

const template = loadTemplateFromFile("./template.yaml");

describe("attestation", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
    Metadata: any;
  };
  beforeAll(() => {
    const resource = template.findResources("AWS::Serverless::Function");
    resourceUnderTest = resource["AuthProxyFunction"] as any;
  });

  describe("provisions an auth proxy lambda handler", () => {
    it("should have a code uri", () => {
      expect(resourceUnderTest.Properties.CodeUri).equal(
        "proxy/"
      );
    });

    it("should resolve attestation app ids as environment variables", () => {
      expect(resourceUnderTest.Properties.Environment.Variables).containSubset({
        FIREBASE_ANDROID_APP_ID:
          "{{resolve:ssm:/firebase/appcheck/android-app-id}}",
        FIREBASE_IOS_APP_ID:
          "{{resolve:ssm:/firebase/appcheck/ios-app-id}}",
        COGNITO_SECRET_NAME: {
          Ref: "CognitoClientSecret",
        },
      });
    });

    it("contains an attestation feature flag", () => {
      expect(resourceUnderTest.Properties.Environment.Variables).containSubset({
        ENABLE_ATTESTATION: "{{resolve:ssm:/feature-flags/attestation}}"
      });
    });

    it("contains a reference to the cognito secret name", () => {
      expect(resourceUnderTest.Properties.Environment.Variables).containSubset({
        COGNITO_SECRET_NAME: {
          "Ref": "CognitoClientSecret",
        },
      });
    });

    it("should have permission to read the client secret", () => {
      expect(resourceUnderTest.Properties.Policies).toEqual([
        {
          "Statement": [
            {
              "Action": [
                "secretsmanager:GetSecretValue",
              ],
              "Effect": "Allow",
              "Resource": {
                "Ref": "CognitoClientSecret",
              },
            },
          ],
          "Version": "2012-10-17",
        },
      ]);
    });

    it('should have the correct tags', () => {
      expect(resourceUnderTest.Properties?.Tags).toEqual({
        "Environment": {
          "Ref": "Environment",
        },
        "Product": "GOV.UK",
        "System": "Authentication",
      })
    });
  });

  describe("api gateway", () => {
    it("should provision an auth proxy api gateway", () => {
      template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
        Name: {
          "Fn::Join": [
            "-",
            [
              {
                Ref: "AWS::StackName",
              },
              "auth-proxy",
              {
                "Fn::Select": [
                  4,
                  {
                    "Fn::Split": [
                      "-",
                      {
                        "Fn::Select": [
                          2,
                          {
                            "Fn::Split": [
                              "/",
                              {
                                Ref: "AWS::StackId",
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          ],
        },
      });
    });

    it("should have a catchall endpoint", () => {
      template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
        RouteKey: "ANY /{proxy+}",
      });
    });
  });

  describe("confidential client secret", () => {
    let secretUnderTest;
    beforeAll(() => {
      const resource = template.findResources("AWS::SecretsManager::Secret");
      secretUnderTest = resource["CognitoClientSecret"] as any;
    });

    it("should generate a secret store for the auth proxy to use", () => {
      expect(secretUnderTest).toBeDefined();
    })

    it("should have no secret string to avoid being overwritten", () => {
      expect(secretUnderTest.Properties?.SecretString).toBeUndefined();
    });

    it('should have the correct tags', () => {
      expect(secretUnderTest.Properties?.Tags).toEqual([
        {
          "Key": "Product",
          "Value": "GOV.UK",
        },
        {
          "Key": "Environment",
          "Value": {
            "Ref": "Environment",
          },
        },
        {
          "Key": "System",
          "Value": "Authentication",
        },
      ])
    });
  })
});
