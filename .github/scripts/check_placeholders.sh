#!/usr/bin/env bash

# This is to ensure that we don't accidentally publish hard-coded
# values used in testing by checking that the count of each placeholder
# in the template matches expected number

set -eu

function main() {
  local status=0
  local instances_found=0

  # Update the two variables below accordingly
  # if adding or removing placeholders from template
  local placeholders=(
    "TEMPLATE_BUCKET_NAME_PLACEHOLDER"
    "PROMOTION_SOURCES_VERSION"
    "GRAFANA_SCRIPTS_VERSION"
    "PIPELINE_VERSION_PLACEHOLDER"
    "DYNATRACE_SCRIPTS_VERSION"
  )
  local placeholders_count=(14 1 1 11 4) # The number of times each placeholder is used in the template, respectively

  for i in "${!placeholders[@]}"; do
    instances_found="$(grep -o -i "${placeholders[${i}]}" sam-deploy-pipeline/template.yaml | wc -l)"

    echo "Checking for ${placeholders[${i}]} placeholder in sam-deploy-pipeline/template.yaml ..."

    if [ "${instances_found}" -ne "${placeholders_count[${i}]}" ]; then
      echo -e "\nERROR: One or more ${placeholders[${i}]} placeholders are missing from sam-deploy-pipeline/template.yaml"
      echo -e "If adding or removing placeholders from the template, please rectify .github/scripts/check_placeholders.sh\n"
      status=1
    fi

  done

  exit ${status}
}

main "$@"
