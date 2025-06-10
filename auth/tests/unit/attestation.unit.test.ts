import { beforeAll, describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("attestation", () => {
  describe("auth proxy function", () => {
    it("should only have an oauth token endpoint", () => {
      const lambda = template.findResources("AWS::Serverless::Function")[
        "AuthProxyFunction"
      ] as any;
      expect(lambda.Properties.Events.ApiEvent.Properties.Path).toBe(
        "/oauth2/token"
      );
      expect(lambda.Properties.Events.ApiEvent.Properties.Method).toBe("post");
    });
  });

  describe("auth proxy function iam role", () => {
    const role = template.findResources("AWS::IAM::Role")[
      "AuthProxyFunctionIAMRole"
    ] as any;
    it("should have the correct trust policy", () => {
      expect(role.Properties.AssumeRolePolicyDocument).toEqual({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      });
    });
    it("should have permissions to access the cognito client secret", () => {
      expect(role.Properties.Policies).toContainEqual(
        expect.objectContaining({
          PolicyName: "AuthProxyFunctionPolicy",
          PolicyDocument: expect.objectContaining({
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Effect: "Allow",
                Action: ["secretsmanager:GetSecretValue"],
                Resource: {
                  "Fn::Sub":
                    "arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:/${ConfigStackName}/cognito/client-secret-*",
                },
              }),
            ]),
          }),
        })
      );
    });

    it("should have permissions to get the cognito domain from parameter store", () => {
      expect(role.Properties.Policies).toContainEqual(
        expect.objectContaining({
          PolicyName: "AuthProxyFunctionPolicy",
          PolicyDocument: expect.objectContaining({
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Action: ["ssm:GetParameter"],
                Effect: "Allow",
                Resource: {
                  "Fn::Sub":
                    "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${ConfigStackName}/cognito/custom-domain",
                },
              }),
            ]),
          }),
        })
      );
    });

    it("should have permissions to write to its own cloud watch logs only", () => {
      expect(role.Properties.Policies).toContainEqual(
        expect.objectContaining({
          PolicyName: "AuthProxyFunctionPolicy",
          PolicyDocument: expect.objectContaining({
            Statement: expect.arrayContaining([
              expect.objectContaining({
                Action: [
                  "logs:CreateLogGroup",
                  "logs:CreateLogStream",
                  "logs:PutLogEvents",
                ],
                Effect: "Allow",
                Resource: {
                  "Fn::Sub":
                    "arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}-auth-proxy:*",
                },
              }),
            ]),
          }),
        })
      );
    });

    it("should have the correct tags", () => {
      expect(role.Properties.Tags).toEqual([
        {
          Key: "Product",
          Value: "GOV.UK",
        },
        {
          Key: "Environment",
          Value: {
            Ref: "Environment",
          },
        },
        {
          Key: "System",
          Value: "Authentication",
        },
      ]);
    });
  });

  describe("api gateway", () => {
    it("should provision an auth proxy api gateway", () => {
      template.hasResourceProperties("AWS::Serverless::Api", {
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
  });

  describe("waf", () => {
    const authProxyWaf = template.findResources("AWS::WAFv2::WebACL")[
      "AuthProxyWaf"
    ] as any;
    const association = template.findResources("AWS::WAFv2::WebACLAssociation")[
      "AuthProxyWafAssociation"
    ] as any;

    it("should allow all requests that are not match", () => {
      expect(authProxyWaf.Properties.DefaultAction).toEqual({
        Allow: {},
      });
    });

    it("should have a regional scope", () => {
      expect(authProxyWaf.Properties.Scope).toEqual("REGIONAL");
    });

    it("should have the required tags", () => {
      expect(authProxyWaf.Properties.Tags).toEqual([
        {
          Key: "Product",
          Value: "GOV.UK",
        },
        {
          Key: "Environment",
          Value: {
            Ref: "Environment",
          },
        },
        {
          Key: "System",
          Value: "Authentication",
        },
      ]);
    });

    it("should be associated with the api gateway", () => {
      expect(association.Properties.ResourceArn).toEqual({
        "Fn::Sub":
          "arn:${AWS::Partition}:apigateway:${AWS::Region}::/restapis/${AttestationProxyApi}/stages/${AttestationProxyApi.Stage}",
      });
    });
  });
});
