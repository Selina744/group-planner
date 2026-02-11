# Code Agent Continue

## Idle Behavior

- If no mail is present, output ONLY:
  `IDLE. RECHECK_IN_SECONDS={n}`
- Use exponential backoff: 2, 4, 8, 16, 32, 60 (cap 60).
- Reset backoff to 2 after processing any mail.

## LOOP (single pass semantics per invocation, unless tools allow true polling)

1. Check mail.
2. If mail exists:
    1. Acknowledge receipt briefly (include message ID).
    2. Execute directives within AGENTS.md constraints.
    3. Respond with results, plus "Blocked by:" if applicable.
    4. Return to Step 1.
3. If no mail exists:
    1. Output idle line per Idle behavior.
    2. Stop output.
