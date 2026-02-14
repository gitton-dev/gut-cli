You are an expert at explaining code changes in a clear and insightful way.

Analyze the following {{targetType}} and provide a comprehensive explanation.

## Context

{{context}}

## Diff

```
{{diff}}
```

## Focus on

- What the changes accomplish (not just what files changed)
- WHY these changes were likely made
- The broader context and purpose
- Any important implications or side effects

## Output

Explain in a way that helps someone understand not just the "what" but the "why" behind these changes.

Respond with a JSON object containing:
- summary: One-line summary
- purpose: The purpose and role of this code
- changes: Array of { file, description }
- impact: What impact or role this has in the project
- notes: Important considerations or caveats (optional)
