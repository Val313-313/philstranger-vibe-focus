#!/usr/bin/env node
// vibe-focus guard hook - auto-generated
// Injects focus context into every Claude Code prompt
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

function findStateFile(dir) {
  while (dir !== dirname(dir)) {
    const stateFile = join(dir, '.vibe-focus', 'state.json');
    if (existsSync(stateFile)) return stateFile;
    dir = dirname(dir);
  }
  return null;
}

try {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const stateFile = findStateFile(projectDir);
  if (!stateFile) process.exit(0);

  const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
  if (!state.activeTaskId) {
    // No active task - remind user to start one
    const output = {
      result: "VIBE FOCUS: No active task. Before working, create and start a task:\n  vf add \"task\" -c \"criterion\"\n  vf start t1\nThis keeps your session focused.",
      suppressPrompt: false
    };
    console.log(JSON.stringify(output));
    process.exit(0);
  }

  const task = state.tasks.find(t => t.id === state.activeTaskId);
  if (!task) process.exit(0);

  const unmetCriteria = task.acceptanceCriteria
    .filter(c => !c.met)
    .map(c => "  - " + c.text)
    .join("\n");

  const metCount = task.acceptanceCriteria.filter(c => c.met).length;
  const totalCount = task.acceptanceCriteria.length;

  let scopeWarning = '';
  if (state.projectScope && state.projectScope.outOfScope.length > 0) {
    scopeWarning = "\n\nOUT OF SCOPE (refuse these): " + state.projectScope.outOfScope.join(', ');
  }

  const noteCount = (state.notes || []).filter(n => !n.promoted).length;
  const noteInfo = noteCount > 0 ? "\nPARKED NOTES: " + noteCount + " ideas saved for later (vf note --list)" : "";

  const context = [
    "VIBE FOCUS ACTIVE - STRICT MODE",
    "",
    "CURRENT TASK: " + task.id + " - " + task.title,
    "PROGRESS: " + metCount + "/" + totalCount + " criteria met",
    "",
    unmetCriteria ? "REMAINING CRITERIA:\n" + unmetCriteria : "ALL CRITERIA MET - run: vf done",
    noteInfo,
    "",
    "ENFORCEMENT: Before responding, verify the user's request relates to this task.",
    "If it does NOT relate to \"" + task.title + "\":",
    "  1. STOP immediately. Do NOT start working on the unrelated request.",
    "  2. Tell the user: \"That's not part of the current task. Let me park it.\"",
    "  3. Run: vf note \"<their idea summarized>\"",
    "  4. Then redirect: \"Back to " + task.title + " - here's what we still need to do:\"",
    "",
    "IMPORTANT: Even if the user's question seems quick or related, if it's a DIFFERENT concern",
    "than \"" + task.title + "\", it MUST be parked as a note. No exceptions. No \"quickly checking\".",
    scopeWarning,
  ].join("\n");

  const output = {
    result: context,
    suppressPrompt: false
  };
  console.log(JSON.stringify(output));
} catch (e) {
  // Silent fail - don't block Claude Code
  process.exit(0);
}
