import { describe, it } from "vitest";
import { loadTemplateFromFile } from '../common/template'

const template = loadTemplateFromFile('./template.yaml')

describe("Set up the KMS Key for encrypting the Cognito WAF Log Group for GovUK app", () => {
  it("has a description of what the key does", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      Description: "KMS key for encrypting the Cognito WAF Log Group",
    });
  });
  it("has key rotation enabled", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      EnableKeyRotation: true,
    });
  });
  it("has a key policy for the CloudWatch Logs service to use the key for encrypting and decrypting log data, but only for resources in the same account and region.", () => {
    template.hasResourceProperties("AWS::KMS::Key", {
      KeyPolicy: {
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
      },
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
