import { describe, it, expect } from "vitest";
import { loadTemplateFromFile } from "../common/template";

const template = loadTemplateFromFile("./template.yaml");

describe.skip("shared signals", () => {
  it("should provision an api gateway", () => {
    template.hasResourceProperties("AWS::Serverless::Api", {
      Name: {
        "Fn::Join": [
          "-",
          [
            {
              Ref: "AWS::StackName",
            },
            "shared-signals",
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

  it("should have a receiver endpoint", () => {
    template.hasResourceProperties("AWS::Serverless::Function", {
      Events: {
        HelloWorldApi: {
          Properties: {
            Path: "/receiver",
          },
        },
      },
      FunctionName: {
        "Fn::Sub": "${AWS::StackName}-shared-signals-receiver",
      },
    });
  });

  it("should have authorizer associated", () => {
    let resourceUnderTest: {
      Type: any;
      Properties: any;
    };
    const resources = template.findResources("AWS::Serverless::Api");
    resourceUnderTest = resources["SharedSignalsApi"] as any;

    expect(resourceUnderTest.Properties.Auth.DefaultAuthorizer).toBe(
      "SharedSignalsAuthorizer"
    );
  });

  it("should have a shared signals authorizer lambda", () => {
    let resourceUnderTest: {
      Type: any;
      Properties: any;
    };
    const resources = template.findResources("AWS::Serverless::Function");
    resourceUnderTest = resources["SharedSignalsAuthorizer"] as any;

    expect(resourceUnderTest.Type).toBeDefined();
  });
});
