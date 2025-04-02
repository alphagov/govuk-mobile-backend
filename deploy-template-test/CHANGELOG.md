# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

New Changes should be put in this changelog as `## [Unreleased] - TYPE`, where `TYPE`,
is one of `MAJOR`, `MINOR`, or `PATCH` respectively.
The version and date will automatically be inserted when the release workflow runs.

See [here](https://keepachangelog.com/en/1.1.0/#how) for a list of `Types of changes` labels.

## [v1.5.2] - 2024-11-06
### Added
- Adding `network-firewall:UpdateRuleGroup`

## [v1.5.1] - 2024-02-19
### Added
- Adding `logs:ListTagsForResource`

## [v1.5.0] - 2023-12-05
### Added
- VPCFlowLog and NACL permissions in test GHA

## [v1.4.0] - 2023-11-01
### Removed
- Removed reference of alphagov/di-devplatform-deploy from GHA role trust policy
- Removed deprecated test script info from readme

## [v1.3.0] - 2023-09-21
### Added
- Added support for govuk-one-login devplatform-deploy github repository

## [v1.2.2] - 2023-06-02
### Patch
- Allow Test GHA role permissions to access DNS firewall domain-list resources in order to create,update,delete Firewall rules

## [v1.2.1] - 2023-05-09
### Added
- Added README.jinja

## [v1.2.0] - 2023-02-02
### Update
- Adding support for multiple organisation IDs.

## [v1.1.1] - 2023-01-16
### Patch
- Updating template description to trigger publish

## [v1.1.0] - 2023-01-12
### Update
- Updating `template.yaml` to be inline with the `sam-deploy-pipeline/template.yaml`

## [v1.0.0] - 2023-01-11
### Added
- Initial changelog
