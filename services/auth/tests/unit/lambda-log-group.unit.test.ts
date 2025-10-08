import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

type Case = {
  logGroupLogicalId: string;
  logGroupName: string;
};

const cases: Case[] = [
  {
    logGroupLogicalId: 'AuthProxyFunctionLogGroup',
    logGroupName: 'auth-proxy',
  },
  {
    logGroupLogicalId: 'SharedSignalAuthorizerLogGroup',
    logGroupName: 'shared-signal-authorizer',
  },
  {
    logGroupLogicalId: 'SharedSignalReceiverFunctionLogGroup',
    logGroupName: 'shared-signal-receiver',
  },
  {
    logGroupLogicalId: 'RevokeRefreshTokenFunctionLogGroup',
    logGroupName: 'revoke-refresh-token',
  },
  {
    logGroupLogicalId: 'SharedSignalHealthCheckFunctionLogGroup',
    logGroupName: 'shared-signal-health-check',
  },
];

describe.each(cases)(
  '$logGroupLogicalId',
  ({ logGroupLogicalId, logGroupName }) => {
    const resources = template.findResources('AWS::Logs::LogGroup');
    const lg = resources[logGroupLogicalId] as any;

    it('should exist', () => {
      expect(lg).toBeDefined();
    });

    it('should point to the correct lambda log group name with function appended', () => {
      expect(lg.Properties.LogGroupName).toEqual({
        'Fn::Sub':
          '/aws/lambda/${AWS::StackName}-' + `${logGroupName}-function`,
      });
    });

    it('should use retention from SSM parameter', () => {
      expect(lg.Properties.RetentionInDays).toEqual({
        Ref: 'LogRetentionInDays',
      });
    });

    it('should be encrypted with KMS', () => {
      expect(lg.Properties.KmsKeyId).toEqual({
        'Fn::GetAtt': [`${logGroupLogicalId}KMSKey`, 'Arn'],
      });
    });

    it('should have data protection policy for email, ip and JWTs', () => {
      expect(lg.Properties.DataProtectionPolicy).toEqual({
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
  },
);
