#!/bin/bash
# acp-with-provenance.sh — Wrapper for OpenClaw ACP commands with provenance enabled
# Usage: bash acp-with-provenance.sh [ACP_ARGS]
# Example: bash acp-with-provenance.sh --help
#
# This wrapper automatically enables ACP provenance (meta+receipt) for better
# audit trails and session tracing of spawned agents.

set -euo pipefail

# Run openclaw acp with provenance enabled
# --provenance meta+receipt: include metadata + visible receipts in output
openclaw acp --provenance meta+receipt "$@"
