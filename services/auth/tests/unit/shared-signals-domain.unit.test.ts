import { describe, it, expect } from 'vitest';
import { loadTemplateFromFile } from '../common/template';
import path from 'path';

const template = loadTemplateFromFile(
  path.join(__dirname, '..', '..', 'template.yaml'),
);

describe('shared signal domain', () => {
  it('should provision an api gateway with a custom domain', () => {
    template.hasResourceProperties('AWS::ApiGateway::DomainName', {
      DomainName: {
        'Fn::If': [
          'IsEphemeralStack',
          {
            'Fn::Sub':
              '${AWS::StackName}.shared-signals.${Environment}.app-backend.service.gov.uk',
          },
          {
            'Fn::Sub':
              'shared-signals.${Environment}.app-backend.service.gov.uk',
          },
        ],
      },
    });
  });

  it('should have a record set for the shared signal domain', () => {
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      Name: {
        'Fn::Sub': '${SharedSignalDomainName}.',
      },
      Type: 'A',
    });
  });

  it('should have the correct hosted zone ID for the shared signal domain', () => {
    template.hasResourceProperties('AWS::Route53::RecordSet', {
      HostedZoneId: {
        'Fn::Sub': '{{resolve:ssm:/dns/env-hosted-zone-id}}',
      },
    });
  });

  it('should have shield protection for the shared signal domain', () => {
    template.hasResourceProperties('AWS::Shield::Protection', {
      Name: {
        'Fn::Sub': '${AWS::StackName}-shared-signal-shield-protection',
      },
      ResourceArn: {
        'Fn::Sub':
          'arn:aws:route53:::hostedzone/{{resolve:ssm:/dns/env-hosted-zone-id}}',
      },
    });
  });
});
