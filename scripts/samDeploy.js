import { execSync } from "child_process";
import { config } from "dotenv";
import fetchProjectsToProcess from "./modules/fetchProjectsToProcess.mjs";

let projects = fetchProjectsToProcess('--type app');

let userPrefix = '';
let s3BucketName;
const uname = execSync('uname').toString().trim();
switch(uname) {
    case 'Darwin':
        config({path:'./env/local.env'});
        userPrefix = process.env.USER_PREFIX;
        s3BucketName = process.env.SAM_DEPLOY_BUCKET;
        if(!s3BucketName) {
            throw new Error('No S3 Bucket for SAM Deployments specified')
        }
        break;
    case 'WindowsNT':
    default:
        console.log("For now only working on macs, can do windows & maybe linux for PRs later...");
        throw new Error('Unsupported OS');
}

//For now, this works on env vars. I'd love to discuss in-app configuration. I wouldn't consider any of these values to be secrets.
const parameters = { 
    ...(process.env.ENVIRONMENT ? {Environment: process.env.ENVIRONMENT} : {}),
    ...(process.env.CODE_SIGNING_ARN ? {CodeSigningConfigArn: process.env.CODE_SIGNING_ARN} : {}),
    ...(process.env.PERMISSION_BOUNDARY_ARN ? {PermissionBoundary: process.env.PERMISSION_BOUNDARY_ARN} : {}),
    ...(process.env.CONFIG_STACK_NAME ? {ConfigStackName: process.env.CONFIG_STACK_NAME} : {}),
    ...(process.env.TEST_ROLE_ARN ? {TestRoleArn: process.env.TEST_ROLE_ARN} : {}),
}
let overrideArgs = [];
Object.keys(parameters).forEach(parameter => {
    overrideArgs.push(`${parameter}="${parameters[parameter]}"`);
})

//Forcing Ephemeral stack, working on assumption we're only supporting local deployment from this script right now. As CI/CD flow improvements are next step.
const overrideArgsString = [...overrideArgs, 'IsEphemeralStack="True"'].join(' ');

projects.forEach(project => {
    console.log(
        `===============  Begining Deploy for project: ${project}  ===============`,
    );

    //Get template file path & declare stack name
    const servicesPrefix = 'services';
    const projectPath = [servicesPrefix, project].join('/');
    const samTemplateFile = [projectPath, '.aws-sam', 'build', 'template.yaml'].join('/');
    const stackName = [userPrefix, project].join('-');

    try {
        execSync(`sam deploy --capabilities CAPABILITY_NAMED_IAM --stack-name ${stackName} --s3-bucket ${s3BucketName} --s3-prefix ${stackName} --template-file ${samTemplateFile} --parameter-overrides ${overrideArgsString} --no-fail-on-empty-changeset`, {stdio: 'inherit'});
        console.log(
            `===============  Finished Deploy for project: ${project}  ===============`,
        );
    } catch (error) {
        console.error(error.stdout.tostring());
        console.error(
            `===============  Failed Deploying project: ${project}  ===============`,
        );
    }
}) 