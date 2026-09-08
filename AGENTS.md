# Project Rules & Agent Guidelines

## 1. Automatic Turn Capture
- All prompt-and-response turns are automatically captured into `.agent-logs/` via the lifecycle hook configured in `.agents/hooks.json` and background synchronization.
- Never edit, delete, or clean up logs in `.agent-logs/`.
- Do not add `.agent-logs/` to `.gitignore`. They must be committed to the repository interleaved with work.

## 2. Assignment Verification Gate
- Do not write any application code until the Step 4 canary test verification passes and `CAPTURE-TEST.md` is completed and verified.
