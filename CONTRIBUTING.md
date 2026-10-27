# Contributing

Thanks for helping. The project follows one rule: **if it's not a test, it's not done.**

## Ground rules

- **The engine stays generic.** `assets/template.html` must never contain anything specific to one story. Story content belongs in JSON.
- **The engine has no dependencies.** The page has no frameworks and no build step, and loads nothing at runtime except the web fonts. It has to keep working when someone opens the file offline years from now.
- **The CLI uses only the standard library**, Python 3.8+.
- **Text on the canvas stays minimal.** New features should show things visually rather than add words.

## Writing a change

1. Open an issue that states acceptance criteria in this form:

   > **Given** a node with an inner diagram, **when** the viewer presses Enter on it, **then** the camera zooms into that diagram.

2. Turn each criterion into a test. Template or interaction behaviour goes in `tests/test_e2e_page.py`, or in `test_e2e_canvas.py` (linking, layout, routing, media), `test_e2e_teach.py` (search, tours, presentation) and `test_e2e_export.py` (exports and import). Validation, build and packaging go in `tests/test_story_cli.py`, `test_understands.py` or `tests/test_skill_package.py`; installers in `test_install.py`.
3. Make the change.
4. Run `make examples` if the template changed. CI fails when a built example is stale.
5. Run `make test e2e`.
6. Add a line under *Unreleased* in `CHANGELOG.md`.
7. If the change affects how Claude should write stories, update `SKILL.md` or `references/` as well. If it changes Claude's behaviour, add or adjust a case in `skill/unfold/evals/`.

## Working on the engine

`skill/unfold/assets/template.html` is generated from `engine/`: `engine.css`, `engine.js` (with an `//@@ICONS@@` placeholder), `icons.js` and `sample.json`. Edit those, then run `make engine examples`. A test fails if the committed template is stale.

## Adding an icon, shape or colour

- **Icon:** add it to `engine/icons.js` (24 × 24, stroke-only, in the compact `M…` / `c cx cy r` / `r x y w h rx` / `e cx cy rx ry` notation) and to `ICONS` in `scripts/unfold.py`.
- **Shape:** add it to `SHAPES` and `SHAPE_ORDER` in `engine/engine.js`, give it a case in `shapeSVG`, `textBox` and `port`, and add it to `SHAPES` in `scripts/unfold.py`.
- **Level type:** add it to `TYPE_NAMES` and `TYPE_HINTS`, decide its defaults in `defShape`, `defStyle`, `defArrow`, `levelDir` and `levelRoute`, give it a layout in `layoutAny` if layered isn't right, teach `mermaidLevel` to export it, and add it to `LEVEL_TYPES` in `scripts/unfold.py`. Add a level to `examples/types/`. Document when the skill should choose it in `references/reading-code.md`.
- **Colour:** add `--c-<name>` for both themes and to `COLORS` in the template and in `scripts/unfold.py`.

Document it in `references/schema.md`. Tests fail if the template and the CLI disagree.

## Changing layout or routing

`tests/fixtures/layout/` holds hard graphs (a fan-in hub, a long pipeline with skips and a loop, grouped services). `test_auto_layout_routes_no_edge_through_a_node` must keep passing. Look at the result too: build a page from each fixture and compare before and after screenshots, counting crossings and edges that lie on top of each other.

## Improving the scanner

Add a fixture case to `tests/test_scan_repo.py`, or a file to the multi-framework fixture `tests/fixtures/polyglot/` with a case in `tests/test_scan_frameworks.py`. Write the fixture first (a few lines of real-looking code), then the pattern in `SIGNALS`. Prefer patterns that capture the *name* of what flows (route, topic, file), since that is what ends up on edge labels.

## Adding an example

Create `examples/<name>/diagram.json`, then run `make examples`. Examples must be fictional or public. Never commit diagrams of internal or confidential systems.

## Releasing

1. Make sure `CHANGELOG.md` has notes under *Unreleased*.
2. Run `make bump V=X.Y.Z`. It sets the version in `pyproject.toml`, `src/unfold_map/__init__.py`, `.claude-plugin/plugin.json` and the engine, moves the *Unreleased* notes under the new version, and rebuilds the template and examples.
3. Commit, open a pull request, and merge it.

Merging publishes everything (`.github/workflows/release.yml`): the `vX.Y.Z` tag, the GitHub release with `unfold.zip` and the changelog notes, and `unfold-map` on PyPI. To publish an existing tag to PyPI again, run the workflow by hand with that tag.
