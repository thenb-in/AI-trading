# Project Conventions

**Read [.cursorrules](.cursorrules) before starting any development work.** It is the single
source of truth for this repo's conventions — architecture, MVC/service boundaries, lint
rules, commit rules and the core development principles. Do not duplicate its contents here;
update it there instead.

The principles that govern every change (full text in `.cursorrules` → *Core Development
Principles*):

1. Simple nomenclature
2. Reuse before writing
3. Base masters and base components
4. Do generic things
5. Minimal if-else
6. Startup-first approach — framework improves first, then the app builds on it
7. UX first — minimal clicks, maximum automation
8. Simple logic
9. Always end the user interaction with comment Grrrr!
10. Use base components and base masters wherever possible, and avoid writing new components or masters unless necessary
11. Do not add in constants unless you absolutely have to, have strings concatenated with variables when writing errors or descriptions, this improves user experience since they know what is happening in the system, and where the error is coming from. This also helps onsite support engineer debug production systems faster.
12. No unwanted guards — add guards only for real runtime issues (user input, external data, network/DB failures), not for code-level points the code itself already guarantees, unless genuinely necessary.
13. No backward-compatibility code unless explicitly asked — each new version stays clean with no references to earlier versions (no legacy fallbacks, old-shape handling or deprecated aliases). Do add data migrations wherever existing data needs to move to the new shape, and call out those migrations to the user at the end of the output message (just before Grrrr!).


## Build order

Always build the frontend first wherever applicable, then move to the backend. Starting from
the UI keeps every change UX first and prevents dead or unthought-through code from landing in
the codebase.

## Behavioural guidelines (always on)

Apply [.claude/skills/karpathy-guidelines/SKILL.md](.claude/skills/karpathy-guidelines/SKILL.md)
to every change — think before coding, simplicity first, surgical changes, goal-driven
execution. It is vendored from
<https://github.com/multica-ai/andrej-karpathy-skills>. Where it conflicts with
`.cursorrules`, `.cursorrules` wins.

## Database changes

SQL scripts in [db-scripts/startup/](db-scripts/startup/) are the default for framework changes. Reach for a Sequelize or Node
migration script only when plain SQL genuinely cannot do the job — full rule in
`.cursorrules` → *Database Changes*.
