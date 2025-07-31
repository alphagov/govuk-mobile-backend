import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Shared Signals Health Check Function', () => {
  let sharedSignalsHealthFunction: {
    Type: any;
    Properties: any;
  };

  const functionResources = template.findResources('AWS::Serverless::Function');
  sharedSignalsHealthFunction = functionResources[
    'SharedSignalHealthCheckFunction'
  ] as any;

  it('should have a health check token url defined in the environment variables', () => {
    expect(
      sharedSignalsHealthFunction.Properties.Environment.Variables,
    ).containSubset({
      HEALTH_CHECK_TOKEN_URL: {
        'Fn::Sub':
          '{{resolve:ssm:/${ConfigStackName}/shared-signal/health-check-token-url}}',
      },
    });
  });

  it('should have a health check verify url defined in the environment variables', () => {
    expect(
      sharedSignalsHealthFunction.Properties.Environment.Variables,
    ).containSubset({
      HEALTH_CHECK_VERIFY_URL: {
        'Fn::Sub':
          '{{resolve:ssm:/${ConfigStackName}/shared-signal/health-check-verify-url}}',
      },
    });
  });

  it('should have a health check secret name defined in the environment variables', () => {
    expect(
      sharedSignalsHealthFunction.Properties.Environment.Variables,
    ).containSubset({
      HEALTH_CHECK_SECRET_NAME: {
        'Fn::Sub': '/${ConfigStackName}/shared-signal/health-check-secrets',
      },
    });
  });

  it('should have a schedule expression defined that runs the health check every 10 minutes with a retry policy of 2 attempts every 1 minute', () => {
    expect(sharedSignalsHealthFunction.Properties.Events).containSubset({
      EventBridgeEvent: {
        Type: 'ScheduleV2',
        Name: {
          'Fn::Sub':
            '${AWS::StackName}-shared-signal-health-check-event-bridge',
        },
        Properties: {
          Name: {
            'Fn::Sub': '${AWS::StackName}-shared-signal-health-check-event',
          },
          PermissionsBoundary: {
            'Fn::If': [
              'UsePermissionsBoundary',
              { Ref: 'PermissionsBoundary' },
              { Ref: 'AWS::NoValue' },
            ],
          },
          ScheduleExpression: 'rate(10 minutes)',
          RetryPolicy: {
            MaximumRetryAttempts: 2,
            MaximumEventAgeInSeconds: 60,
          },
        },
      },
    });
  });
});
