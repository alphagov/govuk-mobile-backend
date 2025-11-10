import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';

import path from 'node:path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

type XRaySamplingRuleTestCase = {
  resourceName: string;
  ruleName: string;
  priority: number;
  serviceName: string;
  httpMethod: string;
  urlPath: string;
  fixedRate: number;
  reservoirSize: number;
};

const testCases: XRaySamplingRuleTestCase[] = [
  {
    resourceName: 'XRayAuthProxySamplingRule',
    ruleName: 'auth-proxy',
    priority: 9000,
    serviceName: 'auth-proxy',
    httpMethod: 'POST',
    urlPath: '/oauth2/token',
    fixedRate: 1,
    reservoirSize: 20,
  },
  {
    resourceName: 'XRayRevokeTokenSamplingRule',
    ruleName: 'revoke-refresh-token',
    priority: 9001,
    serviceName: 'revoke-refresh-token',
    httpMethod: 'POST',
    urlPath: '/oauth2/revoke',
    fixedRate: 1,
    reservoirSize: 5,
  },
  {
    resourceName: 'XRaySharedSignalReceiverSamplingRule',
    ruleName: 'shared-signal-receiver',
    priority: 9002,
    serviceName: 'shared-signal-receiver',
    httpMethod: 'POST',
    urlPath: '/receiver',
    fixedRate: 1,
    reservoirSize: 10,
  },
  {
    resourceName: 'XRaySharedSignalHealthCheckSamplingRule',
    ruleName: 'shared-signal-health',
    priority: 9003,
    serviceName: 'shared-signal-health-check',
    httpMethod: '*',
    urlPath: '*',
    fixedRate: 1,
    reservoirSize: 5,
  },
  {
    resourceName: 'XRaySharedSignalAuthorizerSamplingRule',
    ruleName: 'shared-signal-auth',
    priority: 9004,
    serviceName: 'shared-signal-authorizer',
    httpMethod: '*',
    urlPath: '*',
    fixedRate: 1,
    reservoirSize: 15,
  },
];

describe.each(testCases)(
  'X-Ray Sampling Rule $ruleName',
  ({
    resourceName,
    ruleName,
    priority,
    serviceName,
    httpMethod,
    urlPath,
    fixedRate,
    reservoirSize,
  }) => {
    const resource = template.findResources('AWS::XRay::SamplingRule');
    const resourceUnderTest = resource[resourceName] as any;

    it('should be defined', () => {
      expect(resourceUnderTest).toBeDefined();
    });

    it('should have type of XRay SamplingRule', () => {
      expect(resourceUnderTest.Type).toEqual('AWS::XRay::SamplingRule');
    });

    it('should have a rule name that includes the stack name', () => {
      expect(resourceUnderTest.Properties.SamplingRule.RuleName).toEqual({
        'Fn::Sub': `\${AWS::StackName}-${ruleName}`,
      });
    });

    it('should have the correct priority', () => {
      expect(resourceUnderTest.Properties.SamplingRule.Priority).toEqual(
        priority,
      );
    });

    it('should have the correct fixed rate', () => {
      expect(resourceUnderTest.Properties.SamplingRule.FixedRate).toEqual(
        fixedRate,
      );
    });

    it('should have the correct reservoir size', () => {
      expect(resourceUnderTest.Properties.SamplingRule.ReservoirSize).toEqual(
        reservoirSize,
      );
    });

    it('should have a service name that includes the stack name', () => {
      expect(resourceUnderTest.Properties.SamplingRule.ServiceName).toEqual({
        'Fn::Sub': `\${AWS::StackName}-${serviceName}`,
      });
    });

    it('should have the correct service type', () => {
      expect(resourceUnderTest.Properties.SamplingRule.ServiceType).toEqual(
        '*',
      );
    });

    it('should have the correct host', () => {
      expect(resourceUnderTest.Properties.SamplingRule.Host).toEqual('*');
    });

    it('should have the correct HTTP method', () => {
      expect(resourceUnderTest.Properties.SamplingRule.HTTPMethod).toEqual(
        httpMethod,
      );
    });

    it('should have the correct URL path', () => {
      expect(resourceUnderTest.Properties.SamplingRule.URLPath).toEqual(
        urlPath,
      );
    });

    it('should have version 1', () => {
      expect(resourceUnderTest.Properties.SamplingRule.Version).toEqual(1);
    });

    it('should have resource ARN wildcard', () => {
      expect(resourceUnderTest.Properties.SamplingRule.ResourceARN).toEqual(
        '*',
      );
    });

    it('should have empty attributes', () => {
      expect(resourceUnderTest.Properties.SamplingRule.Attributes).toEqual({});
    });

    it('has the required tags', () => {
      expect(resourceUnderTest.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });
  },
);

describe('X-Ray Sampling Rules collection', () => {
  const xrayResources = template.findResources('AWS::XRay::SamplingRule');

  it('should have exactly 5 X-Ray sampling rules', () => {
    expect(Object.keys(xrayResources)).toHaveLength(5);
  });

  it('should contain all expected sampling rule resources', () => {
    const expectedResources = [
      'XRayAuthProxySamplingRule',
      'XRayRevokeTokenSamplingRule',
      'XRaySharedSignalReceiverSamplingRule',
      'XRaySharedSignalHealthCheckSamplingRule',
      'XRaySharedSignalAuthorizerSamplingRule',
    ];

    for (const resourceName of expectedResources) {
      expect(xrayResources[resourceName]).toBeDefined();
    }
  });

  it('should have unique priorities for all sampling rules', () => {
    const priorities = Object.values(xrayResources).map(
      (resource: any) => resource.Properties.SamplingRule.Priority,
    );
    const uniquePriorities = new Set(priorities);
    expect(uniquePriorities.size).toEqual(priorities.length);
  });

  it('should have priorities in the 9000 range', () => {
    for (const resource of Object.values(xrayResources)) {
      const priority = (resource as any).Properties.SamplingRule.Priority;
      expect(priority).toBeGreaterThanOrEqual(9000);
      expect(priority).toBeLessThan(9010);
    }
  });
});
