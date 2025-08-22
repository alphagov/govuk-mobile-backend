import { execSync } from 'child_process';
import fetchProjectsToProcess from './modules/fetchProjectsToProcess.mjs';

let projects = fetchProjectsToProcess();

projects.forEach((project) => {
  console.log(
    `===============  Begining SAM Validation for project: ${project}  ===============`,
  );

  const servicesPrefix = 'services';
  const projectPath = [servicesPrefix, project].join('/');

  execSync(`cd ${projectPath} && sam validate --lint`);

  console.log(
    `===============  Finished SAM Validation for project: ${project}  ===============`,
  );
});
