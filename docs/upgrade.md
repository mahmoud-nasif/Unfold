# Upgrade existing maps to a newer engine

A built page is a copy of the engine plus your map's data. When Unfold improves, pages you built earlier keep the old engine until you rebuild them. **You do not need an agent for that, and nothing is read from your code again:** the data inside each page is enough, so no tokens are spent.

## One page

```bash
python skill/unfold/scripts/unfold.py upgrade page.html --backup
```

This takes the data out of `page.html` (including everything you edited in the browser and saved or exported), checks it, and writes the same page with the current engine. `--backup` keeps the old one as `page.html.bak`. Use `-o new.html` to leave the original alone.

## Many pages

```bash
python skill/unfold/scripts/unfold.py upgrade --check docs/ maps/    # list what is out of date; exit 1 if any
python skill/unfold/scripts/unfold.py upgrade docs/ maps/ --backup   # rebuild them all
```

Folders are searched for `.html` files; files that are not Unfold pages are skipped. A page whose data no longer passes `check` is left untouched and listed with the reason.

## Installed with pipx

`pipx upgrade unfold-map` brings the newest engine, then `unfold upgrade page.html`.

## Things to know

- **Unsaved browser edits are not in the file.** Edits live in the browser until you use **Export → Page (.html)** (or **Save** on a claude.ai artifact). Export first, then upgrade.
- **Only the engine changes.** Titles, nodes, links, notes, media, tours and `meta.generation` are carried over as they are.
- **Starting from data:** if you keep `diagram.json`, `unfold.py build diagram.json page.html` does the same without extracting.
- **After a big engine change**, open the page once and look at the busiest level; new routing can place links differently from before, and **Tidy** resets any level.

## For agents

When asked to change the look or behaviour of an existing page, or to move it to the new engine, run `upgrade`. Do not re-scan the repository and do not regenerate the diagram. To edit content, `extract` the data, patch the JSON, `build`.
