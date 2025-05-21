import { beforeAll, describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import path from "path";

const template = loadTemplateFromFile(
  path.join(
    __dirname,
    "..",
    "..",
    "template.yaml"
  )
);

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
        FIREBASE_ANDROID_APP_ID: {
          "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/firebase/appcheck/android-app-id}}",
        },
        FIREBASE_IOS_APP_ID: {
          "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/firebase/appcheck/ios-app-id}}",
        },
      });
    });

    it("contains an attestation feature flag", () => {
      expect(resourceUnderTest.Properties.Environment.Variables).containSubset({
        ENABLE_ATTESTATION: {
          "Fn::Sub": "{{resolve:ssm:/${ConfigStackName}/feature-flags/attestation}}"
        },
      });
    });

    it("contains a reference to the cognito secret name", () => {
      expect(resourceUnderTest.Properties.Environment.Variables).containSubset({
        COGNITO_SECRET_NAME: {
          "Fn::Sub": "/${ConfigStackName}/cognito/client-secret",
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
                "Fn::Sub": "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:/${ConfigStackName}/cognito/client-secret-*",
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
});
