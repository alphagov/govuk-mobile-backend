import { loadFeature, describeFeature } from "@amiceli/vitest-cucumber"
import { Template, Match } from 'aws-cdk-lib/assertions';
import { schema } from 'yaml-cfn';
import { readFileSync } from 'fs';
import { load } from 'js-yaml';
import { describe, beforeEach, it, expect } from 'vitest';

const feature = await loadFeature('feature-tests/vitest-features/GovUKMobileTags.feature')

let template: Template;

describeFeature(feature, ({ BeforeAllScenarios, Scenario }) => {
    BeforeAllScenarios(() => {
        let yamltemplate = load(readFileSync('template.yaml', 'utf-8'), { schema: schema });
        template = Template.fromJSON(yamltemplate);
    })

    Scenario(`A template has the correct resource tags`, ({ Given, Then }) => {
        Given(`a template with AWS resources`, () => { })
        Then(`the template's resources must have the required tags`, () => {
            Object.keys(template.toJSON().Resources).forEach((resourceName) => {

                const resource = template.toJSON().Resources[resourceName];
                const ignoredResources = ["GovUKMobileCognitoUserPool", "GovUKMobileCognitoWAFAssociation"];

                if (!ignoredResources.includes(resourceName)) {

                    expect(resource.Properties).toHaveProperty('Tags');
                    
                    const actualTags = resource.Properties["Tags"];
                    const expectedTags = [
                        { Key: 'Product', Value: 'GOV.UK' },
                        { Key: 'Environment', Value: expect.any(Object) },
                        { Key: 'System', Value: 'Authentication' }
                    ];

                    expect(actualTags).toEqual(expectedTags);
                }
            })
        })
    })

})