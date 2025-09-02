import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { scriptParameters } from './test-utils/parameters';

const pathBuilder = (project: string) => {
  return ['services', project, '.aws-sam', 'build', 'template.yaml'].join('/');
};

const dirBuilder = (project: string) => {
  return [`services/${project}/.aws-sam`, `services/${project}/.build`];
};

const cleanUp = () => {
  //Removing all pre-built files
  const directories = execSync(`nx show projects`)
    .toString('utf-8')
    .replace('\n', ',')
    .trim()
    .split(',')
    .map(dirBuilder)
    .flat();
  directories.forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
};

describe('Given the Sam Build script is called', () => {
  beforeEach(() => {
    cleanUp();
  });

  it.each(scriptParameters)(
    'When the Nx scope provided is $nxScope',
    ({ nxCommand, npmSuffix }) => {
      //Work out which files are being built
      const filePathsToCheck = execSync(nxCommand)
        .toString('utf-8')
        .replace('\n', ',')
        .trim()
        .split(',')
        .map(pathBuilder);

      //Run script, verify expected files are built
      execSync(`npm run sam:build:${npmSuffix}`, {
        stdio: 'ignore',
      });
      filePathsToCheck.forEach((path) => {
        expect(existsSync(path)).toBeTruthy();
      });
    },
  );

  afterAll(() => {
    cleanUp();
  });
});
