#!/usr/bin/env bash

set -e

trap "rm -rf $(pwd)/sam-deploy-pipeline/tests/.venv $(pwd)/sam-deploy-pipeline/promotion/.venv" EXIT

 function go_into_app_dir() {
   local project_dir=$(git rev-parse --show-toplevel)
   local app_to_deploy="$1"
   echo "Going into application directory $app_to_deploy"
   cd "$project_dir/$app_to_deploy"
 }

function sam_build() {
  local app_to_deploy="$1"
  go_into_app_dir "$app_to_deploy"
  echo "Building sam app $1"
  sam build
}

function sam_package() {
  local app_to_deploy="$1"
  local src_bucket_name="$2"

  go_into_app_dir "$app_to_deploy"

  echo "Creating package"
  sam package \
    --s3-prefix="$app_to_deploy" \
    --s3-bucket="$src_bucket_name" \
    --output-template-file=cf-vpc-template.yaml
}

include_promotion_tests=${INCLUDE_PROMOTION_TESTS:-true}

if [ "${include_promotion_tests}" = "true" ]; then
    pushd sam-deploy-pipeline/promotion
    echo "sam-deploy-pipeline/promotion ... installing venv"
    python -m venv .venv/
    source .venv/bin/activate
    echo "sam-deploy-pipeline/promotion ... installing dependencies"
    pip install --quiet --upgrade pip
    pip install --quiet --requirement requirements.txt
    echo "sam-deploy-pipeline/promotion ... unit testing"
    python -m unittest promote_test.py
    deactivate
    popd
fi

# build vpc template
sam_build vpc
sam_package vpc "$DEPLOY_TEST_BUCKET_NAME"
go_into_app_dir

# run tests
pushd sam-deploy-pipeline/tests
echo "sam-deploy-pipeline/tests ... installing venv"
python -m venv .venv/
source .venv/bin/activate
echo "sam-deploy-pipeline/tests ... installing dependencies"
pip install --quiet --upgrade pip
pip install --quiet --requirement requirements.txt
echo "sam-deploy-pipeline/tests ... running deploy test"
export AWS_RETRY_MODE=adaptive
export AWS_MAX_ATTEMPTS=8
export SIGNING_PROFILE=$SIGNING_PROFILE_NAME
export NO_DELETE=true
export SAM_VPC_STACK_NAME=vpctest-sam-ci
export SAM_PIPELINE_STACK_NAME=pipelinetest-sam-ci
export FARGATE_VPC_STACK_NAME=vpctest-far-ci
export FARGATE_PIPELINE_STACK_NAME=pipelinetest-far-ci
export ROLE_PIPELINE_STACK_NAME=pipelinetest-role-ci
python -m pytest --dist loadfile -n 4 . --capture=tee-sys
deactivate
popd