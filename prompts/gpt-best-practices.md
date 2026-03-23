# OpenAI GPT Best Practices for Prompting

**Source:** https://platform.openai.com/docs/guides/prompt-engineering  
**Last Retrieved:** 2026-03-23  
**Model Version:** GPT-5.4 (if available) or GPT-4-turbo

---

## Key Principles

### 1. Clear Role Definition Upfront
- Tell GPT what role to play immediately
- Establish tone and perspective
- Sets expectations for response style

**Example:**
```
You are a senior software engineer reviewing code for bugs and security issues.
Respond with a technical, direct tone.
Focus on critical issues first, minor issues second.
```

### 2. Provide Specific Examples
- Show 2-3 concrete examples of desired behavior
- Include both good and bad examples
- Helps GPT understand patterns

**Example:**
```
Good response: "Function has O(n) time complexity, could optimize with caching"
Bad response: "This is not great"

Your task: Analyze this code and respond in the good style.
```

### 3. Step-by-Step Instructions
- Break down complex tasks into numbered steps
- GPT follows sequential instructions well
- Improves accuracy on multi-part tasks

**Example:**
```
1. Identify the main issue in this code
2. Explain why it's a problem
3. Suggest a fix
4. Estimate effort to implement
```

### 4. Token Budget Awareness
- Mention if you have a tight token budget
- GPT will write more concisely if you ask
- Helps manage costs

**Example:**
```
Constraint: Keep response under 300 tokens.
Be concise, avoid unnecessary explanation.
```

### 5. Structured Output Format
- Specify output format (JSON, bullet points, etc.)
- Helps with parsing and consistency
- Can reduce parsing errors

**Example:**
```
Output as valid JSON:
{
  "issue": "...",
  "severity": "high|medium|low",
  "fix": "..."
}
```

---

## System Prompt Best Practices

### Structure

```
1. Primary Role (who is GPT?)
2. Constraints (what should it NOT do?)
3. Tone & Style (how should it communicate?)
4. Knowledge Domain (what area of expertise?)
5. Output Preferences (format + detail level)
```

### Don't Include:
- Jailbreak attempts or workaround instructions
- Instructions to ignore previous instructions
- Credentials or sensitive data
- Contradictory constraints

### Do Include:
- Clear identity/role
- Core values/priorities
- Specific constraints
- Examples of good responses
- How to handle edge cases

---

## GPT-Specific Tips

### Strengths
- Excellent at following explicit step-by-step instructions
- Good at synthesis and summarization
- Reliable at structured output (JSON, tables, etc.)
- Fast and efficient

### Optimal Prompt Style
- Direct, clear instructions
- Explicit step numbering
- Example-driven learning
- Specific output formats requested
- Shorter prompts often work better (vs. very long context)

### Common Patterns That Work
- "Follow these steps:" prompts
- Bullet-point instructions
- 2-3 concrete examples
- Clear output format specification
- Role-based system prompts

---

## Difference from Other Models

### vs. Opus
- GPT prefers direct instructions; Opus handles ambiguity better
- GPT works best with explicit examples; Opus infers patterns
- GPT is faster (fewer compute requirements)
- Opus is more sophisticated at reasoning

### Optimization Strategy
- Use GPT for straightforward tasks with clear specs
- Use Opus for ambiguous or complex reasoning
- GPT is cheaper; use it as default if it works

---

## Common Mistakes to Avoid

1. **Vague instructions** → Be specific and numbered
2. **No examples** → Always provide 2-3 concrete examples
3. **Long meandering prompts** → Be concise
4. **Assuming prior context** → Restate key constraints
5. **Asking for contradiction** → Constraints must be compatible

---

## Prompt Template

```
[ROLE]
You are a [specific role with expertise area].

[CONSTRAINTS]
- Do NOT [important boundary]
- Always [important requirement]
- Never [important boundary]

[STYLE]
Respond with [tone], be [communication style], keep it [conciseness].

[TASK]
Follow these steps:
1. [Step 1]
2. [Step 2]
3. [Step 3]

[OUTPUT FORMAT]
Respond as [JSON/markdown/plain text]:
[Example of expected output]

[EXAMPLES]
Example 1: [input] → [expected output]
Example 2: [input] → [expected output]
```

---

## References

- Official docs: https://platform.openai.com/docs/guides/prompt-engineering
- API reference: https://platform.openai.com/docs/api-reference
- Model comparison: https://platform.openai.com/docs/models

---

**Status:** Reference document (auto-updated quarterly)  
**Next Update:** 2026-06-23
