#!/usr/bin/env bash
# Doc blocks in this file follow the http://tomdoc.org format

set -e -ou pipefail

# Public: Creates/updates a pipeline using a local template. Assumes the current shell
# has credentials for the correct target account.
#
# $1 - The name of the stack that contains the signing profile.
# $2 - The local path to the directory containing the template
# $3 - The name to give to the new pipeline stack
# $4 - The name to give the pipelines application stack
#
# Examples
#
#   apply_local_pipeline_template signer /path/to/template-dir test-app-pipeline test-app
function apply_local_pipeline_template() {
  local signing_stack_name="$1"
  local pipeline_template_dir_path="$2"
  local pipeline_stack_name="$3"
  local sam_stack_name="$4"

  _export_signing_profile "$signing_stack_name"
  _apply_pipeline_template "$pipeline_template_dir_path" "$pipeline_stack_name" "$sam_stack_name"
}

function _export_signing_profile() {
  echo "Exporting signing profile details"
  local signing_stack_name="$1"
  SIGNING_PROFILE_VERSION_ARN="$(aws cloudformation describe-stacks --stack-name "$signing_stack_name" --query "Stacks[0].Outputs[?OutputKey == 'SigningProfileVersionArn'].OutputValue" --output text)"
  export SIGNING_PROFILE_VERSION_ARN
  SIGNING_PROFILE_ARN="$(echo "$SIGNING_PROFILE_VERSION_ARN" | cut -c1-83)"
  export SIGNING_PROFILE_ARN
  SIGNING_PROFILE_NAME="$(echo "$SIGNING_PROFILE_VERSION_ARN" | cut -c57-83)"
  export SIGNING_PROFILE_NAME
}

function _apply_pipeline_template() {
  local pipeline_template_dir_path="$1"
  local pipeline_stack_name="$2"
  local sam_stack_name="$3"
  echo "Applying local pipeline template to stack: $pipeline_stack_name ..."

  pipeline_stack_state="$(aws cloudformation describe-stacks --stack-name "$pipeline_stack_name" --query "Stacks[0].StackStatus" --output text || echo "NO_STACK")"
  create_or_update="$([[ $pipeline_stack_state != "NO_STACK" ]] && echo update || echo create)"
  template_bucket=cf-templates-1li26sr5ue8tp-eu-west-2

  # Create temporary file to populate placeholder values
  template_file="$pipeline_template_dir_path/template.yaml"
  promotion_sources_version="$(upload_promotion_sources "$template_bucket")"
  grafana_scripts_version="$(upload_grafana_scripts "$template_bucket")"
  sed "s|TEMPLATE_BUCKET_NAME_PLACEHOLDER|$template_bucket|g" "$template_file" > parameterised_template.yaml
  sed -i .bak "s|PROMOTION_SOURCES_VERSION|$promotion_sources_version|g" parameterised_template.yaml
  sed -i .bak "s|GRAFANA_SCRIPTS_VERSION|$grafana_scripts_version|g" parameterised_template.yaml
  aws s3 cp parameterised_template.yaml "s3://$template_bucket/${sam_stack_name}_template.yaml"
  rm parameterised_template.yaml
  rm parameterised_template.yaml.bak
  rm promotion_sources.zip
  rm grafana-scripts-v2.zip

  output="$(aws cloudformation "$create_or_update"-stack \
      --stack-name="$pipeline_stack_name" \
      --template-url="https://$template_bucket.s3.amazonaws.com/${sam_stack_name}_template.yaml" \
      --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
      --parameters \
          ParameterKey=SAMStackName,ParameterValue="$sam_stack_name" \
          ParameterKey=Environment,ParameterValue=demo \
          ParameterKey=IncludePromotion,ParameterValue=Yes \
          ParameterKey=AllowedAccounts,ParameterValue="223594937353" \
          ParameterKey=SigningProfileArn,ParameterValue="$SIGNING_PROFILE_ARN" \
          ParameterKey=SigningProfileVersionArn,ParameterValue="$SIGNING_PROFILE_VERSION_ARN" \
          ParameterKey=GitHubRepositoryName,ParameterValue="devplatform-sam-demo-app" \
      --tags Key=System,Value="Dev Platform" \
             Key=Product,Value="GOV.UK Sign In" \
             Key=Environment,Value="demo" \
             Key=repository,Value="di-devplatform-deploy" \
             Key=commitsha,Value="local-test" \
      2>&1 \
          && aws cloudformation wait stack-"$create_or_update"-complete \
              --stack-name="$pipeline_stack_name" || echo "Error" )"

  if [[ "$output" =~ "ValidationError" ]] && [[ ! "$output" =~ "No updates are to be performed" ]]; then
    echo "Pipeline stack '$pipeline_stack_name' failed with output:"
    echo "$output"
    exit 1
  fi

  pipeline_stack_state="$(aws cloudformation describe-stacks --stack-name "$pipeline_stack_name" --query "Stacks[0].StackStatus" --output text || echo "NO_STACK")"
  if [[ "$pipeline_stack_state" = "UPDATE_ROLLBACK_COMPLETE" ]]; then
    echo "Pipeline stack '$pipeline_stack_name' failed to update!"
    exit 1
  fi
  if [[ "$pipeline_stack_state" = "ROLLBACK_COMPLETE" ]]; then
    echo "Pipeline stack '$pipeline_stack_name' failed to create!"
    exit 1
  fi

}

