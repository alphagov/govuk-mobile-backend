import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('attestation', () => {
  describe('auth proxy function', () => {
    const lambda = template.findResources('AWS::Serverless::Function')[
      'AuthProxyFunction'
    ] as any;
    it('should only have an oauth token endpoint', () => {
      expect(lambda.Properties.Events.ApiEvent.Properties.Path).toBe(
        '/oauth2/token',
      );
      expect(lambda.Properties.Events.ApiEvent.Properties.Method).toBe('post');
    });
    it('contains a reference to the cognito secret name', () => {
      expect(lambda.Properties.Environment.Variables).containSubset({
        COGNITO_SECRET_NAME: {
          'Fn::Sub': '/${ConfigStackName}/cognito/client-secret',
        },
      });
    });

    it('contains a reference cognito custom domain config name', () => {
      expect(lambda.Properties.Environment.Variables).containSubset({
        COGNITO_CUSTOM_DOMAIN_SSM_NAME: {
          'Fn::Sub': '/${ConfigStackName}/cognito/custom-domain',
        },
      });
    });

    it('contains a reference to AWS region', () => {
      expect(lambda.Properties.Environment.Variables).containSubset({
        REGION: {
          Ref: 'AWS::Region',
        },
      });
    });
  });
});

describe('auth proxy function iam role', () => {
  const role = template.findResources('AWS::IAM::Role')[
    'AuthProxyFunctionIAMRole'
  ] as any;
  it('should have the correct trust policy', () => {
    expect(role.Properties.AssumeRolePolicyDocument).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
          Action: 'sts:AssumeRole',
        },
      ],
    });
  });
  it('should have permissions to access the cognito client secret', () => {
    expect(role.Properties.Policies).toContainEqual(
      expect.objectContaining({
        PolicyName: 'AuthProxyFunctionPolicy',
        PolicyDocument: expect.objectContaining({
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Effect: 'Allow',
              Action: ['secretsmanager:GetSecretValue'],
              Resource: {
                'Fn::Sub':
                  'arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:/${ConfigStackName}/cognito/client-secret-*',
              },
            }),
          ]),
        }),
      }),
    );
  });

  it('should have permissions to get the cognito domain from parameter store', () => {
    expect(role.Properties.Policies).toContainEqual(
      expect.objectContaining({
        PolicyName: 'AuthProxyFunctionPolicy',
        PolicyDocument: expect.objectContaining({
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Action: ['ssm:GetParameter'],
              Effect: 'Allow',
              Resource: [
                {
                  'Fn::Sub':
                    'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${ConfigStackName}/cognito/custom-domain',
                },
                {
                  'Fn::Sub':
                    'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/${ConfigStackName}/feature-flags/attestation',
                },
              ],
            }),
          ]),
        }),
      }),
    );
  });

  it('should have permissions to write to its own cloud watch logs only', () => {
    expect(role.Properties.Policies).toContainEqual(
      expect.objectContaining({
        PolicyName: 'AuthProxyFunctionPolicy',
        PolicyDocument: expect.objectContaining({
          Statement: expect.arrayContaining([
            expect.objectContaining({
              Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Sub':
                  'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}-auth-proxy-function:*',
              },
            }),
          ]),
        }),
      }),
    );
  });

  it('should have the correct tags', () => {
    expect(role.Properties.Tags).toEqual([
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
});

describe('api gateway', () => {
  it('should provision an auth proxy api gateway', () => {
    template.hasResourceProperties('AWS::Serverless::Api', {
      Name: {
        'Fn::Join': [
          '-',
          [
            {
              Ref: 'AWS::StackName',
            },
            'auth-proxy',
            {
              'Fn::Select': [
                4,
                {
                  'Fn::Split': [
                    '-',
                    {
                      'Fn::Select': [
                        2,
                        {
                          'Fn::Split': [
                            '/',
                            {
                              Ref: 'AWS::StackId',
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

describe('waf', () => {
  const authProxyWaf = template.findResources('AWS::WAFv2::WebACL')[
    'AuthProxyWaf'
  ] as any;
  const association = template.findResources('AWS::WAFv2::WebACLAssociation')[
    'AuthProxyWafAssociation'
  ] as any;

  it('should allow all requests that are not match', () => {
    expect(authProxyWaf.Properties.DefaultAction).toEqual({
      Allow: {},
    });
  });

  it('should have a regional scope', () => {
    expect(authProxyWaf.Properties.Scope).toEqual('REGIONAL');
  });

  it('should have the required tags', () => {
    expect(authProxyWaf.Properties.Tags).toEqual([
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
    expect(association.Properties.ResourceArn).toEqual({
      'Fn::Sub':
        'arn:${AWS::Partition}:apigateway:${AWS::Region}::/restapis/${AttestationProxyApi}/stages/${AttestationProxyApi.Stage}',
    });
  });

  describe('log group', () => {
    const logGroup = template.findResources('AWS::Logs::LogGroup')[
      'AuthProxyWafLogGroup'
    ] as any;

    it('has a log group class', () => {
      expect(logGroup.Properties.LogGroupClass).toEqual('STANDARD');
    });

    it('has a log group name with the required AWS prefix of aws-waf-logs', () => {
      expect(logGroup.Properties.LogGroupName).toEqual({
        'Fn::Sub': 'aws-waf-logs-attestation-${AWS::StackName}',
      });
    });

    it('has a retention policy of 30 days', () => {
      expect(logGroup.Properties.RetentionInDays).toEqual({
        'Fn::Sub': '{{resolve:ssm:/${ConfigStackName}/log-retention/in-days}}',
      });
    });

    it('has the required tags', () => {
      expect(logGroup.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });
  });

  describe('alarms', () => {
    it('should send alerts to slack and pager duty', () => {
      const topic = template.findResources('AWS::SNS::Subscription')[
        'CloudWatchAlarmTopicSubscriptionPagerDuty'
      ];
      expect(topic.Properties.TopicArn).toEqual({
        Ref: 'CloudWatchAlarmTopicPagerDuty', // pragma: allowlist-secret
      });
    });

    it(`should alert if the percentage of lambda invocation errors is 
      greater than or equal 10% per minute for at least 10 invocations`, () => {
      const lambdaErrorRateAlarm = template.findResources(
        'AWS::CloudWatch::Alarm',
      )['AttestationLambdaErrorRateAlarm'];

      // atleast 10 invocations
      expect(lambdaErrorRateAlarm.Properties.Metrics[3].Expression).toBe(
        'IF(lambdaInvocations>=10, lambdaErrorPercentage)',
      );

      expect(lambdaErrorRateAlarm.Properties.Threshold).toBe(10);
      expect(lambdaErrorRateAlarm.Properties.ComparisonOperator).toBe(
        'GreaterThanOrEqualToThreshold',
      );
    });

    it(`should alert if the percentage of successful attestation completions 
      drops to 75% or lower for at least 50 attempts in a minute`, () => {
      const lambdaErrorRateAlarm = template.findResources(
        'AWS::CloudWatch::Alarm',
      )['AttestationLowCompletionAlarm'];

      // atleast 50 attempts
      expect(lambdaErrorRateAlarm.Properties.Metrics[3].Expression).toBe(
        'IF(lambdaLogStarted>=50, lambdaLogCompletePercentage)',
      );

      expect(lambdaErrorRateAlarm.Properties.Threshold).toBe(75);
      expect(lambdaErrorRateAlarm.Properties.ComparisonOperator).toBe(
        'LessThanOrEqualToThreshold',
      );
    });

    it(`should alert if there is an anomaly in the proportion of 200 responses 
      from the /oauth2/token endpoint`, () => {
      const lambdaErrorRateAlarm = template.findResources(
        'AWS::CloudWatch::Alarm',
      )['AttestationLow200ResponseProportionAlarm'];

      // detects anomalies with a standard deviation of 2
      expect(lambdaErrorRateAlarm.Properties.Metrics[3].Expression).toBe(
        'ANOMALY_DETECTION_BAND(m3, 2)',
      );
      expect(lambdaErrorRateAlarm.Properties.ComparisonOperator).toBe(
        'LessThanLowerThreshold',
      );
    });

    it('the low proportion alarm should be toggled from a parameter', () => {
      const lambdaErrorRateAlarm = template.findResources(
        'AWS::CloudWatch::Alarm',
      )['AttestationLow200ResponseProportionAlarm'];
      expect(lambdaErrorRateAlarm.Properties.ActionsEnabled).toEqual(false);
    });
  });
});
