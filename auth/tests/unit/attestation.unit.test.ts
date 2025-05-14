import { beforeAll, describe, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";

const template = loadTemplateFromFile("./template.yaml");

describe("attestation", () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  beforeAll(() => {
    const resource = template.findResources("AWS::Serverless::Function");
    resourceUnderTest = resource["AuthProxyFunction"] as any; // find Post Authentication Lambda function
  });

  describe("provisions an auth proxy lambda handler", () => {
    it("should resolve attestation app ids as environment variables", () => {
      template.hasResourceProperties("AWS::Serverless::Function", {
        Environment: {
          Variables: {
            FIREBASE_ANDROID_APP_ID:
              "{{resolve:ssm:/firebase/appcheck/android-app-id}}",
            FIREBASE_IOS_APP_ID:
              "{{resolve:ssm:/firebase/appcheck/ios-app-id}}",
          },
        },
      });
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
