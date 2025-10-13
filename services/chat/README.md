# Chat API Proxy

The Chat API Proxy enables a secure integration between the GOV.UK App and the Chat API.

### Pre-requisites for local development

1. Follow the [pre-requisites](../README.md#1-prerequisites) in the main README.md of this repository.
1. Ensure you have deployed the [auth SAM template](../auth/template.yaml) using the SAM CLI, instructions on how to do this can be found [here](../README.md#sam-deploy-to-dev-environment).
1. The [config repository](https://github.com/alphagov/govuk-mobile-backend-ssm) should be cloned, and the SAM CLI used to deploy the config stack, you will need to manually apply any secrets that your local development environment requires that are in the config repository. Make a note of the stack name you have set here as you will need it for deploying the chat stack.
1. Once you have deployed the config repository above, you need to set the value for `{ssm-stack}/chat/secrets` in Secrets Manager, for what this should be, speak with an engineer in the team.

### Deploying the SAM Template

> [!NOTE]
> A convention that is followed for the stack name is {your-initials}-{domain}, for example, `bb-chat`.

- Setup AWS CLI - https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-configure.html  
  Validate the SAM template `sam validate --lint`
- Build SAM project `sam build`
- Run guided deployment `sam deploy --guided` to create the \*.toml file (you should only need the `--guided` argument on first deployment)
- Update the toml file as below and update local deployment variables

```
stack_name = "<your-stack-name>"
s3_prefix = "<your-stack-name>"
parameter_overrides = "Environment=\"dev\" CodeSigningConfigArn=\"none\" PermissionsBoundary=\"none\" ConfigStackName=\"<your-ssm-config-name>\"
```

### Testing

Ensure you have pulled down the stack outputs from the SAM template to a `.env`, there is a helper script that can be run from the `/chat` directory that will do this:

```bash
sh ../auth/helper-scripts/get-cloudformation-outputs.sh your-stack-name
```

There are multiple sets of tests, specifically, `unit`, `acc` & `int`, below is a brief description of what is expected for each:

#### infra

The infra tests will mostly test the `template.yaml` file, specifically the [Resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resources-section-structure.html), each test should describe that the resource is and its purpose. Further unit tests should be written for specific logic where required, for instance, lambda code.

#### acc

The majority of the acceptance tests will run against a deployed environment, and describe the expected behaviour of the components that are used to deliver the Chat API Proxy.
