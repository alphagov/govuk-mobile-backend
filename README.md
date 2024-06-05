# GOV.UK Mobile Backend
This repository houses technical back end spikes being carried out by the GOV.UK App team.

## How the repository is laid out
* There is a `terraform` directory which contains Terraform code for provisioning longer-lived resources in AWS such as VPCs, S3 buckets, etc.
* There will be an `applications` directory which will contain applications that run business logic. These are administered using CDK to make writing serverless applications more straightforward. We will use Parameter Store to share necessary data between Terraform and CDK.

## Getting started

To install the [currently-used version of Terraform](terraform/.terraform-version):

```shell
brew install tfenv
cd terraform/
tfenv install
```

## Pre-commit hooks

There are some pre-commit hooks which are recommended. The pre-commit tool needs to be [installed](https://pre-commit.com/#install) in order to use it.
