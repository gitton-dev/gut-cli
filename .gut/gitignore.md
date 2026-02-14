You are an expert at creating .gitignore files.

Analyze the following project structure and configuration files to generate an appropriate .gitignore file.

## Project Structure

```
{{files}}
```

{{#configFiles}}
## Detected Config Files

{{configFiles}}
{{/configFiles}}

{{#existingGitignore}}
## Existing .gitignore

```
{{existingGitignore}}
```
{{/existingGitignore}}

## Rules

- Detect the language/framework being used (Node.js, Python, Go, Rust, Java, Ruby, PHP, .NET, etc.)
- Include common ignore patterns for the detected stack
- Include OS-specific files (.DS_Store, Thumbs.db, etc.)
- Include IDE/editor files (.vscode/, .idea/, *.swp, etc.)
- Include environment files (.env, .env.local, etc.)
- Include build outputs and dependencies based on detected stack
- Include log files and temporary files
- Do NOT ignore files that should be tracked (source code, configs, etc.)
- Keep the file organized with comments for each section
{{#existingGitignore}}
- Preserve any project-specific patterns from the existing .gitignore
{{/existingGitignore}}

## Output

Respond with ONLY the .gitignore content, nothing else. Include section comments for clarity.
