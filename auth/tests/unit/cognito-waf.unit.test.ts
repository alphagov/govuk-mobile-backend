import { Template } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll, expect } from "vitest";
import { readFileSync } from "fs";
import { load } from "js-yaml";

let template: Template;

describe("Set up the Web ACL Association for Cognito for GovUK app", () => {
  beforeAll(() => {
    const yamltemplate: string = load(readFileSync("template.yaml", "utf-8"), {
      schema: schema,
    });
    template = Template.fromJSON(yamltemplate);
  });
  it("has a name that includes the stack name", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Name: {
        "Fn::Join": [
          "-",
          [
            {
              Ref: "AWS::StackName",
            },
            "waf",
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
  it("has a description", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Description: "Web Application Firewall for Cognito User Pool",
    });
  });
  it("has an empty default action", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      DefaultAction: {},
    });
  });
  it("has a regional scope", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Scope: "REGIONAL",
    });
  });
  it("has a visibility config", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      VisibilityConfig: {
        CloudWatchMetricsEnabled: true,
        MetricName: {
          "Fn::Join": [
            "-",
            [
              {
                Ref: "AWS::StackName",
              },
              "waf-acl-rules",
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
        SampledRequestsEnabled: true,
      },
    });
  });
  it("has a rate limit rule", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Rules: [
        {
          Name: "RateLimitRule",
          Priority: 1,
          Statement: {
            RateBasedStatement: {
              AggregateKeyType: "IP",
              Limit: 300,
            },
          },
          VisibilityConfig: {
            CloudWatchMetricsEnabled: true,
            MetricName: {
              "Fn::Join": [
                "-",
                [
                  {
                    Ref: "AWS::StackName",
                  },
                  "rate-limit-rule",
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
            SampledRequestsEnabled: true,
          },
        },
      ],
    });
  });
  it("has the required tags", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Tags: [
        { Key: "Product", Value: "GOV.UK" },
        { Key: "Environment", Value: { Ref: "Environment" } },
        { Key: "System", Value: "Authentication" },
      ],
    });
  });
});
