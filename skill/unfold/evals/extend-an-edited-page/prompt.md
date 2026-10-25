---
tags: [unfold]
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Write, Edit, Bash]
---

I tweaked this diagram in the browser and exported it. Inside Engine template, give Persistence its own process diagram: an edit marks the page dirty, after a short pause the draft is written to localStorage, Save publishes the page when the host allows it and otherwise the user exports. Keep everything I changed.

Input files: edited-page.html
