import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Chat Lambda Log Group', () => {
  const resources = template.findResources('AWS::Logs::LogGroup');
  const resourceUnderTest = resources['ChatAuthorizerFunctionLogGroup'] as any;

  it('should exist', () => {
    expect(resourceUnderTest).toBeDefined();
  });

  it('should have a log group name for the authorizer lambda', () => {
    expect(resourceUnderTest.Properties.LogGroupName).toEqual({
      'Fn::Sub': '/aws/lambda/${AWS::StackName}-chat-proxy-authorizer-function',
    });
  });

  it('should have retention from SSM parameter', () => {
    expect(resourceUnderTest.Properties.RetentionInDays).toEqual({
      'Fn::Sub': '{{resolve:ssm:/${ConfigStackName}/log-retention/in-days}}',
    });
  });

  it('should be encrypted with KMS', () => {
    expect(resourceUnderTest.Properties.KmsKeyId).toEqual({
      'Fn::GetAtt': ['ChatLambdaLogGroupKMSKey', 'Arn'],
    });
  });

  it('should have data protection policy for email, ip and JWTs', () => {
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
          Sid: 'audit-policy',
          DataIdentifier: [
            'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
            'arn:aws:dataprotection::aws:data-identifier/IpAddress',
            'JWTTokens',
          ],
          Operation: {
            Audit: {
              FindingsDestination: {},
            },
          },
        },
        {
          Sid: 'masking-policy',
          DataIdentifier: [
            'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
            'arn:aws:dataprotection::aws:data-identifier/IpAddress',
            'JWTTokens',
          ],
          Operation: {
            Deidentify: {
              MaskConfig: {},
            },
          },
        },
      ],
    });
  });
});
