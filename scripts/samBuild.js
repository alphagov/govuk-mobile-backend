/* ES Build script to compile lambdas into a dist folder. */

import { readFileSync, readFileSync, readFileSync } from 'fs';
import { yamlParse } from 'yaml-cfn';
import * as esbuild from 'esbuild';
import { execSync } from 'child_process';
import fetchProjectsToProcess from './modules/fetchProjectsToProcess.mjs';

let projects = fetchProjectsToProcess('--type app');

projects.forEach((project) => {
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

  //SAM Build step can be broken out, doesn't need to be part of this build step.
  console.log(
    `=============== Starting SAM build for project: ${project} ===============`,
  );
  execSync(`cd ${projectPath} && sam build`);
  console.log(
    `=============== SAM build complete for project: ${project} ===============`,
  );
});
