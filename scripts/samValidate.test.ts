import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { beforeEach, describe, expect, it } from 'vitest';

const reportDirectoryPath = 'reports';
const reportFilePath = reportDirectoryPath.concat(
  '/infrastructure/sam-results.xml',
);

describe('Given the Sam Validate script is called', () => {
  beforeEach(() => {
    //Removing all pre-built files
    rmSync(reportDirectoryPath, { recursive: true, force: true });
  });

  it.each([
    { projects: 'all' },
    { projects: 'affected' },
    { projects: 'chat,auth' },
  ])(
    'When the project argument provided is projects=$projects',
    ({ projects }) => {
      //Run script, verify report output
      execSync(`node ./scripts/samValidate.js --projects=${projects}`, {
        stdio: 'ignore',
      });
      expect(existsSync(reportFilePath)).toBeTruthy();
    },
  );
});