function delete_stack_if_failed() {
  local sam_stack_name="$1"

  sam_stack_state="$(aws cloudformation describe-stacks --stack-name "$sam_stack_name" --query "Stacks[0].StackStatus" --output text || echo "NO_STACK")"
  if [[ "$sam_stack_state" = "ROLLBACK_COMPLETE" ]]; then
      echo "Deleting stack '$sam_stack_name' due to ROLLBACK_COMPLETE state ..."
      aws cloudformation delete-stack --stack-name="$sam_stack_name" \
          && aws cloudformation wait stack-delete-complete --stack-name="$sam_stack_name"
  fi
}

function watch_pipeline() {
  local pipeline_stack_name="$1"

  pipeline_name="$(aws cloudformation describe-stacks --stack-name "$pipeline_stack_name" --query "Stacks[0].Outputs[?OutputKey == 'PipelineName'].OutputValue" --output text)"
  echo "Waiting for pipeline to wake up ..."
  while true; do
      status="$(aws codepipeline list-pipeline-executions --pipeline-name "$pipeline_name" --query "pipelineExecutionSummaries | sort_by(@, &startTime)[-1:] | @[0].status" --output text | head -n1)"
      if [[ "$status" != "InProgress" ]]; then
          sleep 5
      else
          break
      fi
  done
  echo
  while true; do
      status="$(aws codepipeline list-pipeline-executions --pipeline-name "$pipeline_name" --query "pipelineExecutionSummaries | sort_by(@, &startTime)[-1:] | @[0].status" --output text | head -n1)"
      date="$(date)"

      echo -e "\r\033[1A\033[0K$date $status"
      if [[ "$status" = "InProgress" ]]
      then
          sleep 5
      else
          break
      fi
  done
}

# Public: Builds and deploys a sam application using a pipeline
#
# $1 - The local path to the directory containing the sam application
# $2 - The artifacts source bucket of the pipeline
# $3 - The metadata to apply to the artifacts when deploying
# $4 - The name of the stack containing the signing profile
#
# Examples
#
#   sync_sam_app /path/to/sam/app s3-bucket-name "commitsha=value-of-commit-sha,repository=source-sam-app-repository" signing-stack

function sync_sam_app() {
  local sam_app_dir="$1"
  local src_bucket_name="$2"
  local metadata="$3"
  local signing_stack_name="$4"
  cd "$sam_app_dir"
  echo "Running sam build"
  sam build
  echo "Running sam package"
  signing_profile_name="$(aws cloudformation describe-stacks --stack-name "$signing_stack_name" \
  --query "Stacks[0].Outputs[?OutputKey == 'SigningProfileName'].OutputValue" --output text)"
  signing_config=$(grep -F -B1 -e "Type: AWS::Serverless::Function" -e "Type: AWS::Serverless::LayerVersion" template.yaml \
  | grep -e ':$' | sed "s/^ *\(.*\):/\1=$signing_profile_name /" \
  | grep -ve '^#' | tr -d '\n' | xargs)
  sam package \
    --s3-bucket="$src_bucket_name" \
    --output-template-file=cf-template.yaml \
    --signing-profiles="$signing_config"
  echo "Adding provenance data"
  yq '.Resources.* | select(has("Type") and .Type == "AWS::Serverless::Function") | .Properties.CodeUri' cf-template.yaml \
    | xargs -L1 -I{} aws s3 cp "{}" "{}" --metadata "$metadata"
  echo "Writing Lambda Layer provenance"
  yq '.Resources.* | select(has("Type") and .Type == "AWS::Serverless::LayerVersion") | .Properties.ContentUri' cf-template.yaml \
      | xargs -L1 -I{} aws s3 cp "{}" "{}" --metadata "$metadata"
  echo "Uploading to S3"
  zip template.zip cf-template.yaml
  aws s3 cp template.zip "s3://$src_bucket_name/template.zip" --metadata "$metadata"
}

function upload_promotion_sources() {
  echo "Upload promotion sources ..." 1>&2
  bucket_name="$1"
  zip --junk-paths promotion_sources.zip sam-deploy-pipeline/promotion/* 1>&2
  aws s3api put-object \
      --bucket="$bucket_name" \
      --key="sam-deploy-pipeline/promotion_sources.zip" \
      --body="promotion_sources.zip" \
      --query="VersionId" \
      --output=text
}

function upload_grafana_scripts() {
  echo "Upload grafana scripts ..." 1>&2
  bucket_name="$1"
  zip --junk-paths grafana-scripts-v2.zip sam-deploy-pipeline/grafana-scripts/* 1>&2
  aws s3api put-object \
    --bucket="$bucket_name" \
    --key="sam-deploy-pipeline/grafana-scripts-v2.zip" \
    --body="grafana-scripts-v2.zip" \
    --query="VersionId" \
    --output=text
}

"$@"
