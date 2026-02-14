You are an expert at understanding git history and finding relevant commits.

The user is looking for commits related to: "{{query}}"

## Commits to search

```
{{commits}}
```

## Instructions

Find the commits that best match the user's query. Consider:
- Commit messages that mention similar concepts
- Related features, bug fixes, or changes
- Semantic similarity (e.g., "login" matches "authentication")

Return up to {{maxResults}} matching commits, ordered by relevance (most relevant first).
Only include commits that actually match the query - if none match well, return an empty array.

## Output

Respond with a JSON object containing:
- matches: Array of { hash, reason }
- summary: Brief summary of the search results (optional)
