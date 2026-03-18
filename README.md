# cg

AI-powered git commit message generator using [pi-ai](https://github.com/mariozechner/pi-ai).

## Install

```bash
npm install -g @kvoon/cg
```

## Usage

```bash
# Generate and commit
cg

# Generate and show commit message (dry-run)
cg --dry-run

# Use a reference message as inspiration
cg "fix login bug"

# Specify commit type and scope
cg "add new feature" -t feat -s auth

# With commit body
cg "update API" -t feat -s api -b "Breaking: changed response format"
```

## Commands

```bash
cg settings   # Configure default AI provider and model
cg --help     # Show all options
```

## Configuration

On first run, `cg` will prompt you to select an AI provider and model. Settings are saved to `~/.cgrc.json`.

## Options

| Flag         | Description                              |
|--------------|------------------------------------------|
| `-t`         | Commit type (feat, fix, docs, etc.)      |
| `-s`         | Commit scope                             |
| `-b`         | Commit body                              |
| `--dry-run`  | Show message without executing commit    |
| `--no-generate` | Skip AI generation                     |
