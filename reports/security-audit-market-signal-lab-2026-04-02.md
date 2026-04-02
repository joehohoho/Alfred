# Security Audit: market-signal-lab (2026-04-02)

## Summary
✅ **Overall Risk:** LOW  
2 known dependency vulnerabilities found. Code hygiene is good (no hardcoded secrets, no unsafe patterns).

---

## Vulnerabilities Found

### 1. **CVE-2026-4539** — pygments 2.19.2 (Severity: LOW)
**Issue:** Inefficient regex in AdlLexer (DoS potential via local access only)
**Current:** pygments 2.19.2  
**Fix:** Update to pygments 2.20.0  
**Impact:** Low — local-only attack, requires code that directly uses AdlLexer  
**Recommendation:** Update in next maintenance release

### 2. **CVE-2026-25645** — requests 2.32.5 (Severity: MEDIUM)
**Issue:** Predictable temp file extraction in `extract_zipped_paths()`  
**Current:** requests 2.32.5  
**Fix:** Update to requests 2.33.0+  
**Impact:** Medium — only affects apps calling `extract_zipped_paths()` directly  
**Recommendation:** **UPDATE ASAP** — market-signal-lab does not appear to call this function, but it's best practice to stay current

---

## Code Audit Results

✅ **Secrets & Credentials:**
- No hardcoded API keys, passwords, or tokens found
- `.gitignore` properly excludes `.env` files
- `.env` file not present in repo (as expected)

✅ **Unsafe Patterns:**
- No `pickle`, `eval`, `exec`, `os.system`, or `subprocess` without logging
- Bare `except` clauses have been cleaned (commit a0d0d00: "fix: replace bare except in ML filter")
- Dead code cleanup done (commit 2ca7dd3)

✅ **Recent Security Improvements:**
- pip-audit added to CI (commit 5fba13e)
- Exception handling improved (commit a0d0d00)
- Unused code removed (commits 2ca7dd3, c436431)

---

## Recommendations

### Priority 1 (Next Release)
```bash
pip install --upgrade requests>=2.33.0
pip install --upgrade pygments>=2.20.0
```

### Priority 2 (Consider)
- Enable GitHub Dependabot to auto-alert on new CVEs
- Add pre-commit hook to run `pip-audit` before commits
- Pin exact versions in `pyproject.toml` for reproducible builds

---

## Files Checked
- `pyproject.toml` — dependencies reviewed
- `src/` — code patterns scanned
- `.gitignore` — secrets handling checked
- `git log` — recent changes reviewed

**Audit completed:** 2026-04-02 19:18 ADT  
**Auditor:** Alfred (automated security scan)
