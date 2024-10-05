# Conventional Commits Changelog

## Overview

The Conventional Commits Changelog action automatically generates a changelog based on your project's commit history, following the Conventional Commits specification. It helps maintain a clear and standardized record of changes, making it easier for developers and users to understand the evolution of your project.

If your commit messages do not follow the Conventional Commit specs, it will convert them to Conventional Commits making a best guess searching your commits for keywords and verbs/actions. However, this is only intended to be used as a fallback and not necessary the base case.

### Features

- Automatically generates a changelog from conventional commits
- Supports [Conventional Commits](https://www.conventionalcommits.org/) specification
- Supports custom output file naming
- Configurable options for changelog generation
- Ability to use release tag commit messages as release headers

## Getting Started

### Installation

To use this action in your workflow, include it in your `.github/workflows/` directory.

### Quick Start

Here's a minimal example to get started:

```yaml
- name: Checkout Code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
    fetch-tags: true

- name: Generate Changelog
  uses: pfaciana/conventional-commits-changelog
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This basic configuration will generate a changelog whenever a new tag is pushed, using default settings.

## Usage

### Important: Full Repository Checkout

Before using this action, it's crucial to perform a full checkout of your repository, including all history and tags. This step is necessary for the action to access the complete commit history and generate an accurate changelog.

Add the following step before using the Conventional Commits Changelog action:

```yaml
- name: Checkout Code
  uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Fetch all history for all branches and tags
    fetch-tags: true  # Fetch all tags
```

Failure to include this step with the specified options may result in incomplete or inaccurate changelogs.

### Full Usage

Here's a more comprehensive example showcasing various options:

```yaml
name: Generate Changelog

on:
  workflow_dispatch:
  push:
    branches:
      - master

jobs:
  changelog:
    runs-on: ubuntu-20.04
    permissions:
      contents: write
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Fetch all history for all branches and tags
          fetch-tags: true  # Fetch all tags

      - name: Create Changelog
        id: create_changelog
        uses: pfaciana/conventional-commits-changelog
        with:
          file: CHANGELOG.md
          desc-header: true
          options: |
            {"types":{"feat_add":"📢 Added","feat_change":"⚡ Changed","feat_remove":"🗑️ Removed","fix":"🐞 Fixed"},"notice":{"keys":{"🚨 BREAKING CHANGES":"/^BREAKING[ -]CHANGE$/"}}}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Commit and Push Changelog
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add CHANGELOG.md
          git commit -m "Update CHANGELOG.md"
          git push
```

This example generates a changelog, saves it to `CHANGELOG.md`, uses custom type labels, includes release descriptions as headers, and automatically commits and pushes the updated changelog.

### Inputs

| Name        | Description                                              | Required | Default |
|-------------|----------------------------------------------------------|----------|---------|
| file        | Filename to save the changelog to                        | No       | ``      |
| options     | JSON string of options to customize changelog generation | No       | `{}`    |
| desc-header | Use release tag commit message as the release header     | No       | `false` |

### Options JSON

The `options` input allows you to customize the changelog generation. Here's a complete list of available key/value pairs:

| Key               | Description                                                    | Default                                                                               |
|-------------------|----------------------------------------------------------------|---------------------------------------------------------------------------------------|
| `coerce`          | Whether to coerce version numbers                              | `true`                                                                                |
| `onlyFirst`       | Only return the first release                                  | `false`                                                                               |
| `onlyBody`        | Include only the body of the changelog                         | `false`                                                                               |
| `types`           | Mapping of commit types to changelog sections                  | `{ feat_add: 'Added', feat_change: 'Changed', feat_remove: 'Removed', fix: 'Fixed' }` |
| `notice.keys`     | Mapping of notice labels to their checks                       | `{ 'BREAKING CHANGES': /^BREAKING[ -]CHANGE$/ }`                                      |
| `notice.all`      | Include notices from all commit types                          | `false`                                                                               |
| `notice.inFooter` | Place notices in the footer of each release section            | `true`                                                                                |
| `limit`           | Maximum number of items to retrieve                            | `500`                                                                                 |
| `addDate`         | Whether to add a date to the latest release if missing         | `true`                                                                                |
| `defaultType`     | Default type and subtype for commits without a recognized type | `{ type: 'feat', subType: 'change' }`                                                 |

Example usage in your workflow:

```yaml
- name: Build Changelog
  uses: pfaciana/conventional-commits-changelog
  with:
    options: |
      {
        "coerce": true,
        "onlyFirst": false,
        "onlyBody": false,
        "types": {
          "feat": "New Features",
          "fix": "Bug Fixes",
          "docs": "Documentation",
          "perf": "Performance Improvements"
        },
        "notice": {
          "keys": {
            "BREAKING CHANGES": "^BREAKING[ -]CHANGE$",
            "DEPRECATIONS": "^DEPRECAT(ED|ION)$"
          },
          "all": true,
          "inFooter": false
        },
        "limit": 1000,
        "params": {
          "per_page": 50
        },
        "addDate": true,
        "defaultType": {
          "type": "chore",
          "subType": "other"
        }
      }
```

This configuration provides a comprehensive set of options to fine-tune how your changelog is generated and structured.

### Outputs

| Name      | Description                     |
|-----------|---------------------------------|
| changelog | The generated changelog content |

## Examples

### Basic Usage

```yaml
- name: Generate Changelog
  uses: pfaciana/conventional-commits-changelog
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This basic example generates a changelog using default settings and outputs it to the action's log.

### Custom File Output

```yaml
- name: Generate Changelog
  uses: pfaciana/conventional-commits-changelog
  with:
    file: 'docs/CHANGELOG.md'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This example saves the generated changelog to `docs/CHANGELOG.md`.

### Advanced Configuration

```yaml
- name: Generate Changelog
  uses: pfaciana/conventional-commits-changelog
  with:
    file: 'CHANGELOG.md'
    options: '{"types": {"feat": "🚀 New Features", "fix": "🐛 Bug Fixes"}, "notice": {"keys": {"BREAKING CHANGES": "⚠️ BREAKING CHANGES"}}}'
    desc-header: 'true'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

This advanced example customizes type labels, adds emojis, configures special notices for breaking changes, and uses release descriptions as headers.

## FAQ

### Does this action support non-conventional commits?

While this action is designed primarily for repositories using conventional commits, it can still generate a changelog for repositories with mixed commit styles. However, non-conventional commits may not be categorized as precisely.

### Can I customize the changelog format?

Yes, you can customize various aspects of the changelog format using the `options` input. This includes changing section titles, adjusting the order of sections, and modifying how breaking changes are displayed.

### How far back does the changelog go?

By default, the action will generate a changelog based on all available tags in the repository. If you want to limit the scope, you can adjust the `fetch-depth` in the checkout action to control how much history is fetched.

### What happens if there are no conventional commits between releases?

If there are no conventional commits between releases, the changelog for that release will be empty or may only contain uncategorized changes.

### Can this action be used with monorepos?

Yes, this action can be used with monorepos. However, you may need to configure it to focus on specific directories or use additional steps to filter commits relevant to each package in your monorepo.

### Does this action support generating changelogs for specific versions?

Currently, the action generates a changelog for all versions. If you need a changelog for a specific version range, you might need to post-process the output or implement additional logic in your workflow.

### How does this action handle merge commits?

Merge commits are typically not included in the changelog unless they follow the conventional commit format. If you want to include information from merge commits, you may need to ensure they follow the conventional commit style.

### Can I use this action to update an existing changelog?

The action generates a new changelog each time it runs. If you want to update an existing changelog, you'll need to implement additional steps in your workflow to merge the new content with the existing file.

### Why do I need to set `fetch-depth: 0` and `fetch-tags: true` in the checkout step?

Setting `fetch-depth: 0` ensures that the entire git history is fetched, which is necessary for generating a complete changelog. The `fetch-tags: true` option ensures that all tags are fetched, which is crucial for determining version boundaries in the changelog. Without these options, the action may not have access to the full history and all tags, resulting in an incomplete or inaccurate changelog.