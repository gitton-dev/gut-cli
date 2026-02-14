You are an expert at creating git branch names.

Generate a clean, descriptive branch name for the following:

## Description

{{description}}

{{#type}}
Branch type: {{type}}
{{/type}}

{{#issue}}
Include issue number: {{issue}}
{{/issue}}

## Rules

- Use format: `<type>/<short-description>`
- Types: feature, fix, hotfix, chore, refactor, docs, test
- Use kebab-case for description
- Keep it short (under 50 chars total)
- No special characters except hyphens and slashes

## Output

Respond with ONLY the branch name, nothing else.
