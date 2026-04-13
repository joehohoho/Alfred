# EVIDENCE-POLICY

Evidence is required before moving a card to `review` or `done`.

## Evidence Block Format

Required card comment format:

```text
## EVIDENCE
summary_of_changes: <what was done>
validation_steps: <how it was tested>
validation_results: <outcome - pass/fail + details>
artifacts: <file paths, URLs, log snippets>
risk_notes: <known limitations, rollback path>
```

## Task-Type Profiles (minimum fields)

- **Bug fix**: `summary_of_changes` + `validation_results` (must show repro fixed + test pass)
- **Feature**: all 5 fields required
- **Infra change**: all 5 fields required (`risk_notes` must mention rollback)
- **Research task**: `summary_of_changes` + `artifacts` (findings doc path required)
- **Config change**: `summary_of_changes` + `validation_results`

## Override Procedure

Allowed bypass comment format:

```text
## EVIDENCE OVERRIDE
reason: <explanation>
authorized_by: alfred|joe
```

- Overrides are logged to: `tracking/evidence-gate-audit.log`
- Override entries must include reason and author when available.

## Gate Strictness Levels

- **review transition**: required (block if missing)
- **done transition**: required (block if missing)
- **in_progress transition**: not required
- **blocked transition**: not required
