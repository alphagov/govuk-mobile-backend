import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Chat API Gateway WAF', () => {
  let resourceUnderTest: {
    Type: any;
    Properties: any;
    Condition: string;
  };

  const resource = template.findResources('AWS::WAFv2::WebACL');
  resourceUnderTest = resource['ChatApiGatewayWaf'] as any;

  it('should have a description', () => {
    expect(resourceUnderTest.Properties.Description).toEqual(
      'WAF for the GOV.UK Mobile Backend Chat Proxy',
    );
  });

  it('should have a default action set to allow', () => {
    expect(resourceUnderTest.Properties.DefaultAction).toEqual({
      Allow: {},
    });
  });

  it('should have a scope set to REGIONAL', () => {
    expect(resourceUnderTest.Properties.Scope).toEqual('REGIONAL');
  });
});
