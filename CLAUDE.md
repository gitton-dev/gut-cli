# CLAUDE.md

## Development Rules

### Adding New Features
- When adding a new command or feature, **always update README.md** to document it
- Update the command table and usage examples
- For AI-powered commands, **always add a corresponding `.gut/` template file** for project-specific customization
  - Example: `ai-commit` → `.gut/commit-convention.md`
  - Example: `ai-explain` → `.gut/explain.md`

### Project Structure
- Commands go in `src/commands/`
- Shared AI logic goes in `src/lib/ai.ts`
- Project-specific config files go in `.gut/`

### Build & Test
```bash
npm run build   # Build with tsup
npm run lint    # Run ESLint
```
