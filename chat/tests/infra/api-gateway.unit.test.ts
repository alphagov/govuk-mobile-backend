import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Chat API Gateway', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::ApiGateway::RestApi');
  resourceUnderTest = resource['ChatApiGateway'] as any;

  it('should have a name that includes the stack name', () => {
    expect(resourceUnderTest.Properties.Name).toEqual({
      'Fn::Sub': '${AWS::StackName}-chat-proxy',
    });
  });

  it('should have associated tags', () => {
    expect(resourceUnderTest.Properties.Tags).toEqual([
      {
        Key: 'Product',
        Value: 'GOV.UK',
      },
      {
        Key: 'Environment',
        Value: { Ref: 'Environment' },
      },
      {
        Key: 'System',
        Value: 'Chat',
      },
    ]);
  });
});

describe('Chat API Gateway Resource', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::ApiGateway::Resource');
  resourceUnderTest = resource['ChatApiGatewayResource'] as any;

  it('should have a parent resource', () => {
    expect(resourceUnderTest.Properties.ParentId).toEqual({
      'Fn::GetAtt': ['ChatApiGateway', 'RootResourceId'],
    });
  });

  it('should have a path part that includes the proxy', () => {
    expect(resourceUnderTest.Properties.PathPart).toEqual('{proxy+}');
  });

  it('should have a REST API ID that matches the Chat API Gateway', () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: 'ChatApiGateway',
    });
  });
});

describe('Chat API Gateway Method', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::ApiGateway::Method');
  resourceUnderTest = resource['ChatApiGatewayMethod'] as any;

  it('should have a method that allows ANY HTTP method', () => {
    expect(resourceUnderTest.Properties.HttpMethod).toEqual('ANY');
  });
  it('should have a resource ID that matches the Chat API Gateway Resource', () => {
    expect(resourceUnderTest.Properties.ResourceId).toEqual({
      Ref: 'ChatApiGatewayResource',
    });
  });
  it('should have a REST API ID that matches the Chat API Gateway', () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: 'ChatApiGateway',
    });
  });
  it('should have an authorization type of CUSTOM', () => {
    expect(resourceUnderTest.Properties.AuthorizationType).toEqual('CUSTOM');
  });
  it('should have an authorizer ID that matches the Chat API Gateway Authorizer', () => {
    expect(resourceUnderTest.Properties.AuthorizerId).toEqual({
      Ref: 'ChatApiGatewayAuthorizer',
    });
  });
  it('should have request parameters for the proxy path', () => {
    expect(resourceUnderTest.Properties.RequestParameters).toEqual({
      'method.request.path.proxy': true,
    });
  });
  it('should have an integration type of HTTP_PROXY', () => {
    expect(resourceUnderTest.Properties.Integration.Type).toEqual('HTTP_PROXY');
  });
  it('should have an integration HTTP method of ANY', () => {
    expect(
      resourceUnderTest.Properties.Integration.IntegrationHttpMethod,
    ).toEqual('ANY');
  });
  it('should have an integration URI that points to the Chat URL via SSM', () => {
    expect(resourceUnderTest.Properties.Integration.Uri).toEqual({
      'Fn::Sub': [
        '{{resolve:ssm:/${ConfigStackName}/chat/api-url}}/${proxy}',
        {
          proxy: '{proxy}',
        },
      ],
    });
  });
  it('should have request parameters for the proxy path, bearer token, and user ID', () => {
    expect(resourceUnderTest.Properties.Integration.RequestParameters).toEqual({
      'integration.request.path.proxy': 'method.request.path.proxy',
      'integration.request.header.Authorization':
        'context.authorizer.bearerToken',
      'integration.request.header.Govuk-Chat-End-User-Id':
        'context.authorizer.Govuk-Chat-End-User-Id',
    });
  });
  it('should have a passthrough behavior of WHEN_NO_MATCH', () => {
    expect(
      resourceUnderTest.Properties.Integration.PassthroughBehavior,
    ).toEqual('WHEN_NO_MATCH');
  });
});

describe('Chat API Gateway Authorizer', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };
  const resource = template.findResources('AWS::ApiGateway::Authorizer');
  resourceUnderTest = resource['ChatApiGatewayAuthorizer'] as any;
  it('should have a name that includes the stack name', () => {
    expect(resourceUnderTest.Properties.Name).toEqual({
      'Fn::Sub': '${AWS::StackName}-chat-proxy-authorizer',
    });
  });
  it('should have a REST API ID that matches the Chat API Gateway', () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: 'ChatApiGateway',
    });
  });
  it('should have an authorizer type of REQUEST', () => {
    expect(resourceUnderTest.Properties.Type).toEqual('REQUEST');
  });
  it('should have an authorizer URI that points to the Chat Authorizer Lambda function', () => {
    expect(resourceUnderTest.Properties.AuthorizerUri).toEqual({
      'Fn::Sub':
        'arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${ChatAuthorizerFunction.Arn}/invocations',
    });
  });
  it('should have an identity source of the Authorization header', () => {
    expect(resourceUnderTest.Properties.IdentitySource).toEqual(
      'method.request.header.X-Auth',
    );
  });
  it('should have an authorizer result TTL of 300 seconds', () => {
    expect(resourceUnderTest.Properties.AuthorizerResultTtlInSeconds).toEqual(
      300,
    );
  });
});

