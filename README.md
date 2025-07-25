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

- Setup AWS CLI - https://docs.aws.amazon.com/cli/v1/userguide/cli-chap-configure.html  
  Validate the SAM template `sam validate --lint`
- Build SAM project `sam build`
- Run guided deployment `sam deploy --guided` to create the \*.toml file
- Update the toml file as below and update local deployment variables

```
...
stack_name = "<your-stack-name>"
s3_prefix = "<your-stack-name>"
parameter_overrides = "Environment=\"dev\" CodeSigningConfigArn=\"none\" PermissionsBoundary=\"none\" ConfigStackName=\"<your-ssm-config-name>\""
```
