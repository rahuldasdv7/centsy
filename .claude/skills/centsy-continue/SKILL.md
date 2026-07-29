---
name: centsy-continue
description: Use this skill whenever Rahul says "continue project," "pick up where I left off," "continue Centsy," or otherwise asks Claude to resume, review, or move forward the Centsy personal finance app (Expo/React Native/TypeScript + Supabase + Anthropic API). Also trigger it if Rahul opens a session and starts asking about Centsy's current state, what's left to build, what's broken, or what to work on next, even if he doesn't use the word "continue." This skill inspects the actual repo (structure, package.json, README, git log, git status, git diff, TODOs) rather than relying on memory of past conversations, builds a status picture, and produces a plan for Rahul to approve BEFORE any code is written. Do not skip straight to coding — this skill's whole point is look-then-propose, not autonomous execution.
---

# Centsy: Continue Project

Acts as a senior full-stack engineer picking up someone else's in-progress
codebase. The engineer never assumes what's done — they open the project and
check. Same rule here: ground every claim about project state in what you
actually read from the repo this session, not in what a prior conversation
said the state was. Prior chat/memory context (e.g. "Phase 1 was completed,"
"V1 scope locked") is useful as a hypothesis to verify, never as a substitute
for inspection — the repo may have moved on since that was last true.

## Workflow

Follow these phases in order. Do not skip to writing code. The output of
this skill is a plan Rahul approves — not a diff.

### Phase 1 — Locate and orient

1. Find the Centsy project directory. If unsure of the path, ask once, or
   check common locations / recently modified project folders.
2. Read top-level structure (`view` the directory, 2 levels deep is usually
   enough) to see the shape: `app/` or `src/`, `supabase/` (migrations,
   functions), config files, etc.
3. Read `package.json` — dependencies, scripts, Expo/EAS config — to confirm
   current stack and catch any version drift from what you'd expect
   (Expo, React Native, TypeScript, Supabase client, Anthropic SDK).
4. Read `README.md` if present — but treat it as potentially stale;
   cross-check anything load-bearing against the actual code.

### Phase 2 — Reconstruct recent history

1. `git log --oneline -20` (or more if the project is young enough to show
   full history) to see the shape of recent work.
2. `git status` to see uncommitted changes — this is often the strongest
   signal of "what I was doing when I stopped." Uncommitted work in progress
   takes priority over inferring from commit history.
3. `git diff` (and `git diff --staged`) on anything uncommitted — read it,
   don't just note file names. Half-written code, commented-out blocks, and
   stray `console.log`/debug statements are signals of an interrupted task.
4. For the last few commits, read the actual diffs (`git show`), not just
   messages — commit messages are frequently incomplete or stale.
5. Search for open markers: `TODO`, `FIXME`, `XXX`, `HACK` across the repo
   (e.g. `grep -rn "TODO\|FIXME" --include=*.ts --include=*.tsx`).
6. If there's an issue tracker, task file, or `TODO.md`/`NOTES.md`-style doc
   in the repo, read it too.

### Phase 3 — Cross-check against known project facts

Centsy-specific things worth explicitly verifying rather than assuming:

- **Supabase state**: check `supabase/migrations/` for the latest migration
  and compare against what the running schema seems to expect. Watch for the
  known port issue that's previously blocked `supabase db push` — if a push
  is needed, flag whether that blocker still applies rather than assuming
  it's resolved or unresolved.
- **iOS build path**: EAS/Apple Developer Program enrollment has been a
  blocker for device testing/builds — check `eas.json` / app config and
  note if this still looks unresolved.
- **Ledger engine / RPC functions**: these are security-sensitive
  (SECURITY DEFINER, RLS, row-level locking). If touching anything nearby,
  read the existing functions fully before proposing changes — don't
  paraphrase from memory of "a hardened ledger engine exists."
- **V1 scope**: Charts, Insights, and Recurring Transactions are deferred to
  V1.1 — if recent commits or TODOs suggest work is drifting into that scope,
  flag it as a scope question rather than silently building it.
- **Edge Functions / auth**: there was a prior bug class where a service-role
  client caused `auth.uid()` to resolve NULL. If editing Edge Functions,
  check whether the caller's JWT is being forwarded correctly.

Don't take any of the above as given — treat each as a specific thing to go
check in the current code, since it may have already changed since it was
last discussed.

### Phase 4 — Produce the status + plan (and stop)

Present to Rahul, in the chat (not as code changes):

1. **Where things stand** — a short, concrete summary grounded in what you
   read: what's implemented, what's mid-flight (uncommitted/WIP), what's
   broken, what blockers are still live.
2. **What you'd propose to do next** — a short ordered list of concrete next
   steps, each with a one-line rationale. Call out anything ambiguous
   (e.g. "the diff suggests X was being refactored — did you want to finish
   that pattern, or revert it?").
3. **Explicit ask for a go-ahead** — end with a direct question, e.g. "Want me
   to start with #1?" or "Should I proceed with this plan, or adjust it?"

Do not write or edit code in this phase, even small fixes, even if the fix
looks obvious — surface it in the plan and let Rahul confirm first.

### Phase 5 — Execute, incrementally, after approval

Once Rahul approves (all or part of the plan):

- Work through the approved items one at a time rather than batching
  everything into one large change, so Rahul can course-correct early.
- After finishing a nontrivial chunk, briefly report what changed before
  moving to the next item — don't silently chain many steps together.
- If something during implementation contradicts the plan (e.g. a file
  isn't structured the way Phase 1–3 suggested), stop and flag it rather
  than improvising silently.

## Notes on tone

Approach the codebase the way an experienced full-stack engineer would when
picking up someone else's in-progress work: confident enough to make a
concrete recommendation, careful enough to verify before asserting, and
transparent about anything uncertain rather than glossing over it.
