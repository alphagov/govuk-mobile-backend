import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FEATURE_FLAGS } from '../../feature-flags';
import { afterEach } from 'node:test';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { V } from 'vitest/dist/chunks/reporters.d.BFLkQcL6.js';

const mockConfigStackName = 'test-ssm';

vi.mock('@aws-lambda-powertools/parameters/ssm', async (importOriginal) => {
  const originalModule = await importOriginal<
    typeof import('@aws-lambda-powertools/parameters/ssm')
  >();
  return {
    ...originalModule,
    getParameter: vi.fn().mockResolvedValue('True'),
  };
});

describe('feature flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('GIVEN CONFIG_STACK_NAME is missing', async () => {
    it('THEN an error is thrown', () => {
      const flags = FEATURE_FLAGS;
      expect(flags.ATTESTATION()).rejects.toThrow(
        'Missing Environment Variable: CONFIG_STACK_NAME',
      );
    });
  });

  describe('GIVEN no SSM Flag is found', async () => {
    beforeEach(() => {
      vi.mocked(getParameter).mockResolvedValue(undefined);
      vi.stubEnv('CONFIG_STACK_NAME', mockConfigStackName);
    });

    it('THEN an error is thrown', () => {
      const flags = FEATURE_FLAGS;
      expect(flags.ATTESTATION()).rejects.toThrow(
        `Missing SSM Paramater at: /test-ssm/feature-flags/attestation`,
      );
    });
  });

  describe('GIVEN a call for the attestation flag', () => {
    const scenarios = [
      {
        outcome: false,
        parameterValue: 'False',
      },
      {
        outcome: true,
        parameterValue: 'True',
      },
    ];
    it.each(scenarios)(
      'THEN $outcome is returned when the parameter value is $parameterValue',
      async ({ outcome, parameterValue }) => {
        vi.mocked(getParameter).mockResolvedValue(parameterValue);

        const flags = FEATURE_FLAGS;
        expect(flags.ATTESTATION()).resolves.toEqual(outcome);
      },
    );
  });
});
