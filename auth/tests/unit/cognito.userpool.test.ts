import { Template, Capture, Match, MatchResult } from "aws-cdk-lib/assertions";
import { schema } from "yaml-cfn";
import { describe, it, beforeAll } from "vitest";
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

let template: Template;

describe("Set up the Cognito User Pool for GovUK app", () => {
  beforeAll(() => {
    let yamltemplate: string = load(readFileSync('template.yaml', 'utf-8'), { schema: schema });
    template = Template.fromJSON(yamltemplate);
  });
  it("has deletion protection turned on", () => {
    template.hasResourceProperties("AWS::Cognito::UserPool", {
       DeletionProtection: Match.stringLikeRegexp(/^ACTIVE/)
    });
  });
});
