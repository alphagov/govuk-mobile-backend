import { describe, expect, it } from "vitest";
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

describe('shared signals', () => {
    it('should provision an api gateway', () => {
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
            }
        })
    })

    it('should have a receiver endpoint', () => {
        template.hasResourceProperties("AWS::Serverless::Function", {
            Events: {
                HelloWorldApi: {
                    Properties: {
                        Path: "/receiver"
                    }
                }
            },
            FunctionName: {
                "Fn::Join": [
                    "-",
                    [
                        {
                            Ref: "AWS::StackName",
                        },
                        "shared-signals-receiver",
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
            }
        })
    })

    describe('waf', () => {
        const sharedSignalsWaf = template.findResources("AWS::WAFv2::WebACL")["SharedSignalsGatewayWebApplicationFirewall"] as any;
        const association = template.findResources("AWS::WAFv2::WebACLAssociation")["SharedSignalsApiGatewayWAFAssociation"] as any;

        it('should enforce a rate limit of 6000 requests per minute', () => {
            const rateLimitRule = sharedSignalsWaf.Properties.Rules.find((rule: any) => rule.Name === "RateLimitRule");
            const rateLimit = rateLimitRule.Statement.RateBasedStatement.Limit;
            const rateLimitPeriod = rateLimitRule.Statement.RateBasedStatement.EvaluationWindowSec;

            expect(rateLimit).toBe(6000);
            expect(rateLimitPeriod).toBe(60);
        });

        it("should block all requests that dont match", () => {
            expect(sharedSignalsWaf.Properties.DefaultAction).toEqual({
                Allow: {}
            });
        });

        it('should have a regional scope', () => {
            expect(sharedSignalsWaf.Properties.Scope).toEqual("REGIONAL");
        });

        it('should have the required tags', () => {
            expect(sharedSignalsWaf.Properties.Tags).toEqual([
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

        it('should be associated with the api gateway', () => {
            expect(association.Properties.ResourceArn).toEqual({
                "Fn::Sub": "arn:${AWS::Partition}:apigateway:${AWS::Region}::/restapis/${SharedSignalsApi}/stages/${SharedSignalsApi.Stage}",
            });
        });

        describe('logging', () => {
            const wafLogGroup = template.findResources("AWS::Logs::LogGroup")["SharedSignalsWAFLogGroup"] as any;

            it("has a data protection policy", () => {
                expect(wafLogGroup.Properties.DataProtectionPolicy).toEqual({
                    "Description": "Protect basic types of sensitive data",
                    "Name": "CloudWatchLogs-PersonalInformation-Protection",
                    "Statement": [
                        {
                            "DataIdentifier": [
                                "arn:aws:dataprotection::aws:data-identifier/EmailAddress",
                            ],
                            "Operation": {
                                "Audit": {
                                    "FindingsDestination": {},
                                },
                            },
                            "Sid": "audit-policy",
                        },
                        {
                            "DataIdentifier": [
                                "arn:aws:dataprotection::aws:data-identifier/EmailAddress",
                            ],
                            "Operation": {
                                "Deidentify": {
                                    "MaskConfig": {},
                                },
                            },
                            "Sid": "redact-policy",
                        },
                    ],
                    "Version": "2021-06-01",
                });
            });

            it("has a log group name with the required shared signals prefix", () => {
                expect(wafLogGroup.Properties.LogGroupName).toEqual({
                    "Fn::Sub": "aws-waf-logs-shared-signals-${AWS::StackName}",
                });
            });

            it("has a retention policy of 30 days", () => {
                expect(wafLogGroup.Properties.RetentionInDays).toEqual(30);
            });

            it("has the required tags", () => {
                expect(wafLogGroup.Properties.Tags).toEqual([
                    { Key: "Product", Value: "GOV.UK" },
                    { Key: "Environment", Value: { Ref: "Environment" } },
                    { Key: "System", Value: "Authentication" },
                ]);
            });

            it("has an association with the waf", () => {
                template.hasResourceProperties("AWS::WAFv2::LoggingConfiguration", {
                    LogDestinationConfigs: [{ "Fn::GetAtt": ["SharedSignalsWAFLogGroup", "Arn"] }],
                });
            });

            describe("kms key", () => {
                const kmsKey = template.findResources("AWS::KMS::Key")["SharedSignalsWAFLogGroupKMSKey"] as any;

                it("has a description of what the key does", () => {
                    expect(kmsKey.Properties.Description).toEqual("KMS key for encrypting the SharedSignals WAF Log Group");
                });

                it("has key rotation enabled", () => {
                    expect(kmsKey.Properties.EnableKeyRotation).toEqual(true);
                });

                it("has a key policy for the CloudWatch Logs service to use the key for encrypting and decrypting log data, but only for resources in the same account and region.", () => {
                    expect(kmsKey.Properties.KeyPolicy).toEqual({
                        Version: "2012-10-17",
                        Statement: [
                            {
                                Effect: "Allow",
                                Principal: {
                                    AWS: { "Fn::Sub": "arn:aws:iam::${AWS::AccountId}:root" },
                                },
                                Action: ["kms:*"],
                                Resource: ["*"],
                            },
                            {
                                Effect: "Allow",
                                Principal: {
                                    Service: { "Fn::Sub": "logs.${AWS::Region}.amazonaws.com" },
                                },
                                Action: [
                                    "kms:Encrypt*",
                                    "kms:Decrypt*",
                                    "kms:ReEncrypt*",
                                    "kms:GenerateDataKey*",
                                    "kms:Describe*",
                                ],
                                Resource: ["*"],
                                Condition: {
                                    ArnLike: {
                                        "kms:EncryptionContext:aws:logs:arn": {
                                            "Fn::Sub": "arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*",
                                        },
                                    },
                                },
                            },
                        ],
                    })
                });

                it("has the required tags", () => {
                    expect(kmsKey.Properties.Tags).toEqual([
                        { Key: "Product", Value: "GOV.UK" },
                        { Key: "Environment", Value: { Ref: "Environment" } },
                        { Key: "System", Value: "Authentication" },
                    ]);
                });
            })
        })
    })
})