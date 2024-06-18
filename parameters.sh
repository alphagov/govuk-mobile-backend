# This file contains constants that are shared between Terraform and CDK (through
# Parameter Store). You can source this file to set the relevant env vars
# for Terraform before running plan/apply. There are undoubtedly better ways to
# do this but this is fine for now.

# We will need to configure these in the CI pipeline once we set it up

export TF_VAR_param_api_gateway_id=GOVUK_APP_API_GATEWAY_ID
export TF_VAR_param_api_gateway_root_resource_id=GOVUK_APP_API_GATEWAY_ROOT_RESOURCE_ID
