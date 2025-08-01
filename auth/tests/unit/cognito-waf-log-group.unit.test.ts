import { describe, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';

import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Set up the Cognito WAF Log Group for GovUK app', () => {
  it('has a data protection policy', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      DataProtectionPolicy: {
        Name: 'CloudWatchLogs-PersonalInformation-Protection',
        Description: 'Protect basic types of sensitive data',
        Version: '2021-06-01',
        Statement: [
          {
            Sid: 'audit-policy',
            DataIdentifier: [
              'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
              'JWTTokens',
            ],
          },
          {
            Sid: 'redact-policy',
            DataIdentifier: [
              'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
              'JWTTokens',
            ],
          },
        ],
      },
    });
  });
  it('has a log group class', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupClass: 'STANDARD',
    });
  });
  it('has a log group name with the required AWS prefix of aws-waf-logs', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: { 'Fn::Sub': 'aws-waf-logs-cognito-${AWS::StackName}' },
    });
  });
  it('has a retention policy of 30 days', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30,
    });
  });
  it('has the required tags', () => {
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
      Tags: [
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ],
    });
  });
});
