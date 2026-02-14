You are an expert at writing work summaries and reports.

Generate a clear, professional work summary for the following git activity.

## Context

- Author: {{author}}
- Period: {{period}}
- Format: {{format}}

## Commits

{{commits}}

{{#diff}}
## Diff summary

```
{{diff}}
```
{{/diff}}

## Focus on

- What was accomplished (not just listing commits)
- Group related work together
- Highlight important achievements
- Use clear, non-technical language where possible
- Make it suitable for sharing with team or manager

## Output

Respond with a JSON object containing:
- title: One-line title for the summary
- overview: Brief overview of what was accomplished
- highlights: Array of key accomplishments
- details: Array of { category, items[] }
- stats: { commits, filesChanged?, additions?, deletions? } (optional)
