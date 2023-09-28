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

CONTAINER_ENGINE ?= docker
IMAGE_REGISTRY ?= oepnim/openim-hugo
IMAGE_VERSION=$(shell scripts/hash-files.sh Dockerfile Makefile | cut -c 1-12)
CONTAINER_IMAGE   = docker pull oepnim/openim-hugo
# Mount read-only to allow use with tools like Podman in SELinux mode
# Container targets don't need to write into /src
CONTAINER_RUN     = "$(CONTAINER_ENGINE)" run --rm --interactive --tty --volume "$(CURDIR):/src:ro,Z"

HUGO_VERSION      = $(shell grep ^HUGO_VERSION netlify.toml | tail -n 1 | cut -d '=' -f 2 | tr -d " \"\n")
NODE_BIN          = node_modules/.bin
NETLIFY_FUNC      = $(NODE_BIN)/netlify-lambda

.DEFAULT_GOAL := help

CCRED=\033[0;31m
CCEND=\033[0m

# Docker buildx related settings for multi-arch images
DOCKER_BUILDX ?= docker buildx

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
	@$(TOOLS_DIR)/hugo new content content/de/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo new content content/zh/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo new content content/fr/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo new content content/es/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo new content content/zh-tw/posts/$(POST_NAME).md
	@$(TOOLS_DIR)/hugo

## build: Build site with non-production settings and put deliverables in ./public
.PHONY: build
build: tools.verify.hugo module-check
	@$(TOOLS_DIR)/hugo --cleanDestinationDir --minify --environment development

## build-preview: Build site with drafts and future posts enabled
.PHONY: build-preview
build-preview: module-check
	@$(TOOLS_DIR)/hugo --cleanDestinationDir --buildDrafts --buildFuture --environment preview

## deploy-preview: Deploy preview site via netlify
.PHONY: deploy-preview
deploy-preview:
	GOMAXPROCS=1 $(TOOLS_DIR)/hugo --cleanDestinationDir --enableGitInfo --buildFuture --environment preview -b $(DEPLOY_PRIME_URL)

## module-check: Check if all of the required submodules are correctly initialized.
.PHONY: module-check
module-check:
	@git submodule status --recursive | awk '/^[+-]/ {err = 1; printf "\033[31mWARNING\033[0m Submodule not initialized: \033[34m%s\033[0m\n",$$2} END { if (err != 0) print "You need to run \033[32mmake module-init\033[0m to initialize missing modules first"; exit err }' 1>&2

## module-init: Initialize required submodules.
.PHONY: module-init
module-init:
	@echo "Initializing submodules..." 1>&2
	@git submodule update --init --recursive --depth 1

## module-update: Updating themes
.PHONY: module-update
module-update: tools.verify.hugo
	@git submodule update --remote --merge

## production-build: Build the production site and ensure that noindex headers aren't added
.PHONY: production-build
production-build: module-check
	GOMAXPROCS=1 hugo --cleanDestinationDir --minify --environment production
	HUGO_ENV=production $(MAKE) check-headers-file

## non-production-build: Build the non-production site, which adds noindex headers to prevent indexing
.PHONY: non-production-build
non-production-build: module-check
	GOMAXPROCS=1 $(TOOLS_DIR)/hugo --cleanDestinationDir --enableGitInfo --environment nonprod

## serve: Boot the development server.
.PHONY: serve
serve: module-check
	$(TOOLS_DIR)/hugo server --buildFuture --environment development

## container-image: Build a container image for the preview of the website
container-image:
	$(CONTAINER_ENGINE) build . \
		--network=host \
		--tag $(CONTAINER_IMAGE) \
		--build-arg HUGO_VERSION=$(HUGO_VERSION)

## container-push: Push container image for the preview of the website
container-push: container-image ## Push container image for the preview of the website
	$(CONTAINER_ENGINE) push $(CONTAINER_IMAGE)

## docker-push: Build a multi-architecture image and push that into the registry
PLATFORMS ?= linux/arm64,linux/amd64
.PHONY: docker-push
docker-push:
	docker run --rm --privileged tonistiigi/binfmt:qemu-v6.2.0-26@sha256:5bf63a53ad6222538112b5ced0f1afb8509132773ea6dd3991a197464962854e --install all
	docker version
	$(DOCKER_BUILDX) version
	$(DOCKER_BUILDX) inspect image-builder > /dev/null 2>&1 || $(DOCKER_BUILDX) create --name image-builder --use
	# copy existing Dockerfile and insert --platform=${TARGETPLATFORM} into Dockerfile.cross, and preserve the original Dockerfile
	sed -e 's/\(^FROM\)/FROM --platform=\$$\{TARGETPLATFORM\}/' Dockerfile > Dockerfile.cross
	$(DOCKER_BUILDX) build \
		--push \
		--platform=$(PLATFORMS) \
		--build-arg HUGO_VERSION=$(HUGO_VERSION) \
		--tag $(CONTAINER_IMAGE) \
		-f Dockerfile.cross .
	$(DOCKER_BUILDX) stop image-builder
	rm Dockerfile.cross

container-build: module-check
	$(CONTAINER_RUN) --read-only --mount type=tmpfs,destination=/tmp,tmpfs-mode=01777 $(CONTAINER_IMAGE) sh -c "npm ci && hugo --minify --environment development"

## container-serve: Boot the development server using container.
# no build lock to allow for read-only mounts
.PHONY: container-serve
container-serve: module-check
	$(CONTAINER_RUN) --cap-drop=ALL --cap-add=AUDIT_WRITE --read-only --mount type=tmpfs,destination=/tmp,tmpfs-mode=01777 -p 1313:1313 $(CONTAINER_IMAGE) hugo server --buildFuture --environment development --bind 0.0.0.0 --destination /tmp/hugo --cleanDestinationDir --noBuildLock

test-examples:
	scripts/test_examples.sh install
	scripts/test_examples.sh run

.PHONY: link-checker-setup
link-checker-image-pull:
	$(CONTAINER_ENGINE) pull wjdp/htmltest

container-internal-linkcheck: link-checker-image-pull
	$(CONTAINER_RUN) $(CONTAINER_IMAGE) hugo --config config.toml,linkcheck-config.toml --buildFuture --environment test
	$(CONTAINER_ENGINE) run --mount "type=bind,source=$(CURDIR),target=/test" --rm wjdp/htmltest htmltest

## clean-api-reference: Clean all directories in API reference directory, preserve _index.md
clean-api-reference:
	rm -rf content/en/docs/reference/kubernetes-api/*/

## api-reference: Build the API reference pages. go needed
api-reference: clean-api-reference
	cd api-ref-generator/gen-resourcesdocs && \
		go run cmd/main.go kwebsite --config-dir ../../api-ref-assets/config/ --file ../../api-ref-assets/api/swagger.json --output-dir ../../content/en/docs/reference/kubernetes-api --templates ../../api-ref-assets/templates

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
	@$(GO) install  --tags extended github.com/gohugoio/hugo@latest
