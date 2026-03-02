import { execSync } from "child_process";
import { config } from "dotenv";
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

//Assuming only local deployment for now -- CI rework to be done
config({path:'./env/local.env'});

const argv = yargs(hideBin(process.argv)).parse();
const project = argv.project;
if (!project) {
    throw new Error('No project argument provided')
}

const userPrefix = process.env.USER_PREFIX;
if (!userPrefix) {
    throw new Error('A user-prefix for the stack must be provided')
}
const s3BucketName = process.env.SAM_DEPLOY_BUCKET;
if(!s3BucketName) {
    throw new Error('No S3 Bucket for SAM Deployments specified')
}

//For now, this works on env vars. I'd love to discuss in-app configuration. I wouldn't consider any of these values (it's all arns or names) to be secrets.
const parameters = { 
    ...(process.env.ENVIRONMENT ? {Environment: process.env.ENVIRONMENT} : {}),
    ...(process.env.CODE_SIGNING_ARN ? {CodeSigningConfigArn: process.env.CODE_SIGNING_ARN} : {}),
    ...(process.env.PERMISSION_BOUNDARY_ARN ? {PermissionBoundary: process.env.PERMISSION_BOUNDARY_ARN} : {}),
    ...(process.env.CONFIG_STACK_NAME ? {ConfigStackName: process.env.CONFIG_STACK_NAME} : {}),
    ...(process.env.TEST_ROLE_ARN ? {TestRoleArn: process.env.TEST_ROLE_ARN} : {}),
    ...(process.env.IS_EPHEMERAL_STACK ? {IsEphemeralStack: process.env.IS_EPHEMERAL_STACK} : {}),
}
let overrideArgs = [];
Object.keys(parameters).forEach(parameter => {
    overrideArgs.push(`${parameter}="${parameters[parameter]}"`);
})

//Forcing Ephemeral stack, working on assumption we're only supporting local deployment from this script right now. As CI/CD flow improvements are next step.
const overrideArgsString = [...overrideArgs, 'IsEphemeralStack="True"'].join(' ');

console.log(
    `===============  Begining Deploy for project: ${project}  ===============`,
);

//Get template file path & declare stack name
const servicesPrefix = 'services';
const projectPath = [servicesPrefix, project].join('/');
const samTemplateFile = [projectPath, '.aws-sam', 'build', 'template.yaml'].join('/');
const stackName = [userPrefix, project].join('-');

//TODO: Work on parralel deployments where multiple stacks exists
execSync(`sam deploy --capabilities CAPABILITY_NAMED_IAM --stack-name ${stackName} --s3-bucket ${s3BucketName} --s3-prefix ${stackName} --template-file ${samTemplateFile} --parameter-overrides ${overrideArgsString} --no-fail-on-empty-changeset`, {stdio: 'inherit'});
console.log(
    `===============  Finished Deploy for project: ${project}  ===============`,
);
