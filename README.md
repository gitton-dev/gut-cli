# gut

**Git Utility Tool** - A collection of handy git commands for everyday workflows.

## Installation

```bash
npm install -g gut-cli
```

## Commands

### `gut cleanup`

Delete merged branches safely.

```bash
# Show merged branches that can be deleted
gut cleanup --dry-run

# Delete all merged local branches (with confirmation)
gut cleanup

# Also delete remote branches
gut cleanup --remote

# Skip confirmation prompt
gut cleanup --force

# Specify base branch
gut cleanup --base develop
```

### `gut conflict`

Preview potential merge conflicts before merging.

```bash
# Check current branch against main
gut conflict

# Check specific branch against main
gut conflict feature/my-feature

# Check against a different target branch
gut conflict feature/my-feature --target develop
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Link for local testing
npm link
```

## License

MIT
