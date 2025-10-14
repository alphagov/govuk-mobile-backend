import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('All Serverless APIs must enable execution logging', () => {
  it('every AWS::Serverless::Api has stage MethodSettings with LoggingLevel', () => {
    const apis: Record<string, any> = template.findResources(
      'AWS::Serverless::Api',
    );
    Object.values(apis)
      .filter((api: any) => api.Properties.StageName === '!Ref Environment')
      .forEach((api: any) => {
        expect(api.Properties.StageName).toBeDefined();
        const methodSettings = api.Properties.MethodSettings as any[];
        expect(methodSettings && methodSettings.length).toBeGreaterThan(0);
        const wildcard = methodSettings.find(
          (m) => m.ResourcePath === '/*' && m.HttpMethod === '*',
        );
        expect(wildcard).toBeDefined();
        expect(['INFO', 'ERROR']).toContain(wildcard.LoggingLevel);
      });
  });
});
