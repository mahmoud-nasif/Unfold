PY ?= python3
CLI := $(PY) skill/unfold/scripts/unfold.py
EXAMPLES := $(wildcard examples/*/diagram.json)

.PHONY: help engine examples check test e2e package media clean

help:            ## list targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

engine:          ## rebuild assets/template.html from engine/
	$(PY) engine/assemble.py

examples:        ## rebuild every examples/*/index.html from its diagram.json
	@for s in $(EXAMPLES); do $(CLI) build $$s $$(dirname $$s)/index.html || exit 1; done
	@cp examples/unfold/index.html skill/unfold/evals/extend-an-edited-page/files/edited-page.html

check:           ## validate every example diagram
	@for s in $(EXAMPLES); do $(CLI) check $$s || exit 1; done

test:            ## unit tests (fast, no browser)
	$(PY) -m pytest -m "not e2e"

e2e:             ## browser tests (needs: playwright install chromium)
	$(PY) -m pytest -m e2e

package:         ## build dist/unfold.zip and .skill
	$(PY) tools/package.py

media:           ## regenerate README screenshots and GIFs (needs playwright + ffmpeg)
	$(PY) tools/capture_media.py
	$(MAKE) examples

clean:
	rm -rf dist .pytest_cache **/__pycache__
