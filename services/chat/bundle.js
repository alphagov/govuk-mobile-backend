/* ES Build script to compile lambdas into a dist folder. */

import { readFileSync } from 'fs';
import { yamlParse } from 'yaml-cfn';
import * as esbuild from 'esbuild';

// Grab Globals and Resources as objects from template yaml
const { Globals, Resources } = yamlParse(
  readFileSync('./template.yaml', 'utf-8'),
);

// We use globals as a fallback, so make sure that object exists.
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
      entryPoint: [filePath, fileName].join('/').concat('.ts'),
      outputPath: ['.build', filePath, fileName].join('/').concat('.js'),
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
