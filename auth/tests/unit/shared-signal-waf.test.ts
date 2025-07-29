import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path, { join } from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Shared Signal WAF', () => {
  const sharedSignalWaf = template.findResources('AWS::WAFv2::WebACL')[
    'SharedSignalWAF'
  ] as any;
  const sharedSignalAssociation = template.findResources(
    'AWS::WAFv2::WebACLAssociation',
  )['SharedSignalWafAssociation'] as any;

  it('should have the correct WAF visibility configuration', () => {
    const VisibilityConfig = sharedSignalWaf.Properties.VisibilityConfig;
    expect(VisibilityConfig.CloudWatchMetricsEnabled).toBe(true);
    expect(VisibilityConfig.MetricName).toEqual({
      'Fn::Join': [
        '-',
        [
          'SharedSignalWAFMetric',
          {
            'Fn::Sub': '${AWS::StackName}',
          },
        ],
      ],
    });
    expect(VisibilityConfig.SampledRequestsEnabled).toBe(true);
  });

  it('should have the correct WAF rules', () => {
    const rules = sharedSignalWaf.Properties.Rules;
    expect(rules).toHaveLength(3); // 3 rules configured
    expect(rules[0].Name).toEqual('SharedSignalThrottlingRule');
    expect(rules[1].Name).toEqual('SharedSignalWAFIPAddressesRule');
    expect(rules[2].Name).toEqual('SharedSignalAWSManagedBadInputsRuleSet');
  });

  it('should have correct WAF throttling rule configuration', () => {
    const rateLimitRule = sharedSignalWaf.Properties.Rules.find(
      (rule: any) => rule.Name === 'SharedSignalThrottlingRule',
    );
    const rateLimit = rateLimitRule.Statement.RateBasedStatement.Limit;
    const rateLimitPeriod =
      rateLimitRule.Statement.RateBasedStatement.EvaluationWindowSec;
    const throttlingRuleVisibilityConfig = rateLimitRule.VisibilityConfig;

    expect(rateLimit).toBe(100);
    expect(rateLimitPeriod).toBe(60); //in seconds

    expect(throttlingRuleVisibilityConfig.CloudWatchMetricsEnabled).toBe(true);
    expect(throttlingRuleVisibilityConfig.MetricName).toEqual({
      'Fn::Join': [
        '-',
        [
          'SharedSignalWAFMetricRule',
          {
            'Fn::Sub': '${AWS::StackName}',
          },
        ],
      ],
    });
    expect(throttlingRuleVisibilityConfig.SampledRequestsEnabled).toBe(true);
  });

  it('should have the correct WAF scope', () => {
    expect(sharedSignalWaf.Properties.Scope).toEqual('REGIONAL');
  });
  it('should have the required tags', () => {
    expect(sharedSignalWaf.Properties.Tags).toEqual([
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
        Value: 'Authentication',
      },
    ]);
  });

  it('should be associated with the api gateway', () => {
    expect(sharedSignalAssociation.Properties.ResourceArn).toEqual({
      'Fn::Sub':
        'arn:${AWS::Partition}:apigateway:${AWS::Region}::/restapis/${SharedSignalsApi}/stages/${SharedSignalsApi.Stage}',
    });
  });
});

describe('Shared Signal WAF logging', () => {
  const wafLogGroup = template.findResources('AWS::Logs::LogGroup')[
    'SharedSignalWafLogGroup'
  ] as any;

  it('has a data protection policy', () => {
    const dataProtectionPolicy = wafLogGroup.Properties.DataProtectionPolicy;
    expect(dataProtectionPolicy).toBeDefined();

    const statements = dataProtectionPolicy.Statement;
    expect(dataProtectionPolicy.Version).toEqual('2021-06-01');
    expect(statements).toHaveLength(2);

    //Contains Audit policy for EmailAddress and IpAddress
    expect(statements[0].Sid).toEqual('audit-policy');
    expect(statements[0].DataIdentifier).toContain(
      'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
    );
    expect(statements[0].DataIdentifier).toContain('IPAddresses');
    expect(statements[0].DataIdentifier).toContain('JWTTokens');
    expect(statements[0].Operation.Audit).toBeDefined();

    //Contains Redact policy for EmailAddress and IpAddress
    expect(statements[1].Sid).toEqual('redact-policy');
    expect(statements[1].DataIdentifier).toContain(
      'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
    );
    expect(statements[1].DataIdentifier).toContain('IPAddresses');
    expect(statements[1].DataIdentifier).toContain('JWTTokens');
  });

  it('has a log group name with the required shared signals prefix', () => {
    expect(wafLogGroup.Properties.LogGroupName).toEqual({
      'Fn::Sub': 'aws-waf-logs-shared-signal-${AWS::StackName}',
    });
  });

  it('has a retention policy of 30 days', () => {
    expect(wafLogGroup.Properties.RetentionInDays).toEqual(30);
  });

  it('has the required tags', () => {
    expect(wafLogGroup.Properties.Tags).toEqual([
      { Key: 'Product', Value: 'GOV.UK' },
      { Key: 'Environment', Value: { Ref: 'Environment' } },
      { Key: 'System', Value: 'Authentication' },
    ]);
  });

  it('has an association with the waf', () => {
    const wafAssociation = template.findResources(
      'AWS::WAFv2::LoggingConfiguration',
    )['SharedSignalWAFLoggingConfiguration'];
    expect(wafAssociation).toBeDefined();
    // correctly associates the WAF with the log group
    expect(wafAssociation.Properties.ResourceArn).toEqual({
      'Fn::GetAtt': ['SharedSignalWAF', 'Arn'],
    });
    // correctly sets the log destination to the log group
    expect(wafAssociation.Properties.LogDestinationConfigs).toEqual([
      { 'Fn::GetAtt': ['SharedSignalWafLogGroup', 'Arn'] },
    ]);
  });

  it('has a KMS key for encryption', () => {
    expect(wafLogGroup.Properties.KmsKeyId).toBeDefined();
    wafLogGroup.Properties.KmsKeyId = {
      'Fn::GetAtt': ['SharedSignalWafLogGroupKMSKey', 'Arn'],
    };
  });

  describe('KMS key association', () => {
    const kmsKey = template.findResources('AWS::KMS::Key')[
      'SharedSignalWafLogGroupKMSKey'
    ] as any;

    it('has key rotation enabled', () => {
      expect(kmsKey.Properties.EnableKeyRotation).toEqual(true);
    });

    it('has a key policy for the CloudWatch Logs service to use the key for encrypting and decrypting log data, but only for resources in the same account and region.', () => {
      expect(kmsKey.Properties.KeyPolicy).toEqual({
        Version: '2012-10-17',
        Statement: [
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
              Service: { 'Fn::Sub': 'logs.${AWS::Region}.amazonaws.com' },
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
        ],
      });
    });

    it('has the required tags', () => {
      expect(kmsKey.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });
  });
});
