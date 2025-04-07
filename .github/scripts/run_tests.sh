#!/usr/bin/env bash

export NODE_OPTIONS=--max_old_space_size=8192

function is_this_a_workspace() {
  local workspace_name=$1
  jq -e -r --arg workspace_name "${workspace_name}" '.workspaces|.[]|select(. == $workspace_name)' package.json
}

function run_feature_tests_for_workspaces() {
  local potential_workspace_names=("$@")
  declare -a workspace_names
  for workspace in "${potential_workspace_names[@]}"; do
    if is_this_a_workspace "${workspace}" > /dev/null; then
      if ! printf '%s\0' "${workspace_names[@]}" | grep -F -x -z -- "${workspace}" > /dev/null; then
        workspace_names+=("${workspace}")
      fi
    fi
  done
  if [ ${#workspace_names[@]} -eq 0 ]; then
    echo "No workspaces found" >&2
    return 0
  fi
  if [ ${#workspace_names[@]} -eq 1 ]; then
    npm test -w "${workspace_names[0]}"
  else
    ./node_modules/.bin/lerna run test --scope "{$(
      IFS=,
      echo "${workspace_names[*]}"
    )}"
  fi
}

function run_feature_tests_for_files() {
  local files=("$@")
  declare -a workspace_names
  for file in "${files[@]}"; do
    workspace_names+=("$(basename "$(dirname "${file}")")")
  done
  run_feature_tests_for_workspaces "${workspace_names[@]}"
}

function run_feature_tests() {
  if git diff --name-only HEAD^ HEAD | grep -qE '(package.json|lerna.json|pre-commit-config.yaml|.github)'; then
    # If there are changes in specified files, run all tests
    ./node_modules/.bin/lerna run test
  else
    if ! run_feature_tests_for_workspaces "$(git diff-tree -m --no-commit-id --name-only HEAD | sort | uniq)"; then
      # If no workspaces found, run all tests
      ./node_modules/.bin/lerna run test
    fi
  fi
}

function run_behave_tests() {
  pushd ecs-canary-deployment/deployment-group || exit 1
  pip3 install -r requirements.txt
  python3 -m behave tests/features
  popd || exit 1

  pushd ecs-canary-deployment/deployment-trigger || exit 1
  pip3 install -r requirements.txt
  python3 -m behave tests/features
  popd || exit 1
}

"$@"
