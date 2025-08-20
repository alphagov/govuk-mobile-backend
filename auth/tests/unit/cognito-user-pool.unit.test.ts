import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Set up the Cognito User Pool for GovUK app', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
    Metadata: any;
  };

  const resource = template.findResources('AWS::Cognito::UserPool');
  resourceUnderTest = resource['CognitoUserPool'] as any;

  it('should have the correct UserPoolName', () => {
    expect(resourceUnderTest.Properties.UserPoolName).toEqual({
      'Fn::Join': [
        '-',
        [
          {
            Ref: 'AWS::StackName',
          },
          'user-pool',
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
    });
  });

  it('should have the correct Schema', () => {
    expect(resourceUnderTest.Properties.Schema).toEqual([
      {
        Name: 'email',
        Required: true,
        AttributeDataType: 'String',
      },
    ]);
  });

  it('should have deletion protection enabled', () => {
    expect(resourceUnderTest.Properties.DeletionProtection).toEqual('ACTIVE');
  });

  it('should have email as username attribute', () => {
    expect(resourceUnderTest.Properties.UsernameAttributes).toEqual(['email']);
  });

  it('should have user pool addons for production', () => {
    expect(resourceUnderTest.Properties.UserPoolAddOns).toEqual({
      'Fn::If': [
        'IsNotProduction',
        {
          Ref: 'AWS::NoValue',
        },
        {
          AdvancedSecurityMode: 'AUDIT',
        },
      ],
    });
  });

  it('should have plus user pool tier for production', () => {
    expect(resourceUnderTest.Properties.UserPoolTier).toEqual({
      'Fn::If': ['IsNotProduction', 'ESSENTIALS', 'PLUS'],
    });
  });

  it('should have the correct tags', () => {
    expect(resourceUnderTest.Properties?.UserPoolTags).toEqual({
      Environment: {
        Ref: 'Environment',
      },
      Product: 'GOV.UK',
      System: 'Authentication',
    });
  });
});
