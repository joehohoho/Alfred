#!/bin/bash
# claude-code-router.sh
# Intelligently routes tasks to Claude Code (terminal) vs OpenClaw (background)
# Usage: route_task "task_type" "context" "additional_args"

set -e

# TASK ROUTING DECISION TREE
route_task() {
  local task_type="$1"
  local context="$2"
  local additional_args="$3"
  
  case "$task_type" in
    # ONE-SHOT ANALYSIS (use -p flag, exit after)
    "code-review")
      echo "🔍 Code review (one-shot) → Claude Code"
      claude -p "Review this code for:\n- Security vulnerabilities\n- Performance bottlenecks\n- Best practices\n- Bugs or edge cases\n\nProvide specific recommendations.\n\n$context" $additional_args
      ;;
    
    "explain-code")
      echo "📖 Code explanation → Claude Code"
      claude -p "Explain this code concisely. What does it do? How does it work?\n\n$context" $additional_args
      ;;
    
    "find-bugs")
      echo "🐛 Bug analysis → Claude Code"
      claude -p "Analyze these logs/errors. What's the root cause? How do we fix it?\n\n$context" $additional_args
      ;;
    
    "refactor-suggest")
      echo "♻️ Refactor suggestions → Claude Code"
      claude -p "Suggest refactoring improvements for this code:\n\n$context" $additional_args
      ;;
    
    "generate-tests")
      echo "✅ Test generation → Claude Code"
      claude -p "Write comprehensive unit tests for this function/module:\n\n$context" $additional_args
      ;;
    
    # INTERACTIVE MODE (conversational, iterative)
    "feature-dev")
      echo "🚀 Feature development (interactive) → Claude Code"
      claude "Build this feature. Ask me clarifying questions if needed:\n\n$context"
      ;;
    
    "debug-iterative")
      echo "🔧 Interactive debugging → Claude Code"
      claude "Help me debug this issue. I may ask follow-up questions:\n\n$context"
      ;;
    
    "architecture-design")
      echo "🏗️ Architecture design → Claude Code"
      claude "Design the architecture for this system. Let's discuss tradeoffs:\n\n$context"
      ;;
    
    "refactor-interactive")
      echo "♻️ Interactive refactoring → Claude Code"
      claude "Refactor this codebase. Let's work through it together:\n\n$context"
      ;;
    
    # PIPED INPUT (read from stdin, output to stdout)
    "analyze-logs")
      echo "📊 Log analysis → Claude Code"
      claude -p "Analyze these logs. Identify errors, warnings, patterns:\n" $additional_args
      ;;
    
    "review-diff")
      echo "📝 Diff review → Claude Code"
      claude -p "Review this diff. Any concerns? Improvements?" $additional_args
      ;;
    
    # CONTINUE SESSION
    "continue")
      echo "⏭️ Continuing previous session → Claude Code"
      claude -c "$context"
      ;;
    
    *)
      echo "❌ Unknown task type: $task_type"
      echo ""
      echo "Available task types:"
      echo "  ONE-SHOT: code-review, explain-code, find-bugs, refactor-suggest, generate-tests, analyze-logs, review-diff"
      echo "  INTERACTIVE: feature-dev, debug-iterative, architecture-design, refactor-interactive"
      echo "  SESSION: continue"
      return 1
      ;;
  esac
}

# CONVENIENCE SHORTCUTS
cc-review() {
  # Quick code review: cc-review < myfile.js
  route_task "code-review" "$(cat)" "$@"
}

cc-explain() {
  # Explain code: cc-explain < myfile.js
  route_task "explain-code" "$(cat)" "$@"
}

cc-bugs() {
  # Debug logs: tail -f app.log | cc-bugs
  route_task "analyze-logs" "$(cat)" "$@"
}

cc-tests() {
  # Generate tests: cc-tests < myfunction.js
  route_task "generate-tests" "$(cat)" "$@"
}

cc-dev() {
  # Interactive feature dev: cc-dev "build a login form"
  route_task "feature-dev" "$1" "$@"
}

cc-arch() {
  # Interactive architecture: cc-arch "design a payment system"
  route_task "architecture-design" "$1" "$@"
}

cc-debug() {
  # Interactive debugging: cc-debug "user reports login fails silently"
  route_task "debug-iterative" "$1" "$@"
}

cc-continue() {
  # Continue last session: cc-continue
  route_task "continue" "" "$@"
}

# Export functions if sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  # Called directly, run the function
  route_task "$@"
else
  # Sourced, export functions
  export -f route_task
  export -f cc-review cc-explain cc-bugs cc-tests
  export -f cc-dev cc-arch cc-debug cc-continue
fi
