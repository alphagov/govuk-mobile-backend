import { describe, expect, it } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Template Parameters', () => {
  it('should have the correct parameters', () => {
    expect(template.findParameters('Environment')).toEqual({
      Environment: {
        Description: 'The name of the environment to deploy to',
        Type: 'String',
        AllowedValues: [
          'build',
          'staging',
          'production',
          'integration',
          'local',
          'dev',
        ],
      },
    });
    expect(template.findParameters('CodeSigningConfigArn')).toEqual({
      CodeSigningConfigArn: {
        Description:
          'The ARN of the Code Signing Config to use, provided by the deployment pipeline',
        Type: 'String',
        Default: 'none',
      },
    });
    expect(template.findParameters('PermissionsBoundary')).toEqual({
      PermissionsBoundary: {
        Description:
          'The ARN of the permissions boundary to apply to any role created by the template',
        Type: 'String',
        Default: 'none',
      },
    });
    expect(template.findParameters('ConfigStackName')).toEqual({
      ConfigStackName: {
        Description: 'Stack Name for Config Stack',
        Type: 'String',
        Default: 'govuk-app-config',
      },
    });
  });
});
