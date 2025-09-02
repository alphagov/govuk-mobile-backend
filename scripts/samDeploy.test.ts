import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { config } from 'dotenv';
import { scriptParameters } from './test-utils/parameters';
import {
  ListStacksCommand,
  CloudFormationClient,
} from '@aws-sdk/client-cloudformation';

config({ path: './env/local.env' });
const userPrefix = process.env.USER_PREFIX;

//This test would only work when we are signed into AWS in the CLI....
const cfnClient = new CloudFormationClient({ region: 'eu-west-2' });

const dirBuilder = (project: string) => {
  return [`services/${project}/.aws-sam`, `services/${project}/.build`];
};

describe('Given the Sam Deploy script is called', () => {
  beforeAll(() => {
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
    'When the Nx scope provided is $nxScope',
    async ({ nxCommand, npmSuffix }) => {
      //Work out which files are being built
      let projectsBeingDeployed: string[];
      projectsBeingDeployed = execSync(nxCommand)
        .toString('utf-8')
        .replace('\n', ',')
        .trim()
        .split(',');

      //Run Deploy Script
      execSync(`npm run sam:deploy:${npmSuffix}`, {
        stdio: 'ignore',
      });

      //Fetch deployed CFN stack names & verify our new ones are deployed
      const command = new ListStacksCommand({
        StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE'],
      });
      const deployedStackNames = (await cfnClient.send(command))
        .StackSummaries!.map((summary) =>
          summary.StackName ? summary.StackName : '',
        )
        .flat()
        .filter((name) => name !== '');
      console.log(deployedStackNames);
      projectsBeingDeployed.forEach((project) => {
        const stackName = [userPrefix, project].join('-');
        expect(deployedStackNames).toContain(stackName);
      });
    },
  );
});
