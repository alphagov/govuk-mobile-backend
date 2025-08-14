import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execSync } from 'child_process';

export default function fetchProjectsToProcess() {
  //Fetch command line arguments -- projects: affected or all, and process into array of projects to build
  const argv = yargs(hideBin(process.argv)).parse();
  let projects = argv.projects;

  let toProcess;
  let logMessage;
  if (!projects) {
    throw Error(
      "Missing argument 'projects': Should be a string seperated list of Nx projects OR specifically the value 'affected' or 'all",
    );
  }

  if (projects === 'affected') {
    toProcess = execSync('nx show projects --affected')
      .toString('utf-8')
      .replace('\n', ',')
      .trim()
      .split(',');
    logMessage = `Processing affected projects: ${toProcess}`;
  } else if (projects === 'all') {
    toProcess = execSync('nx show projects')
      .toString('utf-8')
      .replace('\n', ',')
      .trim()
      .split(',');
    logMessage = `Processing all projects: ${toProcess}`;
  } else {
    toProcess = [...projects.split(',')];
    logMessage = `Processing specific projects: ${toProcess}`;
  }
  console.log(logMessage);

  return toProcess;
}
