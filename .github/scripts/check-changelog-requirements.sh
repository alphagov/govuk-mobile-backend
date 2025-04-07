#!/usr/bin/env bash

# Check that changes have occured within only one root level directory
# If that directory is a stack directory, check that the needed
# CHANGELOG.md entry has been made

set -eu

# get the list of directories updated
# git diff-tree may return a list like:
#
# .github
# README.md
# sam-deploy-pipeline
#
# where README.md is a file in root, and .github and sam-deploy-pipeline are
# directories.
# This is handled by setting rootModified if a file is found, and adding . to the
# array modifiedDirs

rootModified=false
modifiedDirs=()

for item in $(git diff-tree -m --no-commit-id --name-only HEAD | sort | uniq); do
echo $item
if [ -f $item ]; # test if item is a file
then
    echo "Project root modified"
    rootModified=true
elif [ $item == '.github' ]; # Considering .github, the same as projectRoot.
then
    echo "Project root modified .github directory"
    rootModified=true
else # assume returned item is a directory and add to array
    echo "Project directory $item modified"
    modifiedDirs+=("$item")
fi
done

if $rootModified ; then
modifiedDirs+=(".") # add entry for root
fi

modifiedDirCount=${#modifiedDirs[@]} # Directory count is the length of the array

if [[ $modifiedDirCount -gt 1 ]]
then
    echo "Changelog process cannot handle changes to multiple directories, ($modifiedDirCount) were modified"
    echo "If you only modified one directory, please make sure to rebase your branch"
    exit 1
fi

MODIFIED_DIR="${modifiedDirs[0]}"


# See if the change is to a stack
UPDATE_CHANGELOG=false
for stack_dir in $(".github/scripts/find_stack_directories.sh"); do
if [[ $MODIFIED_DIR == $(basename $stack_dir) ]]
    then
    STACK_NAME=$MODIFIED_DIR
    # Check that the updated stack has had the changelog updated:
    for changed_item in $(git diff-tree -m --no-commit-id --name-only -r HEAD); do
        if [[ $STACK_NAME/CHANGELOG.md == $changed_item ]]
        then
            # Set the variables and outputs needed for changelog update
            echo "STACK_NAME=$MODIFIED_DIR"
            echo "STACK_NAME=$MODIFIED_DIR" >> $GITHUB_ENV

            UPDATE_CHANGELOG=true
            echo "UPDATE_CHANGELOG=true"
            echo "UPDATE_CHANGELOG=true" >> $GITHUB_ENV

            CHANGELOG_FILE=$STACK_NAME/CHANGELOG.md
            echo "CHANGELOG_FILE=$STACK_NAME/CHANGELOG.md"
            echo "CHANGELOG_FILE=$STACK_NAME/CHANGELOG.md" >> $GITHUB_ENV
        fi
    done
    # If the updated stack has not had the changelog updated then stop:
    if [[ $UPDATE_CHANGELOG != true ]]
        then
        echo "Stack Directory $STACK_NAME needs $STACK_NAME/CHANGELOG.md to be updated"
        exit 1
    fi
fi
done