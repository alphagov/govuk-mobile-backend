#!/usr/bin/env bash

set -eu

function main() {
  local status=0

  # shellcheck disable=SC2153
  echo "Stack to be published: ${STACK_NAME}"

  stacks=(
    "sync_s3 alerting-integration"
    "sync_s3 api-gateway-logs"
    "sync_s3 container-signer"
    "sync_s3 certificate"
    "sync_s3 certificate-expiry"
    "sync_s3 cognito-idp"
    "sync_s3 container-image-repository"
    "sync_s3 control-tower-execution"
    "sync_s3 deploy-template-test"
    "sync_s3 ecr-image-scan-findings-logger"
    "sync_s3 github-identity"
    "sync_s3 grafana-metrics"
    "sync_s3 identity-broker-oidc-provider"
    "sync_s3 signer"
    "sync_s3 test-image-repository"
    "sync_s3 upload-bucket"
    "sync_s3 cloudfront-monitoring-alarm"

    "cp_s3 sam-deploy-pipeline"
    "cp_s3 application-deploy-pipeline"
    "cp_s3 auth-deploy-pipeline"

    "sync_sam_app build-notifications"
    "sync_sam_app cloudfront-distribution"
    "sync_sam_app cloudwatch-alarm-stack"
    "sync_sam_app deployment-analysis"
    "sync_sam_app deployment-grafana-annotation"
    "sync_sam_app ecs-canary-deployment"
    "sync_sam_app grafana-key-rotation"
    "sync_sam_app vpc"
  )

  # Runs publishing command for the updated stack
  for stack in "${stacks[@]}"; do
    if [[ ${stack} == *${STACK_NAME} ]]; then
      eval "${stack}"
    fi
  done

  return ${status}
}

function cp_s3() {
  local stack_name="$1"
  local TEMPLATE_VERSION
  TEMPLATE_VERSION=$(grep "devplatform-deploy ${stack_name} template version" "${stack_name}/template.yaml" | awk -F : '{ print $2 }' | sed -e 's/^[ \t]*//')
  local metadata="repository=${GITHUB_REPOSITORY},commitsha=${GITHUB_SHA},version=${TEMPLATE_VERSION}"

  echo -e "\nPublishing stack '${stack_name}'..." 1>&2
  aws s3 cp "${stack_name}/template.yaml" \
    "s3://${BUCKET_NAME}/${stack_name}/template.yaml" --metadata "${metadata}" || status=$?
}

function sync_s3() {
  local stack_name="$1"
  local TEMPLATE_VERSION
  TEMPLATE_VERSION=$(grep "devplatform-deploy ${stack_name} template version" "${stack_name}/template.yaml" | awk -F : '{ print $2 }' | sed -e 's/^[ \t]*//')
  local metadata="repository=${GITHUB_REPOSITORY},commitsha=${GITHUB_SHA},version=${TEMPLATE_VERSION}"

  echo -e "\nPublishing stack '${stack_name}'..." 1>&2
  aws s3 sync --delete --quiet --exclude "*" --include "*emplate.yaml" "${stack_name}" "s3://${BUCKET_NAME}/${stack_name}" --metadata "${metadata}" || status=$?
}

function _go_into_app_dir() {
  local project_dir
  project_dir="$(git rev-parse --show-toplevel)"
  local app_to_deploy="$1"
  echo "Going into ${app_to_deploy}"
  cd "${project_dir}/${app_to_deploy}"
}

function _sam_build() {
  local app_to_deploy="$1"
  _go_into_app_dir "${app_to_deploy}"
  echo "Building sam app"
  sam build
}

function _sam_package() {
  local app_to_deploy="$1"
  local src_bucket_name="$2"
  local metadata="$3"

  _go_into_app_dir "${app_to_deploy}"

  echo "Creating package"
  if [ "${app_to_deploy}" == "ecs-canary-deployment" ]; then
    echo "Parsing resources to be signed"
    RESOURCES="$(yq '.Resources.* | select(has("Type") and .Type == "AWS::Serverless::Function" or .Type == "AWS::Serverless::LayerVersion") | path | .[1]' template.yaml | xargs)"
    read -ra LIST <<< "${RESOURCES}"
    PROFILES=("${LIST[@]/%/="${SIGNING_PROFILE}"}")

    sam package \
      --s3-prefix="${app_to_deploy}" \
      --s3-bucket="${src_bucket_name}" \
      --output-template-file=cf-template.yaml \
      --signing-profiles "${PROFILES[*]}"
  else
    sam package \
      --s3-prefix="${app_to_deploy}" \
      --s3-bucket="${src_bucket_name}" \
      --output-template-file=cf-template.yaml
  fi

  echo "Adding provenance data"
  yq '.Resources.* | select(has("Type") and .Type == "AWS::Serverless::Function") | .Properties.CodeUri' cf-template.yaml \
    | xargs -L1 -I{} aws s3 cp "{}" "{}" --metadata "${metadata}" || status=$?
  yq '.Resources.* | select(has("Type") and .Type == "AWS::Serverless::LayerVersion") | .Properties.ContentUri' cf-template.yaml \
    | xargs -L1 -I{} aws s3 cp "{}" "{}" --metadata "${metadata}" || status=$?
}

function _upload_to_s3() {
  local app_to_deploy="$1"
  local src_bucket_name="$2"
  local metadata="$3"
  _go_into_app_dir "${app_to_deploy}"
  echo "Uploading to S3"
  aws s3 cp cf-template.yaml "s3://${src_bucket_name}/${app_to_deploy}/template.yaml" --metadata "${metadata}" || status=$?
}

function sync_sam_app() {
  local app_to_deploy="$1"

  # (re)set working directory to project_dir
  _go_into_app_dir "."

  local TEMPLATE_VERSION
  TEMPLATE_VERSION=$(grep "devplatform-deploy ${app_to_deploy} template version" "${app_to_deploy}/template.yaml" | awk -F : '{ print $2 }' | sed -e 's/^[ \t]*//')
  local metadata="repository=${GITHUB_REPOSITORY},commitsha=${GITHUB_SHA},version=${TEMPLATE_VERSION}"

  echo -e "\nPublishing stack ${app_to_deploy}..." 1>&2
  _sam_build "${app_to_deploy}"
  _sam_package "${app_to_deploy}" "${BUCKET_NAME}" "${metadata}"
  _upload_to_s3 "${app_to_deploy}" "${BUCKET_NAME}" "${metadata}"
}

main "$@"
