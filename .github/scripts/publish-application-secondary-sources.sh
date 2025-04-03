#!/usr/bin/env bash

set -eu

function main() {
  promotion_sources_version=$(upload_promotion_sources)
  grafana_scripts_version=$(upload_grafana_scripts)
  transform_template "$promotion_sources_version" "$grafana_scripts_version"
}

function upload_promotion_sources() {
  echo "Upload promotion sources ..." 1>&2
  zip --junk-paths promotion_sources.zip application-deploy-pipeline/promotion/* 1>&2
  aws s3api put-object \
      --bucket="$BUCKET_NAME" \
      --key="application-deploy-pipeline/promotion_sources.zip" \
      --body="promotion_sources.zip" \
      --query="VersionId" \
      --output=text
}

function upload_grafana_scripts() {
  echo "Upload grafana scripts ..." 1>&2
  zip --junk-paths grafana-scripts-v2.zip application-deploy-pipeline/grafana-scripts/* 1>&2
  aws s3api put-object \
    --bucket="$BUCKET_NAME" \
    --key="application-deploy-pipeline/grafana-scripts-v2.zip" \
    --body="grafana-scripts-v2.zip" \
    --query="VersionId" \
    --output=text
}

function transform_template() {
  local promotion_sources_version=$1
  local grafana_scripts_version=$2
  local APPLICATION_PIPELINE_VERSION=$(grep "devplatform-deploy application-deploy-pipeline template version" application-deploy-pipeline/template.yaml  | awk -F : '{ print $2 }' | sed -e 's/^[ \t]*//' )

  echo "Transforming application-deploy-pipeline template ..."
  sed -i "s|TEMPLATE_BUCKET_NAME_PLACEHOLDER|$BUCKET_NAME|g" application-deploy-pipeline/template.yaml
  sed -i "s|PROMOTION_SOURCES_VERSION|$promotion_sources_version|g" application-deploy-pipeline/template.yaml
  sed -i "s|GRAFANA_SCRIPTS_VERSION|$grafana_scripts_version|g" application-deploy-pipeline/template.yaml
  sed -i "s|PIPELINE_VERSION_PLACEHOLDER|$APPLICATION_PIPELINE_VERSION|g" application-deploy-pipeline/template.yaml
}

main "$@"
