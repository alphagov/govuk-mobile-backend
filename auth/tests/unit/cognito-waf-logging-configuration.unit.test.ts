import { describe, it } from "vitest";
import { loadTemplateFromFile } from "../common/template";

import path from "path";

const template = loadTemplateFromFile(
  path.join(__dirname, "..", "..", "template.yaml")
);

describe("Set up the Cognito WAF Logging Configuration for GovUK app", () => {
  it("has a log destination config", () => {
    template.hasResourceProperties("AWS::WAFv2::LoggingConfiguration", {
      LogDestinationConfigs: [{ "Fn::GetAtt": ["CognitoWAFLogGroup", "Arn"] }],
    });
  });
  it("has an association with the cognito waf", () => {
    template.hasResourceProperties("AWS::WAFv2::LoggingConfiguration", {
      LogDestinationConfigs: [{ "Fn::GetAtt": ["CognitoWAFLogGroup", "Arn"] }],
    });
  });
});
