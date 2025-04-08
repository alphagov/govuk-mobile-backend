import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber"
import { Template, Match } from 'aws-cdk-lib/assertions';
import { schema } from 'yaml-cfn';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';

const feature = await loadFeature('feature-tests/vitest-features/GovUKMobileWebApplicationFirewall.feature');

let template: Template;

describeFeature(feature, ({ BeforeAllScenarios, Scenario }) => {
    BeforeAllScenarios(() => {
        let yamltemplate = load(readFileSync('template.yaml', 'utf-8'), { schema: schema });
        template = Template.fromJSON(yamltemplate);
    });

    Scenario(`A template can deploy the GOV UK Mobile Web Application Firewall`, ({ Given, Then }) => {
        Given(`a template to deploy the GOV UK Mobile Web Application Firewall`, () => { })
        Then(`the template must have the required resource and properties to deploy the GOV UK Mobile Web Application Firewall`, () => {

            template.hasResourceProperties(
                "AWS::WAFv2::WebACL",
                Match.objectEquals({
                    DefaultAction: {
                        Allow: {}
                    },
                    Scope: "REGIONAL",
                    VisibilityConfig: {
                        CloudWatchMetricsEnabled: true,
                        MetricName: {
                            "Fn::Join": [
                                "-",
                                [
                                    {
                                        Ref: "AWS::StackName"
                                    },
                                    "waf-acl-rules",
                                    {
                                        "Fn::Select": [
                                            4,
                                            {
                                                "Fn::Split": [
                                                    "-",
                                                    {
                                                        "Fn::Select": [
                                                            2,
                                                            {
                                                                "Fn::Split": [
                                                                    "/",
                                                                    {
                                                                        Ref: "AWS::StackId"
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            ],
                        },
                        SampledRequestsEnabled: true
                    },
                    Tags: [
                        { Key: "Product", Value: "GOV.UK" },
                        { Key: "Environment", Value: { Ref: "Environment" } },
                        { Key: "System", Value: "Authentication" },
                    ]
                })
            );
        })
    });
});