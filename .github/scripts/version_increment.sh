#!/bin/bash
# Increment a version string using Semantic Versioning

update_type="$1"            # MAJOR, MINOR or PATCH
current_tag_version="$2"    # e.g v0.0.1
current_version=$(echo "$current_tag_version" | sed 's/v//') # Strip the leading v

# Build array from version string.
a=( ${current_version//./ } )

if [ "MAJOR" == $update_type ]; then
    a[0]=$((++a[0]))
    a[1]=0
    a[2]=0
elif [[ "MINOR" == $update_type ]]; then
    a[1]=$((++a[1]))
    a[2]=0
elif [[ "PATCH" == $update_type ]]; then
    a[2]=$((++a[2]))
else
    echo "Error: Update type needs to be MAJOR, MINOR or PATCH."
    exit 1
fi

new_version="v${a[0]}.${a[1]}.${a[2]}" # Add back the leading v and build version string
echo "VERSION=$new_version" >> $GITHUB_ENV
