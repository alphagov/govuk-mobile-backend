import { describe, expect, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";
import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

type DataProtectionPolicyStatement = {
  Sid: string;
  DataIdentifier: string[];
}

describe("Shared signal Data Protection Policies", () => {
  const logGroup = template.findResources("AWS::Logs::LogGroup")["SharedSignalsAccessLogGroup"] as any;
  
  it('has a data protection policy', () => {
    expect(logGroup.Properties.DataProtectionPolicy).toBeDefined()
  })

  it('should contain the requisite tags', () => {
    expect(logGroup.Properties.Tags).toBeDefined();
    expect(logGroup.Properties.Tags).toContainEqual({ Key: "Product", Value: "GOV.UK" });
    expect(logGroup.Properties.Tags).toContainEqual({ Key: "Environment", Value: { Ref: "Environment" } });
    expect(logGroup.Properties.Tags).toContainEqual({ Key: "System", Value: "Authentication" });
  });

  it('has email address masking policy in place', () => {
    const expectedEmailAddressIdentifier = "arn:aws:dataprotection::aws:data-identifier/EmailAddress";
    const policies: DataProtectionPolicyStatement[] = logGroup.Properties.DataProtectionPolicy.Statement
    expect(policies.some(policy => policy.DataIdentifier.includes(expectedEmailAddressIdentifier))).toBe(true);
  })

   describe('Should contain IP addresses masking policies', () => {
    const policies: DataProtectionPolicyStatement[] = logGroup.Properties.DataProtectionPolicy.Statement
    const customTokenDataIdentifier = logGroup.Properties.DataProtectionPolicy.Configuration.CustomDataIdentifier[0];
    const tokenRegex = new RegExp(customTokenDataIdentifier.Regex);

    it.each(policies)('should redact ip addresses', (policy) => {
      expect(policy.DataIdentifier.includes(customTokenDataIdentifier.Name))
    });

    it('should match valid IP addresses', () => {
      const validTokens = [
        "ip=192.168.1.1",
        "ip_address=10.0.0.1",
      ];

      validTokens.forEach(token => {
        expect(tokenRegex.test(token)).toBe(true);
      });
    });

    it('should not match non IP addresses', () => {
      const unmatchedFields = [
        "ip=not.an.ip",
        "foo=bar",
      ];

      unmatchedFields.forEach(token => {
        expect(tokenRegex.test(token)).toBe(false);
      });
    })
  })

}); 
