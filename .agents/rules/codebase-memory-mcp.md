---
trigger: always_on
description: Use codebase-memory MCP for context discovery — minimum tokens, maximum precision
---

# Codebase Memory MCP — Context First

**Project ID (always pass as `project`):** `Users-alimobasheri-Documents-projects-react_native_game`

Use the `user-codebase-memory-mcp` tools **before** broad Grep/Glob/Read sweeps. Graph results are ~500 tokens vs ~80K for file dumps.

## Session Start

1. `index_status` — confirm index is current; if stale, `index_repository` then continue.
2. Only fall back to Grep/Glob when graph tools return nothing or you need literal string/regex matches graph search cannot express.

## Tool Priority (cheap → expensive)

| Need | Tool | Keep it narrow |
|------|------|----------------|
| Find symbol / definition | `search_graph` (`query` or `name_pattern`) | Add `label`, `file_pattern`, low `limit` |
| Who calls / what calls | `trace_path` | Resolve exact name via `search_graph` first; start `depth=2–3` |
| Read one function | `get_code_snippet` | Never read whole files when a snippet suffices |
| Architecture overview | `get_architecture` | One call, not directory walks |
| Local diff impact | `detect_changes` | Before editing touched symbols |
| Text / comment search | `search_code` | Prefer over reading multiple files |
| Custom graph query | `query_graph` | `LIMIT 20`; paginate if `has_more` |

## Token Discipline

- **Search narrow, then widen** — filter by `label`, `file_pattern`, or `qn_pattern` before paginating.
- **One targeted call beats many reads** — e.g. `trace_path` + `get_code_snippet` instead of opening 5 files.
- **Paginate consciously** — check `has_more`; increase `offset` only when needed.
- **Read files last** — use MCP to locate the exact file + symbol, then `Read` only the relevant range.
- **Batch independent MCP calls** in parallel when queries are unrelated.

## When NOT to use graph tools

- Runtime/debug output, config values, or assets not in the index
- Exact multi-line string matches → Grep
- File existence by path → Glob (single pattern only)

## Every MCP call

Always include:

```json
{ "project": "Users-alimobasheri-Documents-projects-react_native_game" }
```
