import { describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe('account level data protection policies', () => {
  const logGroup = template.findResources("AWS::Logs::AccountPolicy")[
    "AccountLevelDataProtectionPolicy"
  ] as any;

  it('has a data protection policy', () => {
    expect(logGroup.Properties.PolicyDocument).toBeDefined()
  })

  describe('redacted jwt token logs', () => {
    const tokenRedactPolicy = JSON.parse(logGroup.Properties.PolicyDocument)
    const tokenRegex = new RegExp(tokenRedactPolicy.Configuration.CustomDataIdentifier[0].Regex);

    it('should redact jwt tokens', () => {
      expect(tokenRedactPolicy).toEqual({
        "Configuration": {
          "CustomDataIdentifier": [
            {
              "Name": "JWTTokens",
              "Regex": "eyJ[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_=]+\\.[A-Za-z0-9-_.+/=]*",
            },
          ],
        },
        "Description": "Protect against JWT tokens exposure",
        "Name": "CloudWatchLogs-JWTToken-Protection",
        "Statement": [
          {
            "DataIdentifier": [
              "JWTTokens",
            ],
            "Operation": {
              "Audit": {
                "FindingsDestination": {},
              },
            },
            "Sid": "audit-policy",
          },
          {
            "DataIdentifier": [
              "JWTTokens",
            ],
            "Operation": {
              "Deidentify": {
                "MaskConfig": {},
              },
            },
            "Sid": "redact-policy",
          },
        ],
        "Version": "2021-06-01",
      })
    });

    it('should match valid JWT tokens', () => {
      const validTokens = [
        "access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c", // pragma: allowlist secret
        "id_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IfasgaXVCJ9.eyJzdWIiOiIxMjM0NTYgasgasbmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwgasOk6yJV_adQssw5c", // pragma: allowlist secret
      ];

      validTokens.forEach(token => {
        expect(tokenRegex.test(token)).toBe(true);
      });
    });

    it('should not match any value after a token', () => {
      const invalidTokens = [
        "access_token=not.a.jwt",
        "id_token=abc.def",
        "token=gha",
        "access_token=abc.def.ghi.extra"
      ];

      invalidTokens.forEach(token => {
        expect(tokenRegex.test(token)).toBe(false);
      });
    });

    it('should not redact unmatched fields', () => {
      const unmatchedFields = [
        "random=safglk",
        "foo=bar",
      ];

      unmatchedFields.forEach(token => {
        expect(tokenRegex.test(token)).toBe(false);
      });
    })
  })
})