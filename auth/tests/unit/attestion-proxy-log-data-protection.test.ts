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

describe('Attestation api logging data protection policies', () => {
  const logName = 'AttestationProxyApiAccessLogGroup';
  const logGroup = template.findResources('AWS::Logs::LogGroup')[
    logName
  ] as any;

  it('has a data protection policy', () => {
    expect(logGroup.Properties.DataProtectionPolicy).toBeDefined();
  });

  describe('check protection policy and masking', () => {
    const policies: DataProtectionPolicyStatement[] =
      logGroup.Properties.DataProtectionPolicy.Statement;

    it('should have audit policy present', () => {
      const auditPolicy = policies.find((p) => p.Sid === 'audit-policy');
      expect(auditPolicy).toBeDefined();
    });

    it('should masking policy present', () => {
      const maskingPolicy = policies.find((p) => p.Sid === 'masking-policy');
      expect(maskingPolicy).toBeDefined();
    });

    it.each(policies)(
      'should have masking policy for IP address and Email',
      (policy) => {
        expect(policy.DataIdentifier).toHaveLength(2);
        expect(policy.DataIdentifier).toContain(
          'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
        );
        expect(policy.DataIdentifier).toContain(
          'arn:aws:dataprotection::aws:data-identifier/IpAddress',
        );
      },
    );

    it('should have correct tags', () => {
      expect(logGroup.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });
  });
});
