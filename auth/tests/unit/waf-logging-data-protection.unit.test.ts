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

    it.each(policies)('should redact jwt tokens', (policy) => {
      expect(policy.DataIdentifier.includes(customTokenDataIdentifier.Name));
    });

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
  });
});
