# Deploy Template Test

A one-time template to be applied to the demo build account.

This template exports a role ARN that is assumed by the pre-merge GitHub Action
workflow. This ARN must be set as a repository secret so that it may be used by
the workflow (see the test step in [the workflow definition](../.github/workflows/pre-merge-checks.yaml)).
The role grants the workflow permissions to apply the sam-deploy-pipeline
template.

### Parameters
The list of parameters for this template:

| Parameter        | Type   | Default   | Description |
|------------------|--------|-----------|-------------|
| AWSOrganizationId | CommaDelimitedList | o-pjzf8d99ys,o-dpp53lco28 | Comma-separated IDs of AWS Organizations where this account and the target pipeline account are members. |


### Resources
The list of resources this template creates:

| Resource         | Type   |
|------------------|--------|
| DeployPolicy1 | AWS::IAM::ManagedPolicy |
| DeployPolicy2 | AWS::IAM::ManagedPolicy |
| DeployPolicy3 | AWS::IAM::ManagedPolicy |
| DeployPolicy4 | AWS::IAM::ManagedPolicy |
| DeployPolicy5 | AWS::IAM::ManagedPolicy |
| DeployPolicy6 | AWS::IAM::ManagedPolicy |
| DeployPolicyExtra | AWS::IAM::ManagedPolicy |
| GitHubActionsRole | AWS::IAM::Role |


### Outputs
The list of outputs this template exposes:

| Output           | Description   |
|------------------|---------------|
| GitHubActionsRoleArn | The ARN of the role that can be assumed by GitHub Actions in the govuk-one-login/devplatform-deploy repository |
