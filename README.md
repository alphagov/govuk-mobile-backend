# GOVUK - Backend

> Backend mono-repo for GOVUK backend resources.

# Installation

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js:** Recommended install via [nvm](https://github.com/nvm-sh/nvm)

- Install dependencies

```bash
npm i
```

- Install nx globally

```bash
npm add --global nx@latest
```

- Install commitizen

Install commitizen in your system using pipx (Recommended, https://pypa.github.io/pipx/installation/):

```bash
pipx ensurepath
pipx install commitizen
pipx upgrade commitizen
```

- Install checkov

Install checkov in your system using pipx (https://www.checkov.io/2.Basics/Installing%20Checkov.html):

```bash
pipx install checkov
```

## Commands

```bash
npx nx affected -t test:infrastructure
```

## pre-commit

- Install pre-commit:

```bash
brew install pre-commit && pre-commit install && pre-commit install
```

- If you are experiencing installation issues with brew please try:

```bash
pip install pre-commit
```

- Then use the command `pre-commit install` in order to install the hooks and run pre-commit per commit.

# Committing work

When wanting to commit changes please first squash your commits.

## Simple command line procedure

Get the current number of commits on your branch:

```bash
git rev-list --count HEAD ^main
```

Supposing this returns 3 then you have made 3 commits since creating your branch and you want to squash them down into one:

```bash
git rebase -i HEAD~3
```

Which will launch an interactive rebase session in the terminal.

## Use commitizen

Once you're happy with the squashed changed, use commitizen to commit:

```bash
cz commit
```

If you run into issues where cz commit is not updating the secrets detection and showing false results:

```bash
pip install detect-secrets
```

Update secrets baseline

```bash
detect-secrets scan --baseline .secrets.baseline
```

Which will launch an interactive commit session in the terminal.

# CI/CD - Github Actions

## Workflows

There are five workflows automating our tests, publishing and general checks:

| Workflow | Runs on            | Jobs                          |
| -------- | ------------------ | ----------------------------- |
| CI       | Pull Request, Main | `build` <ul><li>...</li></ul> |

# Testing

## Getting CloudFormation Outputs to a `.env` File

We use a helper script to automate the process of extracting outputs from your AWS CloudFormation stacks and writing them into a `.env` file, making it easy to use these values in your local applications or CI/CD pipelines. All output keys are prefixed with `CFN_`.

## Prerequisites

Before running this script, ensure you have the following installed and configured:

- AWS CLI
- jq

### Running the script

Execute the script, providing your CloudFormation stack name as the first argument.

```sh
cd auth
sh ./get-cloudformation-outputs.sh <your-stack-name>
```

This will generate a `.env` file in the current directory (`auth`) containing your CloudFormation outputs.

**Optional:** You can specify a different output file path as the second argument:

```sh
./get-cloudformation-outputs.sh <your-stack-name> config/my_app_variables.env
```

### SAM deploy to Dev Environment

We utilise the power of Nx to help us bundle, SAM build & SAM deploy our code from our own machines into the dev environment. In order to carry this out you will need to:

- Setup AWS CLI - https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-configure.html
- Signed in/configured a sign in of your AWS CLI for the desired account to deploy into (We usually use the dev account)
- Install Nx globally `npm install -g nx`
- Installed all local dependences from the root folder `npm install`

Following from this you need to configure a local.env file for deployments at `env/local.env` in the folder structure. This file needs to contain the following values

```
ENVIRONMENT=dev
USER_PREFIX=<<A prefix for stack names, we usually use our initials e.g: sb/bb>>
CODE_SIGNING_ARN=none
PERMISSION_BOUNDARY_ARN=none
SAM_DEPLOY_BUCKET=<<The SAM Deployment bucketname for the targetted AWS environment>>
CONFIG_STACK_NAME=<<This is the cloudformation stack name of your personal SSM stack deployment (e.g: sb-ssm)>>
TEST_ROLE_ARN=<<The ARN of a valid release pipeline Test Role>>
```

Beyond the values defined by yourself, the ARNs and Bucket names can be fetched from the desired AWS account. The environment is set to dev, as this deploys the dev versions of the SAM stacks for testing.

In order to then deploy we can simply use our Nx commands of:

```sh
nx affected -t sam:deploy //This deploys all stacks affected by changes
nx run <project>:sam:deploy //This would deploy a specific stack
npm run sam:deploy:all //This deploys all stacks
```

### Testing the build & deploy scripts

Some tests have been written to verify the functionality of the validate/build/deploy scripts for the SAM stacks & apps. These are very slow running tests that require a few pre-requisites to function correctly. They are:

- Signing into an AWS profile for local deployment
- Installation of Nx `npm install -g nx`
- Instalation of all dependences `npm install`

The tests for the validation script verifies the output of the XML report of the validation results. For the build script verify the creation of the SAM build folders & final template.yaml file. And finally for the deploy script call out to cloudformation after execution to verify the creation of all expected stacks from the command. All 3 are set up to verify that targetting all projects, only affected or name specifics will function. They do not run in parallel as the scripts frequently act on files within the folder structure, and have been set up to clean the structure before each test run.

In order to run these tests we have an npm script:
`npm run test:scripts`
