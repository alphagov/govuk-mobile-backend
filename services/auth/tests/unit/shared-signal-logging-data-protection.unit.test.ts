import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

type DataProtectionPolicyStatement = {
  Sid: string;
  DataIdentifier: string[];
};

describe('Shared signal Data Protection Policies', () => {
  const logGroup = template.findResources('AWS::Logs::LogGroup')[
    'SharedSignalAccessLogGroup'
  ] as any;

  it('has a data protection policy', () => {
    expect(logGroup.Properties.DataProtectionPolicy).toBeDefined();
  });

  it('should contain the requisite tags', () => {
    expect(logGroup.Properties.Tags).toBeDefined();
    expect(logGroup.Properties.Tags).toContainEqual({
      Key: 'Product',
      Value: 'GOV.UK',
    });
    expect(logGroup.Properties.Tags).toContainEqual({
      Key: 'Environment',
      Value: { Ref: 'Environment' },
    });
    expect(logGroup.Properties.Tags).toContainEqual({
      Key: 'System',
      Value: 'Authentication',
    });
  });

  it('has email address masking policy in place', () => {
    const expectedEmailAddressIdentifier =
      'arn:aws:dataprotection::aws:data-identifier/EmailAddress';
    const policies: DataProtectionPolicyStatement[] =
      logGroup.Properties.DataProtectionPolicy.Statement;
    expect(
      policies.some((policy) =>
        policy.DataIdentifier.includes(expectedEmailAddressIdentifier),
      ),
    ).toBe(true);
  });

  it('has IP address masking policy in place', () => {
    const expectedIpAddressIdentifier =
      'arn:aws:dataprotection::aws:data-identifier/IpAddress';
    const policies: DataProtectionPolicyStatement[] =
      logGroup.Properties.DataProtectionPolicy.Statement;
    expect(
      policies.some((policy) =>
        policy.DataIdentifier.includes(expectedIpAddressIdentifier),
      ),
    ).toBe(true);
  });
});
