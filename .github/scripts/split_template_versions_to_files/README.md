# Template Version Splitting

## Quick Start

```bash
npm i
node main.js
```

Estimated Time 2mins (saving files locally)

The default behaviour is to save the template version locally. If you want to run with an s3 destination bucket, set the following environment variable:
```
DESTINATION_BUCKET_NAME
```

## Prerequisites

Node v20
AWS Credentials present for the script environment

## Description

This node script performs the following actions:
- Finds all `template.yaml` files in the devplatform template bucket at one level of depth
- Retrieve the info for all s3-versions of these files
- Filters down to the most recent version for each ETag (the file's MD5 hash)
- Retrieves the HeadObject for all these s3-versions to determine the templateVersion (as defined by dev platform)
- Retains the data for the most recent S3-version of each template-version
- Sorts by template-version (ascending)
- Retrieves the template from s3, and writes to the following files
  - `${template_name}.yaml`
  - `${template_name}-v${MAJOR}.yaml`
  - `${template_name}-v${MAJOR}.${MINOR}.yaml`
  - `${template_name}-v${MAJOR}.${MINOR}.${PATCH}.yaml`
