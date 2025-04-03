#!/usr/bin/env bash

set -e

trap "rm -rf $(pwd)/sam-deploy-pipeline/tests/.venv" EXIT

pushd sam-deploy-pipeline/tests
echo "sam-deploy-pipeline/tests ... installing venv"
python -m venv .venv/
source .venv/bin/activate

echo "sam-deploy-pipeline/tests ... installing dependencies"
pip install --quiet --upgrade pip
pip install --quiet --requirement requirements.txt

echo "sam-deploy-pipeline/tests ... tearing down test stacks"
export SAM_APP_STACK_NAME=samtest-ci
export FARGATE_APP_STACK_NAME=fartest-ci
export REG_STACK_NAME=regtest-ci
export SAM_VPC_STACK_NAME=vpctest-sam-ci
export SAM_PIPELINE_STACK_NAME=pipelinetest-sam-ci
export FARGATE_VPC_STACK_NAME=vpctest-far-ci
export FARGATE_PIPELINE_STACK_NAME=pipelinetest-far-ci
export ROLE_PIPELINE_STACK_NAME=pipelinetest-role-ci
python teardown_stacks.py
deactivate
popd
