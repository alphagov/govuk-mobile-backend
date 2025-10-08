import { describe, it, expect } from 'vitest';

import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Chat API Gateway WAF Log Group', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
    Condition: string;
  };

  const resource = template.findResources('AWS::Logs::LogGroup');
  resourceUnderTest = resource['ChatApiGatewayWafLogGroup'] as any;

  it('should have a log group name', () => {
    expect(resourceUnderTest.Properties.LogGroupName).toEqual({
      'Fn::Sub': 'aws-waf-logs-chat-proxy-${AWS::StackName}',
    });
  });

  it('should have a log group class set to STANDARD', () => {
    expect(resourceUnderTest.Properties.LogGroupClass).toEqual('STANDARD');
  });

  it('should be encrypted with KMS', () => {
    expect(resourceUnderTest.Properties.KmsKeyId).toEqual({
      'Fn::GetAtt': ['ChatApiGatewayWafLogGroupKMSKey', 'Arn'],
    });
  });

  it('should have a retention policy from SSM parameter', () => {
    expect(resourceUnderTest.Properties.RetentionInDays).toEqual({
      Ref: 'LogRetentionInDays',
    });
  });

  it('should have a data protection policy', () => {
    expect(resourceUnderTest.Properties.DataProtectionPolicy).toEqual({
      Name: 'CloudWatchLogs-PersonalInformation-Protection',
      Description: 'Protect basic types of sensitive data',
      Version: '2021-06-01',
      Configuration: {
        CustomDataIdentifier: [
          {
            Name: 'JWTTokens',
            Regex:
              'e[yw][A-Za-z0-9-_]+\\.(?:e[yw][A-Za-z0-9-_]+)?\\.[A-Za-z0-9-_]{2,}(?:(?:\\.[A-Za-z0-9-_]{2,}){2})?',
          },
        ],
      },
      Statement: [
        {
          DataIdentifier: ['JWTTokens'],
          Operation: {
            Audit: {
              FindingsDestination: {},
            },
          },
          Sid: 'audit-policy',
        },
        {
          DataIdentifier: ['JWTTokens'],
          Operation: {
            Deidentify: {
              MaskConfig: {},
            },
          },
          Sid: 'redact-policy',
        },
      ],
    });
  });

  it('should have the required tags', () => {
    expect(resourceUnderTest.Properties.Tags).toEqual([
      {
        Key: 'Product',
        Value: 'GOV.UK',
      },
      {
        Key: 'Environment',
        Value: {
          Ref: 'Environment',
        },
      },
      {
        Key: 'System',
        Value: 'Chat',
      },
    ]);
  });
});

describe('Chat API Gateway WAF Log Group KMS Key', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::KMS::Key');
  resourceUnderTest = resource['ChatApiGatewayWafLogGroupKMSKey'] as any;

  it('should have a description', () => {
    expect(resourceUnderTest.Properties.Description).toEqual(
      'KMS key for encrypting the Chat API Gateway WAF Log Group',
    );
  });

  it('should have key rotation enabled', () => {
    expect(resourceUnderTest.Properties.EnableKeyRotation).toEqual(true);
  });

  it('should have a key policy', () => {
    expect(resourceUnderTest.Properties.KeyPolicy).toBeDefined();
  });

  it('should have a key policy with the required permissions', () => {
    expect(resourceUnderTest.Properties.KeyPolicy.Statement).toEqual([
      {
        Effect: 'Allow',
        Principal: {
          AWS: { 'Fn::Sub': 'arn:aws:iam::${AWS::AccountId}:root' },
        },
        Action: ['kms:*'],
        Resource: ['*'],
      },
      {
        Effect: 'Allow',
        Principal: {
          Service: {
            'Fn::Sub': 'logs.${AWS::Region}.amazonaws.com',
          },
        },
        Action: [
          'kms:Encrypt*',
          'kms:Decrypt*',
          'kms:ReEncrypt*',
          'kms:GenerateDataKey*',
          'kms:Describe*',
        ],
        Resource: ['*'],
        Condition: {
          ArnLike: {
            'kms:EncryptionContext:aws:logs:arn': {
              'Fn::Sub': 'arn:aws:logs:${AWS::Region}:${AWS::AccountId}:*',
            },
          },
        },
      },
    ]);
  });

  it('should have the required tags', () => {
    expect(resourceUnderTest.Properties.Tags).toEqual([
      {
        Key: 'Product',
        Value: 'GOV.UK',
      },
      {
        Key: 'Environment',
        Value: {
          Ref: 'Environment',
        },
      },
      {
        Key: 'System',
        Value: 'Chat',
      },
    ]);
  });
});
