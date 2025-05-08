import { Template } from 'aws-cdk-lib/assertions'
import { readFileSync } from 'fs'
import { load } from 'js-yaml'
import { schema } from 'yaml-cfn'

export function loadTemplateFromFile(path: string): Template {
  const yamlTemplate: any = load(readFileSync(path, 'utf-8'), {
    schema: schema,
  })
  return Template.fromJSON(yamlTemplate)
}