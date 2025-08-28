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

describe.each([
  {
    name: 'CognitoWAFLogGroup',
  },
  {
    name: 'AuthProxyWafLogGroup',
  },
])('waf logging data protection policies', (testCase) => {
  const logGroup = template.findResources('AWS::Logs::LogGroup')[
    testCase.name
  ] as any;

  it('has a data protection policy', () => {
    expect(logGroup.Properties.DataProtectionPolicy).toBeDefined();
  });

  describe('redacted jwt token logs', () => {
    const policies: DataProtectionPolicyStatement[] =
      logGroup.Properties.DataProtectionPolicy.Statement;
    const customTokenDataIdentifier =
      logGroup.Properties.DataProtectionPolicy.Configuration
        .CustomDataIdentifier[0];
    const tokenRegex = new RegExp(customTokenDataIdentifier.Regex);

    it('should have audit policy present', () => {
      const auditPolicy = policies.find((p) => p.Sid === 'audit-policy');
      expect(auditPolicy).toBeDefined();
    });

    it('should masking policy present', () => {
      const maskingPolicy = policies.find((p) => p.Sid === 'masking-policy');
      expect(maskingPolicy).toBeDefined();
    });

    it.each(policies)(
      'should have masking policy for JWT, IP address and Email',
      (policy) => {
        expect(policy.DataIdentifier).toHaveLength(3);
        expect(policy.DataIdentifier.includes(customTokenDataIdentifier.Name));
        expect(policy.DataIdentifier).toContain(
          'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
        );
        expect(policy.DataIdentifier).toContain(
          'arn:aws:dataprotection::aws:data-identifier/IpAddress',
        );
        expect(policy.DataIdentifier).toContain('JWTTokens');
      },
    );

    it('should match valid JWT tokens', () => {
      const validTokens = [
        'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c', // pragma: allowlist secret
        'id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IfasgaXVCJ9.eyJzdWIiOiIxMjM0NTYgasgasbmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwgasOk6yJV_adQssw5c', // pragma: allowlist secret
      ];

      validTokens.forEach((token) => {
        expect(tokenRegex.test(token)).toBe(true);
      });
    });

    it('should not match any value after a token', () => {
      const invalidTokens = [
        'access_token=not.a.jwt',
        'id_token=abc.def',
        'token=gha',
        'access_token=abc.def.ghi.extra',
      ];

      invalidTokens.forEach((token) => {
        expect(tokenRegex.test(token)).toBe(false);
      });
    });

    it('should not redact unmatched fields', () => {
      const unmatchedFields = ['random=safglk', 'foo=bar'];

      unmatchedFields.forEach((token) => {
        expect(tokenRegex.test(token)).toBe(false);
      });
    });

    it('should have correct tags', () => {
      expect(logGroup.Properties.Tags).toEqual([
        { Key: 'Product', Value: 'GOV.UK' },
        { Key: 'Environment', Value: { Ref: 'Environment' } },
        { Key: 'System', Value: 'Authentication' },
      ]);
    });
  });
});
