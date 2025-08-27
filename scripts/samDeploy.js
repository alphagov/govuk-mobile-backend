import { execSync } from "child_process";
import { config } from "dotenv";
import fetchProjectsToProcess from "./modules/fetchProjectsToProcess.mjs";

let projects = fetchProjectsToProcess('--type app');

const uname = execSync('uname').toString().trim();
switch(uname) {
    case 'Darwin':
        config({path:'./env/local.env'});
        break;
    case 'WindowsNT':
    default:
        console.log("For now only working on macs, can do windows & maybe linux for PRs later...");
        throw new Error('Unsupported OS');
}

const environment = process.env.ENVIRONMENT;
const userPrefix = process.env.USER_PREFIX;
const codeSigningArn = process.env.CODE_SIGNING_ARN;
const permissionBoundaryArn = process.env.PERMISSION_BOUNDARY_ARN;
const s3bucketName = process.env.SAM_DEPLOY_BUCKET;

projects.forEach(project => {
    console.log(
        `===============  Begining Deploy for project: ${project}  ===============`,
    );

    //Get template file path & declare stack name
    const servicesPrefix = 'services';
    const projectPath = [servicesPrefix, project].join('/');
    const samTemplateFile = [projectPath, '.aws-sam', 'build', 'template.yaml'].join('/');
    const stackName = [userPrefix, project].join('-');

    const overrideArgs = `Environment="${environment}" CodeSigningConfigArn="${codeSigningArn}" PermissionsBoundary="${permissionBoundaryArn}"`;

    execSync(`sam deploy --capabilities CAPABILITY_NAMED_IAM --stack-name ${stackName} --s3-bucket ${s3bucketName} --s3-prefix ${stackName} --template-file ${samTemplateFile} --parameter-overrides ${overrideArgs} --no-fail-on-empty-changeset`, {stdio: 'inherit'});

    console.log(
        `===============  Finished Deploy for project: ${project}  ===============`,
    );
}) 