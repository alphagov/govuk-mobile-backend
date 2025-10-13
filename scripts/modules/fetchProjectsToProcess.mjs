import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execSync } from 'child_process';

export default function fetchProjectsToProcess(...args) {
  //Fetch command line arguments -- projects: affected or all, and process into array of projects to build
  const argv = yargs(hideBin(process.argv)).parse();
  let projects = argv.projects;

  let toProcess;
  let logMessage;
  if (!projects) {
    throw Error(
      "Missing argument 'projects': Should be a string separated list of Nx projects OR specifically the value 'affected' or 'all",
    );
  }

  let commandString = ['nx show projects', ...args].join(' ');
  if (projects === 'affected') {
    commandString += ' --affected';
    toProcess = execSync(commandString)
      .toString('utf-8')
      .replace('\n', ',')
      .trim()
      .split(',');
    logMessage = `Processing affected projects: ${toProcess}`;
  } else if (projects === 'all') {
    toProcess = execSync(commandString)
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
