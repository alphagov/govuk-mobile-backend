import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';

const template = loadTemplateFromFile('./template.yaml');

describe('shared signal', () => {
  it('should provision an api gateway', () => {
    template.hasResourceProperties('AWS::Serverless::Api', {
      Name: {
        'Fn::Sub': '${AWS::StackName}-shared-signal',
      },
    });
  });

  it('should have a receiver endpoint', () => {
    template.hasResourceProperties('AWS::Serverless::Function', {
      Events: {
        HelloWorldApi: {
          Properties: {
            Path: '/receiver',
          },
        },
      },
      FunctionName: {
        'Fn::Sub': '${AWS::StackName}-shared-signal-receiver',
      },
    });
  });

  it('should have authorizer associated', () => {
    let resourceUnderTest: {
      Type: any;
      Properties: any;
    };
    const resources = template.findResources('AWS::Serverless::Api');
    resourceUnderTest = resources['SharedSignalApi'] as any;

    expect(resourceUnderTest.Properties.Auth.DefaultAuthorizer).toBe(
      'SharedSignalAuthorizer',
    );
  });

  it('should have a shared signal authorizer lambda', () => {
    let resourceUnderTest: {
      Type: any;
      Properties: any;
    };
    const resources = template.findResources('AWS::Serverless::Function');
    resourceUnderTest = resources['SharedSignalAuthorizer'] as any;

    expect(resourceUnderTest.Type).toBeDefined();
  });

  it('SharedSignalReceiverFunctionIAMRole should have correct properties', () => {
    let resourceUnderTest: {
      Type: any;
      Properties: any;
      Condition?: any;
    };
    const resources = template.findResources('AWS::IAM::Role');
    resourceUnderTest = resources['SharedSignalReceiverFunctionIAMRole'] as any;

    expect(resourceUnderTest.Type).toBe('AWS::IAM::Role');
    expect(resourceUnderTest.Condition).toBe('IsNotProduction');
    expect(resourceUnderTest.Properties.RoleName).toEqual({
      'Fn::Sub': '${AWS::StackName}-shared-signal-receiver-role',
    });

    // Check AssumeRolePolicyDocument
    expect(resourceUnderTest.Properties.AssumeRolePolicyDocument).toMatchObject(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { Service: 'lambda.amazonaws.com' },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    );

    // Check Policies
    const policies = resourceUnderTest.Properties.Policies;
    expect(Array.isArray(policies)).toBe(true);
    expect(policies[0].PolicyName).toBe('SharedSignalReceiverFunctionPolicy');
    expect(policies[0].PolicyDocument.Version).toBe('2012-10-17');
    const statements = policies[0].PolicyDocument.Statement;
    expect(statements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          Effect: 'Allow',
          Action: expect.arrayContaining([
            'logs:CreateLogGroup',
            'logs:CreateLogStream',
            'logs:PutLogEvents',
          ]),
          Resource: {
            'Fn::Sub':
              'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}-shared-signal-receiver:*',
          },
        }),
        expect.objectContaining({
          Effect: 'Allow',
          Action: expect.arrayContaining([
            'cognito-idp:AdminUserGlobalSignOut',
            'cognito-idp:AdminDeleteUser',
            'cognito-idp:AdminUpdateUserAttributes',
          ]),
          Resource: { 'Fn::GetAtt': ['CognitoUserPool', 'Arn'] },
        }),
      ]),
    );

    // Check PermissionsBoundary
    expect(resourceUnderTest.Properties.PermissionsBoundary).toEqual({
      'Fn::If': [
        'UsePermissionsBoundary',
        { Ref: 'PermissionsBoundary' },
        { Ref: 'AWS::NoValue' },
      ],
    });

    // Check Tags
    expect(resourceUnderTest.Properties.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]),
    );
  });

  it('SharedSignalReceiverFunctionKMSKey should have correct properties', () => {
    let resourceUnderTest: {
      Type: any;
      Properties: any;
    };
    const resources = template.findResources('AWS::KMS::Key');
    resourceUnderTest = resources['SharedSignalReceiverFunctionKMSKey'] as any;

    expect(resourceUnderTest.Type).toBe('AWS::KMS::Key');
    expect(resourceUnderTest.Properties.Description).toBe(
      'KMS key for encrypting shared signal receiver function secrets',
    );
    expect(resourceUnderTest.Properties.EnableKeyRotation).toBe(true);

    // Check KeyPolicy
    expect(resourceUnderTest.Properties.KeyPolicy).toMatchObject({
      Version: '2012-10-17',
      Statement: expect.arrayContaining([
        expect.objectContaining({
          Effect: 'Allow',
          Principal: {
            AWS: {
              'Fn::Sub': 'arn:aws:iam::${AWS::AccountId}:root',
            },
          },
          Action: expect.arrayContaining(['kms:*']),
          Resource: expect.arrayContaining(['*']),
        }),
        expect.objectContaining({
          Effect: 'Allow',
          Principal: {
            Service: {
              'Fn::Sub': 'lambda.amazonaws.com',
            },
          },
          Action: expect.arrayContaining(['kms:Encrypt*', 'kms:Decrypt*']),
          Resource: expect.arrayContaining(['*']),
        }),
      ]),
    });

    // Check Tags
    expect(resourceUnderTest.Properties.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]),
    );
  });
});
