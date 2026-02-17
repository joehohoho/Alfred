#!/bin/bash
# setup-claude-code.sh
# Adds Claude Code shortcuts to your shell profile

SHELL_PROFILE=""

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
  SHELL_PROFILE="$HOME/.zshrc"
elif [ -n "$BASH_VERSION" ]; then
  SHELL_PROFILE="$HOME/.bashrc"
else
  echo "❌ Could not detect shell. Manually add this to your shell profile:"
  echo "source ~/.openclaw/workspace/scripts/claude-code-router.sh"
  exit 1
fi

# Check if already sourced
if grep -q "claude-code-router.sh" "$SHELL_PROFILE"; then
  echo "✅ Claude Code shortcuts already configured in $SHELL_PROFILE"
  exit 0
fi

# Add to shell profile
echo "" >> "$SHELL_PROFILE"
echo "# Claude Code Terminal Integration (Added 2026-02-13)" >> "$SHELL_PROFILE"
echo "source ~/.openclaw/workspace/scripts/claude-code-router.sh" >> "$SHELL_PROFILE"

echo "✅ Claude Code shortcuts added to $SHELL_PROFILE"
echo ""
echo "Available commands (after restarting your shell):"
echo "  cc-review     - Code review (one-shot)"
echo "  cc-explain    - Explain code (one-shot)"
echo "  cc-bugs       - Analyze logs/errors (one-shot)"
echo "  cc-tests      - Generate tests (one-shot)"
echo "  cc-dev        - Interactive feature development"
echo "  cc-arch       - Interactive architecture design"
echo "  cc-debug      - Interactive debugging"
echo "  cc-continue   - Continue last session"
echo ""
echo "Source now with: source $SHELL_PROFILE"
