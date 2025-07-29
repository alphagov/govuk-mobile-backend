import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';

import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Set up the Post Authentication Lambda IAM Role for GovUK app', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::IAM::Role');
  resourceUnderTest = resource['PostAuthenticationFunctionIAMRole'] as any; // find Post Authentication Lambda IAM Role

  it('should have type of IAM Role', () => {
    expect(resourceUnderTest.Type).equal('AWS::IAM::Role');
  });
  it('should have a role name that includes the stack name', () => {
    expect(resourceUnderTest.Properties.RoleName).toEqual({
      'Fn::Sub': '${AWS::StackName}-post-authentication-role',
    });
  });
  it('should have a trust policy for the lambda service', () => {
    expect(resourceUnderTest.Properties.AssumeRolePolicyDocument).toEqual({
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
  it('should have a policy that allows the lambda function to write logs', () => {
    expect(resourceUnderTest.Properties.Policies).toEqual([
      {
        PolicyDocument: {
          Statement: [
            {
              Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              Effect: 'Allow',
              Resource: {
                'Fn::Sub':
                  'arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/${AWS::StackName}-post-authentication:*',
              },
            },
          ],
          Version: '2012-10-17',
        },
        PolicyName: 'PostAuthenticationFunctionPolicy',
      },
    ]);
  });
  it('should have a permissions boundary', () => {
    expect(resourceUnderTest.Properties.PermissionsBoundary).toEqual({
      'Fn::If': [
        'UsePermissionsBoundary',
        {
          Ref: 'PermissionsBoundary',
        },
        {
          Ref: 'AWS::NoValue',
        },
      ],
    });
  });
  it('has the required tags', () => {
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
        Value: 'Authentication',
      },
    ]);
  });
});

describe('Set up the Post Authentication Lambda Invoke Permissions for GovUK app', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::Lambda::Permission');
  resourceUnderTest = resource['PostAuthLambdaInvokePermission'] as any; // find Post Authentication Lambda function

  it('should have type of lambda permission', () => {
    expect(resourceUnderTest.Type).equal('AWS::Lambda::Permission');
  });

  it('should refer to the post authentication function', () => {
    expect(resourceUnderTest.Properties.FunctionName).toEqual({
      Ref: 'PostAuthenticationFunction',
    });
  });

  it('should have a lambda invoke action', () => {
    expect(resourceUnderTest.Properties.Action).toEqual(
      'lambda:InvokeFunction',
    );
  });

  it('should have a principal for the cognito idp', () => {
    expect(resourceUnderTest.Properties.Principal).toEqual(
      'cognito-idp.amazonaws.com',
    );
  });

  it('should have a source arn relating to the post authentication function', () => {
    expect(resourceUnderTest.Properties.SourceArn).toEqual({
      'Fn::GetAtt': ['CognitoUserPool', 'Arn'],
    });
  });
});
