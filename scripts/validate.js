import * as fs from 'fs'
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fetchProjectsToProcess from './modules/fetchProjectsToProcess.mjs';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url)).split('/').slice(0,-1).join('/');
const xmlDirectory = rootDirectory.concat('/reports', '/infrastructure');
const xmlFilePath = xmlDirectory.concat('/sam-results.xml');

let projects = fetchProjectsToProcess();

let xmlOutput = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="SAM Validate">\n';
projects.forEach((project) => {
  console.log(
    `===============  Begining SAM Validation for project: ${project}  ===============`,
  );

  const servicesPrefix = 'services';
  const projectPath = [servicesPrefix, project].join('/');

  let errorMessage;
  try { 
    execSync(`cd ${projectPath} && sam validate --lint`);
  } catch(error) {
    errorMessage = error.stdout.toString();
  } finally {
    if(errorMessage) {
      xmlOutput += `<testsuite name="CloudFormation Template ${project}" tests="1" failures="1" errors="0" skipped="0" time="1">\n<testcase name="Template Validation" classname="SAM.CloudFormation">\n<failure message="SAM validation failed">${errorMessage}</failure>\n</testcase>\n</testsuite>`
    } else {
      xmlOutput += `<testsuite name="CloudFormation Template ${project}" tests="1" failures="0" errors="0" skipped="0" time="1">\n<testcase name="Template Validation" classname="SAM.CloudFormation"/>\n</testsuite>`
    }
    console.log(
      `===============  Finished SAM Validation for project: ${project}  ===============`,
    );
  };
});

xmlOutput += `</testsuites>`
fs.mkdirSync(xmlDirectory, { recursive: true });
fs.writeFileSync(xmlFilePath, xmlOutput, { flag: 'w' });
