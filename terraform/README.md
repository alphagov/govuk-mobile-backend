# Terraform
This directory contains Terraform code for administering infrastructure

The project uses a module setup. Currently there are two modules:

* `routing` which contains configuration for an API Gateway and the required permissions etc.
* `static-config` which provisions an S3 bucket for static config

## Applying Terraform

The root project (this directory) can be used to provision infrastructure, as follows:

You will need AWS credentials for the relevant environment. These can be obtained by running e.g.
```shell
eval $(gds aws govuk-integration-admin -e --art 8h)
```
which will unset existing credentials for that shell and set new ones for the (in this case integration) AWS account.

The first time you want to plan/apply config you will need to run `terraform init` inside the this directory.

Currently we are using state files stored in S3 and applying Terraform locally rather than using Terraform Cloud. We can move to Terraform Cloud later on. Running `terraform init` will set up the backend using the S3 bucket. Note that the S3 bucket for the Terraform backend is _not_ provisioned using Terraform.

Once set up, the usual `terraform plan` and `terraform apply` commands can be used. Currently it will prompt for the environment name, or you can specify it as an argument, e.g. `terraform plan -var 'govuk_environment=integration'`
