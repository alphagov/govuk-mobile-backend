# GOVUK - Backend

> Backend mono-repo for GOVUK backend resources.

# Installation

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js:** Recommended install via [nvm](https://github.com/nvm-sh/nvm)

- Install dependencies

```bash
npm i
```

- Install nx globally

```bash
npm add --global nx@latest
```

- Install commitizen

Install commitizen in your system using pipx (Recommended, https://pypa.github.io/pipx/installation/):

```bash
pipx ensurepath
pipx install commitizen
pipx upgrade commitizen
```

## Commands

```bash
npx nx affected -t test:infrastructure
```

## pre-commit

- Install pre-commit:

```bash
brew install pre-commit && pre-commit install && pre-commit install
```

- If you are experiencing installation issues with brew please try:

```bash
pip install pre-commit
```

- Then use the command `pre-commit install` in order to install the hooks and run pre-commit per commit.

# Committing work

When wanting to commit changes please first squash your commits.

## Simple command line procedure

Get the current number of commits on your branch:

```bash
git rev-list --count HEAD ^main
```

Supposing this returns 3 then you have made 3 commits since creating your branch and you want to squash them down into one:

```bash
git rebase -i HEAD~3
```

Which will launch an interactive rebase session in the terminal.

## Use commitizen

Once you're happy with the squashed changed, use commitizen to commit:

```bash
cz commit
```

Which will launh an interactive commit session in the terminal.

# CI/CD - Github Actions

## Workflows

There are five workflows automating our tests, publishing and general checks:

| Workflow | Runs on            | Jobs                          |
| -------- | ------------------ | ----------------------------- |
| CI       | Pull Request, Main | `build` <ul><li>...</li></ul> |
