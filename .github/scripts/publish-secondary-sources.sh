#!/usr/bin/env bash

set -eu

function main() {
  promotion_sources_version=$(upload_promotion_sources)
  grafana_scripts_version=$(upload_grafana_scripts)
  dynatrace_scripts_version=$(upload_dynatrace_scripts)
  transform_template "$promotion_sources_version" "$grafana_scripts_version"
}

function upload_promotion_sources() {
  echo "Upload promotion sources ..." 1>&2
  zip --junk-paths promotion_sources.zip sam-deploy-pipeline/promotion/* 1>&2
  aws s3api put-object \
      --bucket="$BUCKET_NAME" \
      --key="sam-deploy-pipeline/promotion_sources.zip" \
      --body="promotion_sources.zip" \
      --query="VersionId" \
      --output=text
}

function upload_grafana_scripts() {
  echo "Upload grafana scripts ..." 1>&2
  zip --junk-paths grafana-scripts-v2.zip sam-deploy-pipeline/grafana-scripts/* 1>&2
  aws s3api put-object \
    --bucket="$BUCKET_NAME" \
    --key="sam-deploy-pipeline/grafana-scripts-v2.zip" \
    --body="grafana-scripts-v2.zip" \
    --query="VersionId" \
    --output=text
}

function upload_dynatrace_scripts() {
  echo "Upload dynatrace scripts ..." 1>&2
  zip --junk-paths dynatrace-scripts.zip sam-deploy-pipeline/dynatrace-scripts/* 1>&2
  aws s3api put-object \
    --bucket="$BUCKET_NAME" \
    --key="sam-deploy-pipeline/dynatrace-scripts.zip" \
    --body="dynatrace-scripts.zip" \
    --query="VersionId" \
    --output=text
}

function transform_template() {
  local promotion_sources_version=$1
  local grafana_scripts_version=$2
  local PIPELINE_VERSION=$(grep "devplatform-deploy sam-deploy-pipeline template version" sam-deploy-pipeline/template.yaml  | awk -F : '{ print $2 }' | sed -e 's/^[ \t]*//' )

  echo "Transforming sam-deploy-pipeline template ..."
  sed -i "s|TEMPLATE_BUCKET_NAME_PLACEHOLDER|$BUCKET_NAME|g" sam-deploy-pipeline/template.yaml
  sed -i "s|PROMOTION_SOURCES_VERSION|$promotion_sources_version|g" sam-deploy-pipeline/template.yaml
  sed -i "s|GRAFANA_SCRIPTS_VERSION|$grafana_scripts_version|g" sam-deploy-pipeline/template.yaml
  sed -i "s|DYNATRACE_SCRIPTS_VERSION|$dynatrace_scripts_version|g" sam-deploy-pipeline/template.yaml
  sed -i "s|PIPELINE_VERSION_PLACEHOLDER|$PIPELINE_VERSION|g" sam-deploy-pipeline/template.yaml
}

main "$@"
