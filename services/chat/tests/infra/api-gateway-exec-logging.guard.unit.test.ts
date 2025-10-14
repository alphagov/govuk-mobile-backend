import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('Chat API execution logging must be enabled', () => {
  it('AWS::ApiGateway::Stage has MethodSettings with LoggingLevel INFO/ERROR wildcard', () => {
    const stages: Record<string, any> = template.findResources(
      'AWS::ApiGateway::Stage',
    );
    Object.values(stages).forEach((stage: any) => {
      const settings = stage.Properties.MethodSettings as any[];
      expect(settings && settings.length).toBeGreaterThan(0);
      const wildcard = settings.find(
        (m) => m.ResourcePath === '/*' && m.HttpMethod === '*',
      );
      expect(wildcard).toBeDefined();
      expect(['INFO', 'ERROR']).toContain(wildcard.LoggingLevel);
    });
  });
});