describe('Chat API Gateway Access Log Group', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::Logs::LogGroup');
  resourceUnderTest = resource['ChatApiGatewayAccessLogGroup'] as any;

  it('should have a log group name that includes the stack name', () => {
    expect(resourceUnderTest.Properties.LogGroupName).toEqual({
      'Fn::Sub': '/aws/api-gateway/${AWS::StackName}-chat-proxy-access-logs',
    });
  });
  it('should have a retention policy of 30 days', () => {
    expect(resourceUnderTest.Properties.RetentionInDays).toEqual(30);
  });
  it('should have a KMS key for encryption', () => {
    expect(resourceUnderTest.Properties.KmsKeyId).toEqual({
      'Fn::GetAtt': ['ChatApiGatewayAccessLogGroupKMSKey', 'Arn'],
    });
  });
  it('should have associated tags', () => {
    expect(resourceUnderTest.Properties.Tags).toEqual([
      {
        Key: 'Product',
        Value: 'GOV.UK',
      },
      {
        Key: 'Environment',
        Value: { Ref: 'Environment' },
      },
      {
        Key: 'System',
        Value: 'Chat',
      },
    ]);
  });
});

describe('Chat API Gateway Access Log Group KMS Key', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::KMS::Key');
  resourceUnderTest = resource['ChatApiGatewayAccessLogGroupKMSKey'] as any;

  it('should have a description', () => {
    expect(resourceUnderTest.Properties.Description).toEqual(
      'KMS key for encrypting the Chat API Gateway Access Log Group',
    );
  });

  it('should have key rotation enabled', () => {
    expect(resourceUnderTest.Properties.EnableKeyRotation).toEqual(true);
  });

  it('should have a policy that allows the Chat API Gateway to use the key', () => {
    expect(resourceUnderTest.Properties.KeyPolicy).toEqual({
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
});

describe('Chat API Gateway Deployment', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
    DependsOn: any[];
  };

  const resource = template.findResources('AWS::ApiGateway::Deployment');
  resourceUnderTest = resource['ChatApiGatewayDeployment'] as any;

  it('should have a REST API ID that matches the Chat API Gateway', () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: 'ChatApiGateway',
    });
  });
  it('should depend on the Chat API Gateway Method', () => {
    expect(resourceUnderTest.DependsOn).toContain('ChatApiGatewayMethod');
  });
});

describe('Chat API Gateway Stage', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
  };

  const resource = template.findResources('AWS::ApiGateway::Stage');
  resourceUnderTest = resource['ChatApiGatewayStage'] as any;

  it('should have a stage name that matches the Environment', () => {
    expect(resourceUnderTest.Properties.StageName).toEqual({
      Ref: 'Environment',
    });
  });
  it('should have a REST API ID that matches the Chat API Gateway', () => {
    expect(resourceUnderTest.Properties.RestApiId).toEqual({
      Ref: 'ChatApiGateway',
    });
  });
  it('should have a deployment ID that matches the Chat API Gateway Deployment', () => {
    expect(resourceUnderTest.Properties.DeploymentId).toEqual({
      Ref: 'ChatApiGatewayDeployment',
    });
  });
  it('should have access log settings with a specific format', () => {
    expect(resourceUnderTest.Properties.AccessLogSetting).toEqual({
      DestinationArn: {
        'Fn::GetAtt': ['ChatApiGatewayAccessLogGroup', 'Arn'],
      },
      Format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        caller: '$context.identity.caller',
        user: '$context.identity.user',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        resourcePath: '$context.resourcePath',
        status: '$context.status',
        protocol: '$context.protocol',
        authorizeError: '$context.authorize.error',
        authorizeLatency: '$context.authorize.latency',
        authorizeStatus: '$context.authorize.status',
        authorizerIntegrationLatency: '$context.authorizer.integrationLatency',
        authorizerIntegrationStatus: '$context.authorizer.integrationStatus',
        authorizerLatency: '$context.authorizer.latency',
        authorizerRequestId: '$context.authorizer.requestId',
        authorizerStatus: '$context.authorizer.status',
      }),
    });
  });
});
