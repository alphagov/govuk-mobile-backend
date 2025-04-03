#!/usr/bin/env bash

set -eu

BUCKET_NAME="${BUCKET_NAME?Need to set BUCKET_NAME}"

function main() {
  promotion_sources_version=$(upload_promotion_sources)
  prune_lambda_versions_script_version=$(upload_prune_lambda_versions_scripts)
  fetch_and_upload_argon2_version=$(fetch_and_upload_argon2)
  transform_template "${promotion_sources_version}" "${prune_lambda_versions_script_version}" "${fetch_and_upload_argon2_version}"
}

function upload_promotion_sources() {
  echo "Upload promotion sources ..." 1>&2
  zip --junk-paths promotion_sources.zip auth-deploy-pipeline/promotion/* 1>&2
  aws s3api put-object \
    --bucket="${BUCKET_NAME}" \
    --key="auth-deploy-pipeline/promotion_sources.zip" \
    --body="promotion_sources.zip" \
    --query="VersionId" \
    --output=text
}

function upload_prune_lambda_versions_scripts() {
  echo "Upload prune-lambda-versions scripts ..." 1>&2
  zip --junk-paths prune-lambda-versions-scripts.zip auth-deploy-pipeline/prune-lambda-versions-scripts/* 1>&2
  aws s3api put-object \
    --bucket="${BUCKET_NAME}" \
    --key="auth-deploy-pipeline/prune-lambda-versions-scripts.zip" \
    --body="prune-lambda-versions-scripts.zip" \
    --query="VersionId" \
    --output=text
}

function fetch_and_upload_argon2() {
  echo "Fetch and upload argon2 ..." 1>&2
  curl -s -qL -o argon2_install.zip https://github.com/P-H-C/phc-winner-argon2/archive/refs/tags/20190702.zip 1>&2
  unzip -q argon2_install.zip 1>&2
  cd phc-* 1>&2
  zip -r -q argon2_install.zip -- * 1>&2
  aws s3api put-object \
    --bucket="${BUCKET_NAME}" \
    --key="auth-deploy-pipeline/argon2_install.zip" \
    --body="argon2_install.zip" \
    --query="VersionId" \
    --output=text
  cd .. 1>&2
}

function transform_template() {
  local promotion_sources_version=$1
  local prune_lambda_versions_script_version=$2
  local fetch_and_upload_argon2_version=$3
  local AUTH_PIPELINE_VERSION
  AUTH_PIPELINE_VERSION=$(grep "devplatform-deploy auth-deploy-pipeline template version" auth-deploy-pipeline/template.yaml | awk -F : '{ print $2 }' | sed -e 's/^[ \t]*//')

  echo "Transforming auth-deploy-pipeline template ..."
  sed -i "s|TEMPLATE_BUCKET_NAME_PLACEHOLDER|${BUCKET_NAME}|g" auth-deploy-pipeline/template.yaml
  sed -i "s|PROMOTION_SOURCES_VERSION|${promotion_sources_version}|g" auth-deploy-pipeline/template.yaml
  sed -i "s|PIPELINE_VERSION_PLACEHOLDER|${AUTH_PIPELINE_VERSION}|g" auth-deploy-pipeline/template.yaml
  sed -i "s|PRUNE_LAMBDA_VERSIONS_SCRIPTS_VERSION|${prune_lambda_versions_script_version}|g" auth-deploy-pipeline/template.yaml
  sed -i "s|ARGON2_VERSION|${fetch_and_upload_argon2_version}|g" auth-deploy-pipeline/template.yaml
}

main "$@"
