###################################=> common commands <=#############################################
# ========================== Capture Environment ===============================
# get the repo root and output path
ROOT_PACKAGE=github.com/cubxxw/blog
OUT_DIR=$(REPO_ROOT)/_output
# ==============================================================================

# define the default goal
#

SHELL := /bin/bash
DIRS=$(shell ls)
GO=go

.DEFAULT_GOAL := help

# include the common makefile
COMMON_SELF_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
# ROOT_DIR: root directory of the code base
ifeq ($(origin ROOT_DIR),undefined)
ROOT_DIR := $(abspath $(shell cd $(COMMON_SELF_DIR)/. && pwd -P))
endif
# OUTPUT_DIR: The directory where the build output is stored.
ifeq ($(origin OUTPUT_DIR),undefined)
OUTPUT_DIR := $(ROOT_DIR)/_output
$(shell mkdir -p $(OUTPUT_DIR))
endif

# BIN_DIR: The directory where the build output is stored.
ifeq ($(origin BIN_DIR),undefined)
BIN_DIR := $(OUTPUT_DIR)/bin
$(shell mkdir -p $(BIN_DIR))
endif

ifeq ($(origin TOOLS_DIR),undefined)
TOOLS_DIR := $(OUTPUT_DIR)/tools
$(shell mkdir -p $(TOOLS_DIR))
endif

ifeq ($(origin TMP_DIR),undefined)
TMP_DIR := $(OUTPUT_DIR)/tmp
$(shell mkdir -p $(TMP_DIR))
endif

ifeq ($(origin VERSION), undefined)
VERSION := $(shell git describe --tags --always --match="v*" --dirty | sed 's/-/./g')	#v2.3.3.631.g00abdc9b.dirty
endif

# Check if the tree is dirty. default to dirty(maybe u should commit?)
GIT_TREE_STATE:="dirty"
ifeq (, $(shell git status --porcelain 2>/dev/null))
	GIT_TREE_STATE="clean"
endif
GIT_COMMIT:=$(shell git rev-parse HEAD)

# COMMA: Concatenate multiple strings to form a list of strings
COMMA := ,
# SPACE: Used to separate strings
SPACE :=
# SPACE: Replace multiple consecutive Spaces with a single space
SPACE +=

## run-default: Run hugo server with default mode.
run-default:
	@$(TOOLS_DIR)/hugo server -D --gc -p 13132 --config config.default.yml

## run-profile-mode: Run hugo server with profile mode.
run-profile-mode:
	@$(TOOLS_DIR)/hugo server -D --gc -p 13133 --config config.profileMode.yml

## chroma-css: Generate chroma css.
chroma-css:
	@$(TOOLS_DIR)/hugo gen chromastyles --style=dracula > assets/css/lib/chroma-dark.css
	@$(TOOLS_DIR)/hugo gen chromastyles --style=github > assets/css/lib/chroma-light.css

## run: Run hugo server.
.PHONY: run
run: tools.verify.hugo
	@$(TOOLS_DIR)/hugo
	@$(TOOLS_DIR)/hugo server -D --gc -p 13131 --config config.yml

## new: Create a new content file and automatically add the current date.
POST_NAME ?=
.PHONY: new-post
new-post: tools.verify.hugo module-check
ifndef POST_NAME
	$(error POST_NAME is not set. Please provide a name for the post. example: make new-post POST_NAME="hello-world")
endif
	@$(TOOLS_DIR)/hugo new content content/en/posts/$(POST_NAME).md
#	@$(TOOLS_DIR)/hugo new content content/de/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo new content content/zh/posts/$(POST_NAME).md
#	@$(TOOLS_DIR)/hugo new content content/fr/posts/$(POST_NAME).md
#	@$(TOOLS_DIR)/hugo new content content/es/posts/$(POST_NAME).md
#	@$(TOOLS_DIR)/hugo new content content/zh-tw/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo

## build: Build site with non-production settings and put deliverables in ./public
.PHONY: build
build: tools.verify.hugo module-check
	@$(TOOLS_DIR)/hugo --cleanDestinationDir --minify --environment development

## module-check: Check if all of the required submodules are correctly initialized.
.PHONY: module-check
module-check:
	@git submodule status --recursive | awk '/^[+-]/ {err = 1; printf "\033[31mWARNING\033[0m Submodule not initialized: \033[34m%s\033[0m\n",$$2} END { if (err != 0) print "You need to run \033[32mmake module-init\033[0m to initialize missing modules first"; exit err }' 1>&2

## module-update: Updating themes
module-update: tools.verify.hugo
	@git submodule update --remote --merge

## clean: Clean all builds.
.PHONY: clean
clean:
	@echo "===========> Cleaning all builds TMP_DIR($(TMP_DIR)) AND BIN_DIR($(BIN_DIR))"
	@-rm -vrf $(TMP_DIR) $(BIN_DIR)
	@echo "===========> End clean..."

## help: Show this help info.
.PHONY: help
help: Makefile
	@printf "\n\033[1mUsage: make <TARGETS> ...\033[0m\n\n\\033[1mTargets:\\033[0m\n\n"
	@sed -n 's/^##//p' $< | awk -F':' '{printf "\033[36m%-28s\033[0m %s\n", $$1, $$2}' | sed -e 's/^/ /'

################################### Tools #####################################

BUILD_TOOLS ?= hugo

## tools.verify.%: Check if a tool is installed and install it
.PHONY: tools.verify.%
tools.verify.%:
	@echo "===========> Verifying $* is installed"
	@if [ ! -f $(TOOLS_DIR)/$* ]; then GOBIN=$(TOOLS_DIR) $(MAKE) tools.install.$*; fi
	@echo "===========> $* is install in $(TOOLS_DIR)/$*"

## tools: Install a must tools
.PHONY: tools
tools: $(addprefix tools.verify., $(BUILD_TOOLS))

## tools.install.%: Install a single tool in $GOBIN/
.PHONY: tools.install.%
tools.install.%:
	@echo "===========> Installing $,The default installation path is $(GOBIN)/$*"
	@$(MAKE) install.$*

.PHONY: install.addlicense
install.addlicense:
	@$(GO) install github.com/google/addlicense@latest

.PHONY: install.hugo
install.hugo:
	@$(GO) install github.com/gohugoio/hugo@latest