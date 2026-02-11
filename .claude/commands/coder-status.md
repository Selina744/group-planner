# Code Agent Status Report

Provide a status report covering:

## Current Assignment

- Task ID and description
- Status: idle / working / blocked / awaiting review
- Progress: what's done, what remains

## Mail State

- Last inbox check timestamp
- Unprocessed messages: count and oldest timestamp
- Last processed message ID

## File Reservations

- Currently held reservations (paths, TTL remaining)
- Any reservation conflicts encountered

## Quality Gates

- Last `ubs` run: timestamp and result
- Pending quality checks before commit

## Blockers

- Current blockers (if any)
- Clarifying questions sent to Boss (awaiting response)

## Backoff State

- Current backoff level (2/4/8/16/32/60)
- Time since last mail processed

## Output Format

```
CODER STATUS @ {timestamp}
───────────────────────────
Assignment: {task_id} - {status}
Mail: {unprocessed} pending, last check {time_ago}
Reservations: {count} active
Quality: ubs {pass/fail/pending}
Blockers: {count} active
Backoff: {n} seconds
```
