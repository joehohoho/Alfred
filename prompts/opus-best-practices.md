# Anthropic Claude / Opus Best Practices for Prompting

**Source:** https://docs.anthropic.com/claude/docs/system-prompts  
**Last Retrieved:** 2026-03-23  
**Claude Version:** Opus 4.6

---

## Key Principles

### 1. Be Explicit About Output Format
- Tell Claude exactly what format you want (JSON, markdown, plain text, etc.)
- Provide examples of expected output
- Specify structure clearly

**Example:**
```
Output format: JSON
{
  "analysis": "...",
  "confidence": 0.0-1.0,
  "next_steps": ["..."]
}
```

### 2. Use XML Tags for Structure
- Claude responds well to structured input wrapped in XML tags
- Helps organize complex prompts
- Makes parsing easier

**Example:**
```xml
<task>
  <objective>Analyze this code for bugs</objective>
  <constraints>
    <time>5 minutes</time>
    <depth>high-level</depth>
  </constraints>
</task>
```

### 3. Provide Few-Shot Examples
- Show Claude 1-3 examples of good responses for your task
- Especially useful for complex or specialized tasks
- Examples should be realistic

**Example:**
```
Example 1:
Input: "user wants to delete their account"
Output: [SAFETY_ALERT] Account deletion is destructive. Require confirmation.

Example 2:
Input: "user wants to change password"
Output: [OK] Password change is safe. Proceed with validation.
```

### 4. Use Chain-of-Thought for Complex Reasoning
- Ask Claude to "think through" multi-step problems
- Improves accuracy on complex tasks
- Can be slower, so use selectively

**Example:**
```
Please think through this step-by-step:
1. What are the inputs?
2. What's the goal?
3. What constraints apply?
4. What's your recommendation?
```

### 5. Specify Context Window Constraints
- If token budget is limited, tell Claude
- Helps Claude write more concisely
- Improves performance on resource-limited tasks

**Example:**
```
Context constraint: Keep your response under 500 tokens.
Budget: 1000 tokens total for all outputs today.
```

---

## System Prompt Best Practices

### Structure Your System Prompt

```
1. Role/Identity (what is Claude?)
2. Core Values (what matters most?)
3. Operating Principles (how should Claude behave?)
4. Constraints (what should Claude avoid?)
5. Specific Instructions (task-specific rules)
6. Examples (show, don't just tell)
```

### Don't Include:
- API keys or credentials (use environment variables)
- Sensitive user data (load dynamically)
- Output examples that are too large (keep to <1KB)

### Do Include:
- Clear role statement
- Values + priorities
- Decision-making frameworks
- What to do when uncertain
- How to handle errors

---

## Opus-Specific Tips

### Strengths
- Excellent at complex reasoning
- Good at following detailed instructions
- Handles nuance and ambiguity well
- Strong at code generation and analysis

### Optimal Prompt Style
- Can handle longer, more complex prompts (4000+ tokens)
- Appreciates detailed context and examples
- Responds well to chain-of-thought requests
- Good at multi-turn reasoning

### Common Patterns That Work
- "Let me think through this..." prompts
- XML-structured complex tasks
- Few-shot learning examples
- Role-based system prompts ("You are a...")

---

## Common Mistakes to Avoid

1. **Vague output format** → Be specific (JSON, markdown, etc.)
2. **No examples** → Provide 1-3 examples for complex tasks
3. **Buried constraints** → Put constraints upfront or in XML tags
4. **Too much context** → Token budget limits; trim unnecessary info
5. **Assuming Claude remembers** → Repeat critical constraints in each message

---

## References

- Official docs: https://docs.anthropic.com/claude/docs/system-prompts
- API guide: https://docs.anthropic.com/claude/reference/getting-started-with-the-api
- Model card: Opus 4.6 (latest)

---

**Status:** Reference document (auto-updated quarterly)  
**Next Update:** 2026-06-23
