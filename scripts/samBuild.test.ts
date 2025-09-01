import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { scriptParameters } from './test-utils/parameters';

const pathBuilder = (project: string) => {
  return ['services', project, '.aws-sam', 'build', 'template.yaml'].join('/');
};

const dirBuilder = (project: string) => {
  return [`services/${project}/.aws-sam`, `services/${project}/.build`];
};

describe('Given the Sam Build script is called', () => {
  beforeEach(() => {
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
  });

  it.each(scriptParameters)(
    'When the project argument provided is projects=$projects',
    ({ projects, nxCommand }) => {
      //Work out which files are being built
      let filePathsToCheck: string[];
      if (nxCommand) {
        filePathsToCheck = execSync(nxCommand)
          .toString('utf-8')
          .replace('\n', ',')
          .trim()
          .split(',')
          .map(pathBuilder);
      } else {
        filePathsToCheck = projects.split(',').map(pathBuilder);
      }

      //Run script, verify expected files are built
      execSync(`node ./scripts/samBuild.js --projects=${projects}`, {
        stdio: 'ignore',
      });
      filePathsToCheck.forEach((path) => {
        expect(existsSync(path)).toBeTruthy();
      });
    },
  );
});
