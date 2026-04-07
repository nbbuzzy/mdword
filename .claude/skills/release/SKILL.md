---
name: release
description: Bump version, build, publish to npm, and push to GitHub
argument-hint: [--dry-run]
disable-model-invocation: true
allowed-tools: Bash(npm *) Bash(git *) Bash(node *) Read Edit
---

Release workflow for mdword. Follow these steps exactly, stopping immediately if any step fails.

Current version: !`node -e "console.log(require('./package.json').version)"`
Git status: !`git status --short`

## Pre-flight checks

1. **Check for uncommitted changes.** If `git status --short` shows ANY output, STOP and tell the user to commit or stash first. Do not proceed.
2. **Check the current branch is main.** If not, warn the user and ask if they want to continue.

## Dry-run mode

If the user passed `--dry-run` (check $ARGUMENTS), perform all steps below EXCEPT:
- Do NOT run `npm publish`
- Do NOT run `git push`
- Print what WOULD happen at each skipped step

Label output clearly with **[DRY RUN]** when skipping.

## Steps

### 1. Ask for bump type

Ask the user which version bump they want:
- **patch** (bug fixes, small tweaks)
- **minor** (new features, backward-compatible)
- **major** (breaking changes)

Show the current version and what each option would produce. Wait for their answer before proceeding.

### 2. Bump version

Run `npm version <type> --no-git-tag-version` to bump the version in package.json.

### 3. Build

Run `npm run build`. If the build fails, revert the version bump with `git checkout package.json package-lock.json` and stop.

### 4. Run tests

Run `npm test`. If tests fail, revert the version bump and stop. If there are no test files (exit code 1 with "No test files found"), that's OK — continue.

### 5. Commit and tag

- Stage `package.json`, `package-lock.json`, and `dist/`
- Commit with message: `<new-version>` (matching existing tag convention in this repo)
- Create a git tag with the new version number (no `v` prefix — match existing convention: `0.1.4`, `0.1.5`)

### 6. Publish to npm

Run `npm publish`. If it fails, DO NOT remove the commit/tag — tell the user to investigate.

### 7. Push to GitHub

Run `git push && git push --tags`.

### 8. Summary

Print a summary:
- Old version → new version
- npm package URL
- Git tag created
- Whether this was a dry run
