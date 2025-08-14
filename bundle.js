/* ES Build script to compile lambdas into a dist folder. */

import { readFileSync } from 'fs';
import { yamlParse } from 'yaml-cfn';
import * as esbuild from 'esbuild';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { execSync } from 'child_process';

//Fetch command line arguments -- projects: affected or all, and process into array of projects to build
const argv = yargs(hideBin(process.argv)).parse();

if (!argv.project && !argv.projects) {
  throw Error(
    "Missing argument 'project' - should be specific Nx project name || or argument 'projects': Should be of value affected or all",
  );
}
let affected;
if (argv.project) {
  affected = [argv.project];
  console.log(`Building project: ${affected}`);
} else {
  if (argv.projects !== 'affected' && argv.projects !== 'all') {
    throw Error("Argument 'projects' must be of valued 'affected' or 'all'");
  }
  if (argv.projects === 'all') {
    affected = execSync('nx show projects')
      .toString('utf-8')
      .replace('\n', ',')
      .trim()
      .split(',');
    console.log(`Building all Projects: ${affected}`);
  }
  if (argv.projects === 'affected') {
    affected = execSync('nx show projects --affected')
      .toString('utf-8')
      .replace('\n', ',')
      .trim()
      .split(',');
    console.log(`Projects to build: ${affected}`);
  }
}

affected.forEach((project) => {
  console.log(
    `===============  Begining ESBuild for project: ${project}  ===============`,
  );
  const servicesPrefix = 'services';
  const projectPath = [servicesPrefix, project].join('/');
  const samTemplateFile = [projectPath, 'template.yaml'].join('/');

  // Grab Globals and Resources as objects from template yaml
  const { Globals, Resources } = yamlParse(
    readFileSync(samTemplateFile, 'utf-8'),
  );

  // We will use globals as a fallback, ensuring it exists
  const globalFunction = Globals?.Function ?? {};

  const servelessFunctionEntries = Object.values(Resources)
    .filter((resource) => resource.Type === 'AWS::Serverless::Function')
    .filter((resource) =>
      (resource.Properties?.Runtime ?? globalFunction.Runtime).startsWith(
        'nodejs',
      ),
    )
    .map((resource) => {
      let fileName = resource.Properties.Handler.split('.')[0]; //Removes the function name from the handler
      let filePath = resource.Properties.CodeUri.split('/').splice(1).join('/'); //Removes the .build output destination
      return {
        entryPoint: [projectPath, filePath, fileName].join('/').concat('.ts'),
        outputPath: [projectPath, '.build', filePath, fileName]
          .join('/')
          .concat('.js'),
      };
    });

  servelessFunctionEntries.forEach(async (lambda) => {
    let esbuildSettings = {
      entryPoints: [lambda.entryPoint],
      outfile: lambda.outputPath,
      bundle: true,
      platform: 'node',
      minify: true,
    };
    await esbuild.build(esbuildSettings);
  });
  console.log(
    `===============  Finished ESBuild for project: ${project}  ===============`,
  );
  console.log(
    `=============== Starting SAM build for project: ${project} ===============`,
  );
  execSync(`cd ${projectPath} && sam build`);
  console.log(
    `=============== SAM build complete for project: ${project} ===============`,
  );
});
