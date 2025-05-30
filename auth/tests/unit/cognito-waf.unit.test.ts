import { describe, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Set up the Web ACL Association for Cognito for GovUK app", () => {
  it("has a name that includes the stack name", () => {
    template.hasResourceProperties("AWS::WAFv2::WebACL", {
      Name: {
        "Fn::Join": [
          "-",
          [
            {
              Ref: "AWS::StackName",
            },
            "waf-cognito",
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
              "waf-cognito-acl-rules",
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
        {
          Name: "AWSManagedRulesKnownBadInputsRuleSet",
          Priority: 2,
          Statement: {
            ManagedRuleGroupStatement: {
              VendorName: "AWS",
              Name: "AWSManagedRulesKnownBadInputsRuleSet",
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
                  "aws-managed-rules-known-bad-inputs-rule-set",
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
