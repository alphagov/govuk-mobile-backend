# GOVUK - Backend 

> Backend mono-repo for GOVUK backend resources. 

# Installation

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

* **Node.js:** Recommended install via [nvm](https://github.com/nvm-sh/nvm)


* Install dependencies

```bash
npm i
```

* Install nx globally

```bash
npm add --global nx@latest
```

## Commands

```bash
npx nx affected -t test:infrastructure
```

## pre-commit

* Install pre-commit:

```bash
brew install pre-commit && pre-commit install && pre-commit install -tprepare-commit-msg -tcommit-msg
```

* If you are experiencing installation issues with brew please try:

```bash
pip install pre-commit
```

* Then use the command `pre-commit install` in order to install the hooks and run pre-commit per commit

# CI/CD - Github Actions

## Workflows

There are five workflows automating our tests, publishing and general checks:

| Workflow | Runs on | Jobs |
| -------- | ------- | ---- |
| CI | Pull Request, Main | `build`  <ul><li>...</li></ul> |
