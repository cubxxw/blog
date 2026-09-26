---
title: 'Maintaining a UI on Your Own: A Design System with Figma, Figwright, and AI'
date: 2026-09-26T15:18:51+08:00
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Development
  - AI
  - Agent
  - MCP
  - Context Engineering
  - Solo Builder
description: >
  Maintain a UI on your own with free Figma, Figwright, and AI: organize design files, tokens, and components, judge visuals, and update Web and iOS together.
cover:
  image: /images/covers/engineering/2026/figma-figwright-personal-design-system.jpg
  alt: 'A design canvas connected by lines to desktop and mobile interfaces'
  relative: false
---

I build products on my own, and I want a design system that helps me maintain their UI and frontend over time. Finishing a page is only the beginning: features get added, styles change, and another platform may need support. When I return to a project, I want to build on the design already there and understand what a change will affect.

That calls for a method I can maintain myself. When I want to change a color, I need to know where to edit it. When I want a different layout, I need somewhere to compare options. When I hand implementation to AI, it needs to find the existing components. I also want the interface to feel more thoughtfully designed, while starting with free tools wherever possible. File organization, tool choices, and visual judgment are connected problems.

I already use Figwright for free. [DayPage](https://github.com/getyak/daypage), an iOS and Web journaling project, gives this discussion a concrete setting. This article lays out a workflow to try next; its recommendations still need to be tested through actual work.

We will use **a DayPage memo card as a proposed exercise**. An entry has body text, a timestamp, a sync status, and actions. First, we will implement a version that includes a failure state. Then we will move the retry action from a menu to a position beside the error message. The card structure, variable names, and interfaces are illustrative; they do not describe DayPage's current implementation. This small change is enough to take us through design, code, and ongoing maintenance.

## Before changing the interface, know where to make the change

Suppose the status text at the bottom of a card is gray in Figma, uses a color called `muted` on the Web, and has a similar hard-coded value on iOS. The results look alike, but they may represent three different meanings: secondary information, a disabled control, or a sync that has not finished.

If “Save failed” now needs more emphasis, telling an agent to “change the gray to red” can easily affect the wrong elements. More useful questions are: Where is the meaning of this state defined? Where is its color maintained? Which components use it?

Repeated values such as colors and spacing can be given stable names and used by those names throughout a project. These are **design tokens**. A card's structure and behavior can be encapsulated in a component: `MemoCard`, for example, might accept body text and a status, display the content, and handle actions. Tokens help keep values consistent; components help reuse implementation.

For a personal project with existing code, I recommend finding the maintenance entry point by asking, “What am I trying to change?” The filenames below are examples; you can keep your existing organization.

| What you want to change | Where to edit | What to do after accepting the change |
| --- | --- | --- |
| Reading priorities or design trade-offs | Project design notes such as `DESIGN.md` | Record the reasoning and conditions, then identify the interfaces that should follow |
| Arrangement, density, or whitespace | An experimental area in Figma | Compare with identical content; after you choose a direction, move it to the accepted area and implement it |
| Shared values such as colors and spacing | A single source file such as `tokens.json` | Generate CSS / Swift output, update canvas variables, and check affected interfaces |
| Behavior such as clicking, retrying, or expanding | Actual component code and state examples | Check the interface, interaction, and layout, then update Figma state views or annotations |
| The link between a canvas element and its implementation | Component and token mapping records | Confirm that rendering is correct before saving the mapping; maintain it when names change |

“Single source” needs to be understood by information type. Figma is useful for comparing space, hierarchy, and arrangement. Code is where keyboard focus, request failures, and responsive behavior can be shown to work. Forcing every fact into one file will soon make that file difficult to maintain.

For example, to make an error message more noticeable, first compare bold text with a lightly colored background in Figma's experimental area. After you choose a version, update the relevant semantic token if only the color changes. If you also add a retry button, update the state component as well. Generate the outputs, check the canvas, inspect the actual page, and then record the version you accepted.

**Generated CSS / Swift files are outputs; edits belong in the source.** A color fixed directly in generated CSS may be overwritten the next time generation runs. A change made only in Figma will not reach the product implementation. Where automatic synchronization is not yet available, keep an explicit manual step and check both sides afterward.

### Leave an entry point for the next agent

Even solo maintenance involves handoffs: from yourself today to yourself when you reopen the project, or from one agent to another. The project's `AGENTS.md` / `CLAUDE.md` can serve as a starting point, pointing to design notes, token sources, and component locations. I recommend keeping paths and working instructions there, while concentrating design reasoning in `DESIGN.md`, so several files do not each carry their own copy of the rules.

A compact entry point could look like this. Replace the paths with the project's actual locations:

```text
Read DESIGN.md before changing the interface.
Edit colors and spacing in tokens.json, then run the project's existing generation command.
Reuse existing components; see docs/figma-component-map.md for locations and confirmed mappings.
Check affected states afterward, and bring the accepted canvas and design notes up to date.
```

You do not need to feed every document to the model every time. For a card status change, provide the relevant design conventions, state component, tokens, and canvas region. If the design reasoning has not changed, a small fix does not require rewriting `DESIGN.md`.

For a new project led primarily by design work, variables in the design tool can also be the initial source. The export direction and steps for accepting changes still need to be explicit. This article works with existing Web and iOS code, so it uses a repository to maintain tokens and a canvas to preserve exploration and visual evidence.

## Free Figma is enough to start, but the file needs structure

As of September 26, 2026, Figma Starter does not include Dev Mode or team libraries, and its version history covers 30 days. It allows unlimited drafts, but Design files in a Starter team can have at most three pages. Unlimited drafts do not imply unlimited pages in team files. [Starter overview](https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview), [page limits](https://help.figma.com/hc/en-us/articles/360038511293-Create-and-manage-pages)

The free tier still allows local components, styles, and variables. The restriction is that you cannot publish them as a library for other files to use. [Figma library fundamentals](https://help.figma.com/hc/en-us/articles/39723547036055-Components-collection-Library-fundamentals)

That makes one file per product a practical starting point. You could organize its three pages as follows:

- **Foundations**: variables, text styles, base components, and the states that need checking.
- **Product**: currently accepted product interfaces, organized around real tasks. Put the Web and iOS memo designs where they can be compared side by side.
- **Lab**: directions not yet accepted, references, and redesign experiments, separated into batches with sections.

This is a suggested arrangement, not a design system template required by Figma. The purpose is simple: both people and agents should be able to find what is in use, what can be reused, and what is still being explored.

The card itself also needs a structure that communicates intent. Instead of keeping `Frame 238` and `Group 17`, use names such as `Memo/Card`, `Memo/Body`, and `Memo/Status`. Express how the container grows with longer text, and whether status and actions wrap in a narrower window, through Auto Layout and constraints. Then resize the design yourself to check. Figma's official guidance recommends semantic names, variables, and Auto Layout, with annotations for behavior that visuals cannot convey. [File structure guide](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/)

Do not draw dozens of unused controls just because you are “building a system.” This exercise needs only a body container, status feedback, and the actions that will actually appear. When a second interface really reuses part of it, you can assess whether the component boundary makes sense.

The free workflow has another maintenance cost: copying a template into a different file produces another copy. I recommend marking the source version and treating updates as explicit migrations. When multiple products frequently share components, the maintenance saved by publishing a library across files becomes a reason to evaluate a paid plan.

## Turn “elegant” into design decisions you can discuss

“Make it look more polished” does not tell an agent what trade-offs to make. It might add whitespace, reduce contrast, shrink the type, or add gradients and motion. Any of these could improve a showcase image while getting in the way of the task at hand.

Before continuing on the canvas, write a short design note for the memo. The following is an ordinary Markdown document for the exercise, not a tool-specific configuration:

```markdown
# Memo card design conventions

Task: Help users find an entry quickly and continue reading or editing.
Content order: Body text > errors requiring action > supporting information such as time.

Accepted constraints:
- Let the card grow with longer text; actions must not cover the body.
- A failed save needs a written explanation and a retry action, not color alone.
- Keep normal sync status understated so every card does not compete for attention.

Implementation entry points:
- Generate values from the project's token source; do not edit platform outputs by hand.
- Use existing components; list interface gaps first when a required capability is missing.

To verify:
- Are errors still easy to spot in a dense list?
- Can users still read all content and use every action with larger text?
```

The value lies in preserving constraints and reasons. The next agent can continue discussing the visibility of errors without having to guess what “polished” means all over again.

The name `DESIGN.md` also needs clarification. A project's own design notes do not become compatible with a repository-defined format simply because they share a filename. For example, Google Labs' [design.md](https://github.com/google-labs-code/design.md) defines a visual identity description format, a token schema, and a CLI for coding agents. It was still labeled `alpha` when checked for this article. Read its specific schema before using it; do not assume it can parse arbitrary Markdown.

VoltAgent's [awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/f6961238d5cddcf8042a74a70fc400ec67181abb/README.md) is a useful collection for practicing this kind of description. It organizes visual analyses of public websites into DESIGN.md files, covering color roles, typography, component styling, layout, and usage constraints. Examples include Linear and Apple. You can borrow its descriptive categories to learn how to turn “this feels clean” into a discussion of color, density, and hierarchy.

The scope of those samples matters too. The collection's [Apple analysis](https://getdesign.md/apple/design-md), for example, explicitly presents itself as an independent analysis of publicly visible patterns, with product showcases and marketing websites as intended use cases. It is not endorsed by Apple. A reference like this will not automatically fill in interactions such as retrying a failed save, leaving while editing, or expanding long memo text. I recommend first recording what you want to borrow and the task in which you will test it, then rewriting the selected rules as your own project notes. Importing an entire brand description can also bring in presentation choices that do not fit your product.

### Compare two directions with the same content

Before comparing, break “does it look good?” into things you can point to on the screen. Here is a suggested order of observation that can be applied directly to the memo:

1. **Typography: what do you see first?** Put the body, time, and status together and see where your eye goes. If the time attracts more attention than the body, start by reducing its weight or emphasis. If the error disappears into the rest, make it more visible. Change one factor per round; changing size, weight, and color together makes it difficult to know what helped.
2. **Whitespace: what belongs together?** Keep the body and its timestamp relatively close, with a clearer gap between entries. Look at the relationship between internal and external spacing before choosing values. A small set of steps such as 8, 16, and 24 can serve as an example starting point. Narrow screens and long text still need checking.
3. **Alignment: are there unintended offsets?** Temporarily tone down backgrounds and decoration. Check whether the left edge of the body, the timestamp, and the status follow meaningful alignment lines. Icons and text also need optical centering; equal numbers do not always look aligned. If one alignment adjustment can resolve the clutter, try that before adding another card or divider.
4. **Color: does each emphasis have a job?** Define the roles of body text, supporting information, primary actions, and errors. If an ordinary label and a failed save use the same red, the error becomes harder to identify. You can also temporarily remove color to check whether text and shapes still communicate the state.
5. **Density: what task does this screen support?** Showing more entries at once can help scanning, but continually shrinking the text and action areas is not the way to achieve it. Use the same batch of realistically sized content in spacious and dense versions. Compare how easy it is to find entries, read them, and use their actions.
6. **Feedback: is the result of an action clear?** After clicking retry, users should be able to distinguish processing, success, and another failure. Watch for button changes that make the card jump, or feedback that covers the body. Place these states side by side on the canvas, then walk through them on the actual page.

These techniques provide a way to compare. No font size, whitespace ratio, or number of colors should become a mandatory formula for “polish” independent of the content and task.

For this card, start with two candidates. One reduces borders and uses whitespace to separate entries. The other reduces vertical space and emphasizes alignment between timestamps and statuses. Give both **exactly the same body text, timestamps, states, and screen width**.

Perform the task first: find an entry from yesterday, identify a failed save, enter editing, and return to the list. Then consider which visual decisions helped.

If A uses short sentences while B uses long paragraphs, or A shows normal states while B shows three errors, it becomes difficult to tell whether the difference comes from content or design. Holding content constant is a way to practice visual judgment that you can revisit and examine.

After choosing a direction, record specific reasons. For example: “Keep B's status alignment and A's body spacing. Give the error text its own line so long content does not squeeze the retry button.” That record can feed directly into the next change. “Cleaner and more refined” leaves much less to work with.

## How Figwright connects AI to free Figma

Think of Figwright as a connecting program between an AI client and a Figma plugin. You give a task to an MCP-capable client such as Claude or Codex. Figwright sends tool calls to the plugin running inside Figma, and the plugin reads or changes the canvas. It is an independent open-source project that uses a plugin connection and does not require a Dev Mode seat. [Figwright README at the reviewed commit](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)

The connection can be shown simply:

```text
You give a task in the AI client
         ↓
The client makes an MCP tool call
         ↓ stdio: standard input/output between local processes
Local Figwright server / relay
         ↓ Local WebSocket connection
Figma plugin running in the target file
         ↓ Plugin API: read nodes, change properties
Figma canvas

Read results or execution results return to the client through the connection.
```

Each term has a different job. **MCP** defines how clients discover and call tools. **stdio** is the channel between the client and the local server. **WebSocket** maintains the connection between the server and the plugin. **Plugin API** is Figma's interface for plugin reads and writes. Figwright's README at the reviewed commit describes this structure. [Connection architecture](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)

The Figma plugin also divides responsibilities internally. Its UI layer can use browser capabilities and handles the connection; its sandbox layer can access document nodes and performs canvas operations. The two exchange messages. Figma's official [How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) explains this distinction. You do not need to memorize the internals, but it helps to know that the plugin executes canvas changes while the model selects and organizes tool calls for the task.

### Read a card, then try changing its spacing

For example, select the memo in Figma and ask an agent to “read this card and explain how the body and status are arranged.” The client calls a read tool. The local server passes the request to the plugin, which uses the API to read the relevant nodes' hierarchy, layout, and bindings. The results return to the client. The agent can then work with the canvas structure instead of guessing from a screenshot alone. [Design reading workflow](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md)

Next, in the experimental area, ask it to “try changing the gap between the body and status from 16 to 24.” Those numbers are illustrative. The agent should first identify the container being changed and check whether the spacing is bound to a variable. It can then call a write tool, letting the plugin change the layout property or the relevant binding. After receiving the result, read the design again and take a screenshot to inspect the change with long text. A successful write still needs visual checking. [Canvas writing workflow](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md)

To use this connection, the local server must be running and the plugin must be open in the target Figma file. The documentation for this version imports the plugin from a manifest, a step that requires the Figma desktop app. Once connected, confirm the target file and selected region. [Setup instructions](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md)

### Be clear about which parts are free

You can start with free Figma and open-source Figwright. Plugin capabilities are still subject to the account, document permissions, and Plugin API, and Starter restrictions such as shared libraries still apply. Claude/Codex model subscriptions or usage costs are separate. Connecting the tools provides an execution path; output quality still depends on the design material, component reuse, and review.

Figma's official remote MCP also currently offers limited access to Starter users, with limits varying by plan and seat. “Starter has no Dev Mode” therefore does not mean “all official MCP access requires payment.” This article focuses on the Figwright plugin connection I already use. Consult the official [Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) page for its allowances.

A local connection does not make the entire workflow offline, either. If the client sends design context returned by a tool to a remote model, that data still enters the model's processing pipeline. Check the actual client and model configuration.

The tool behavior examined here is pinned to commit `ee1ad57`. The public [v0.5.0 release](https://github.com/awdr74100/figwright/releases/tag/v0.5.0) was published on August 30, 2026. A version name alone does not establish that an installed package and plugin contain every feature subsequently added to the main branch. Inspect the tools available after connecting, and consult documentation for the installed version. The examples below illustrate the intended calls; use the parameters supported by your installation.

### From canvas to code: read the mappings first

For a local region such as the memo, Figwright's [`figma-codegen` workflow](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md) first reads the complete design context, then matches existing components, tokens, and icons, and finally renders and verifies the result. That sequence comes down to three judgments:

1. **What is actually on the canvas?** Read the region's structure, layout, variable bindings, and component properties. Select the card or section being implemented, rather than supplying the entire product at once.
2. **What already exists in the repository?** Check component mappings and candidates, and read the actual interfaces. If `MemoStatus` exists, first establish whether it can express the required state.
3. **What is still a guess?** Components with matching names, identical color values, and unmapped properties need review. A tool's candidate is not a confirmed match.

Pay particular attention to tokens that look identical. `text.secondary` and `control.disabled` may currently share the same gray while carrying different meanings. Binding a timestamp to the disabled-control token may look fine today, then unintentionally change the timestamp the next time disabled styling is adjusted.

The [`token_map` implementation](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/token-map.ts) combines name and value matching, and flags ambiguity when multiple candidates share a color. Its `tokenSource` inputs include CSS, SCSS, and Tailwind / UnoCSS configurations. **Arbitrary DTCG JSON is not a directly supported input here.**

If the project generates CSS from `tokens.json`, let the tool read the generated CSS for mapping while keeping JSON as the place where values are maintained. The file a tool reads should not determine the file a person edits.

```text
token_map({
  rootDir: PRODUCT_ROOT,
  tokenSource: GENERATED_CSS_PATH
})
```

Here, `PRODUCT_ROOT` is the product repository root, and `GENERATED_CSS_PATH` is the actual CSS path relative to it. Both are illustrative placeholders. Set `rootDir` explicitly, especially when working across repositories: the server's default working directory may not be the product being implemented.

`token_map` returns mappings and information about gaps. It does not thereby synchronize the token source, Figma variables, and Swift files in both directions. Mapping, output transformation, and storage synchronization should each be verified separately.

Mappings that were ambiguous also need to be saved after verification. The `figma-codegen` workflow above records components in `docs/figma-component-map.md` as `FigmaName | code/path`, and tokens in `docs/figma-token-map.md` as `FigmaName | ref`. Save an uncertain mapping only after rendering it and confirming its meaning. These records override subsequently computed matches, so a mistaken record will also be reused. [Mapping record conventions](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md)

### Back to the canvas: preserve instance and variable relationships

When building back into Figma, first read the file's existing variables, components, and styles. Then assemble the interface with instances, bind values, and check screenshots. Figwright's [`figma-build` workflow](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md) explicitly follows this approach.

If a variable already defines the body text color, the agent should bind the text to it. If `Memo/Status` is already a component, create an instance. Redrawing these as identical-looking text and rectangles loses the relationship that enables centralized updates later.

This needs checking beyond the screenshot. An image can show the final appearance, but it cannot prove that every color remains bound to the correct variable or that every card is still an instance of the same component.

## Share meaning across platforms; implement behavior for each

DayPage's existing engineering records describe `tokens.json` as the single source for values, generating `globals.css` for the Web and `DSTokens.swift` for iOS, with CI checks for drift. This mechanism comes from existing project records; the project and CI were not rerun for this article. [Public project repository](https://github.com/getyak/daypage)

That mechanism can serve as a starting point for the proposed workflow and help control drift in values. Input methods, navigation, and component behavior still need implementation on each platform.

Meaning is the easiest thing to share. Both platforms need to express primary text, secondary text, destructive actions, and failed saves. You can first agree that `status.error` means an error requiring user action, then decide how each platform displays it, announces it, and lets the user take the next step.

The following mappings are proposed examples; the names are illustrative:

| Design meaning | Figma | Web | iOS |
| --- | --- | --- | --- |
| Secondary text | `text/secondary` variable | `--text-secondary` | `DSTokens.textSecondary` |
| Memo status | `Memo/Status` component | `MemoStatus` | `MemoStatusView` |
| Retry saving | State views and behavior annotations | Focusable retry button | Accessible native button |

The final row matters especially. On the Web, check that the keyboard can reach the button and that focus is visible. On iOS, check touch operation, larger text, and accessibility. The task can mean the same thing on both platforms while its presentation fits each environment.

In the [`profile.ts`](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/profile/profile.ts) examined for this article, Figwright primarily detects JS/TS frontends such as React, Vue, and Svelte, along with their styling systems. That does not establish automatic component mapping for SwiftUI. For iOS, explicitly provide existing Swift component locations, token outputs, and platform constraints, then verify the result separately.

### A shared token format still needs verified output

The Design Tokens Community Group's [2025.10 format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) provides an interchange convention for token types, values, references, and related information. It is a community group specification, not a W3C Recommendation. Adopting it does not mean every tool supports it completely.

[Style Dictionary](https://styledictionary.com/) transforms tokens into outputs for multiple platforms. A project can use a tool like this or keep its existing generator. I recommend checking the results: whether names and references resolve correctly, units are handled for the target platform, themes are complete, and regeneration exposes manual edits.

For the memo exercise, a sufficient check is to change one semantic token in the source, regenerate CSS and Swift, and confirm that the affected components on both platforms change correctly. Then look for unintended changes to unrelated text. This small experiment checks naming, transformation, and consumption together, bringing you closer to maintainability than merely confirming that a JSON file exists.

Do not hand-maintain four sets of values in JSON, CSS, Swift, and Figma for the sake of tool compatibility. Where automation does not yet connect the steps, keep an explicit manual update step for now. At least the cost will be visible.

## Include states in the first implementation

Once you have chosen a visual direction, give Claude or Codex a narrowly scoped task. Roles do not need to be tied to particular models. The same agent could implement the following task and then switch to a review phase.

```text
Implement the selected memo card design.

First read the design notes, existing card and status components,
and token output locations. Then read the full context of the specified Figma region.

Reuse existing components and tokens. When there is ambiguity or an interface gap,
list candidates, evidence, and unresolved decisions instead of silently inventing an approximation.

Cover short text, long text, pending sync, failed save, and retrying states.
Also check narrow and wide screens, keyboard operation, and larger text.

Report what was actually reused, what remains unmapped, checks run, and screenshots.
Save formerly ambiguous mappings only after rendering and confirming them.
```

“Reuse existing components” needs a real entry point. For projects using shadcn/ui, its [MCP documentation](https://ui.shadcn.com/docs/mcp) provides capabilities for browsing, searching, and installing registry components. It addresses component discovery; it cannot decide which interaction fits a journaling card. If suitable components already exist, there is no need to introduce another library for this article.

Coinbase offers a team example worth examining. Its [official CDS AI documentation](https://cds.coinbase.com/getting-started/ai-overview) brings together Agent Skills, component MCP, and documentation indexes for each platform. `cds-code` identifies React / React Native environments and available packages, guides component selection, and prioritizes design tokens. MCP supplies component API context.

The lesson I draw from this example is how to supply information: let the agent find the components, interfaces, and rules actually available in the current project. A personal project can start with design notes, a few clear entry points, and verified mappings, without reproducing a team's infrastructure.

### Check components with real content

The memo can start with a small set of states:

- One line of text and a very long passage.
- Saved, pending sync, failed save, and retrying.
- An empty state with no entries.
- Narrow and wide screens, plus the layout with larger text.

There is no need to mechanically test every possible combination. Start with combinations that change the layout or block the task, such as “narrow screen + long text + failed save.” Whether an error message pushes the retry button off-screen, or whether the user can still read the full entry, often deserves attention before a one-pixel shadow difference in the default state.

If the project already uses Storybook, make these states into stories you can reopen. Its [accessibility addon](https://storybook.js.org/docs/writing-tests/accessibility-testing) uses axe-core to run rule checks on the rendered page, leaving results that cannot be confirmed automatically for human review. Without Storybook, a component showcase page used only during development can hold these scenarios.

Review should answer three separate questions: Does the implementation use the correct assets? Are the interactions usable? Do the visual choices serve the task? Screenshots help reveal typography and spacing differences. Accessibility checks help identify rule violations. Neither can independently decide which direction is more aesthetically successful.

## The next change starts to test whether you have a system

After the first design and implementation, save a clear point of comparison. Then introduce a small requirement: move the retry action for a failed save from the action menu to a position beside the error message, preserving the hierarchy of other normal states.

This is a useful place for `design_diff`, provided you understand what it compares.

According to the [implementation reviewed for this article](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/design-diff.ts), it reads a Figma node's design context and saves snapshots under `.figwright/snapshots/` in the product repository. The first call creates a baseline. Later calls compare the same node's structure and properties, returning additions, removals, and changes. `update: true` accepts the current design as the new baseline.

```text
// After the first implementation and review: save the region's design snapshot
design_diff({ nodeId: MEMO_NODE_ID, rootDir: PRODUCT_ROOT })

// After changing the canvas: read changes relative to the old snapshot
design_diff({ nodeId: MEMO_NODE_ID, rootDir: PRODUCT_ROOT })

// After code updates, state checks, and visual review: accept the new baseline
design_diff({
  nodeId: MEMO_NODE_ID,
  rootDir: PRODUCT_ROOT,
  update: true
})
```

This compares **two Figma design contexts**. It does not check whether product code has been synchronized, and it does not compare screenshot pixels. Even a `no-changes` result leaves open the possibility that someone changed the code or that the previous implementation missed something.

I recommend accepting the baseline after implementation and verification: read the changes, identify affected components, update the code, check relevant states, and then update the snapshot. If you set `update: true` immediately after reading the changes, the next comparison will make it harder to see which design changes remain unimplemented relative to the original baseline.

For this memo change, the review scope should be explainable: move the failure-state action, let the status component accept a retry action, adjust the corresponding layout, and verify that normal states have not changed. If the agent rewrites the whole page, it should at least explain why the existing components cannot accommodate this change.

If implementation reveals a better layout, there is no need to force the code back into conformity with the canvas. You can accept the improvement and update Figma and the design notes. What matters is recording that acceptance so the next person or agent knows which version to follow.

### Limit simultaneous writes when agents share assets

Having one agent propose candidates and another check the implementation is a division of work worth trying. I recommend allowing only one executor at a time to change shared tokens, base components, or the same Figma file; others can propose differences and suggestions. Use parallel work first for independent exploration and checks, reviewing changes to shared assets together.

Figwright's file-selection mechanism helps direct calls to a specific file. Its [README at the reviewed commit](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md) describes `list_files` / `use_file`. Selecting a target file is not a concurrency lock on shared assets: two agents working on different canvases could still change the same token source at once.

## Add tools when a specific bottleneck appears

The starting combination is already small: Figma holds visual designs, Figwright connects the canvas, an agent with access to the product repository executes tasks, and the repository stores design notes, tokens, and actual components. I recommend waiting for a specific gap before adding another tool:

| Bottleneck you have encountered | Tool to consider | What to verify |
| --- | --- | --- |
| You can build a page but cannot explain what needs improving | Design review capabilities such as `critique` and `audit` in [Impeccable](https://github.com/pbakaus/impeccable) | Use it to identify hierarchy, readability, and responsive issues. Its typography and color rules include the author's preferences, which need to be weighed against your project's goals |
| You want to edit tokens on the design side and return changes to version control | [Tokens Studio remote storage](https://docs.tokens.studio/token-storage/remote/) | Establish which token source it connects to and when to push/pull. Storage synchronization still needs output transformation afterward; creating and switching Git branches inside the plugin are Pro features |
| Your initial directions are too narrow and you want new layout candidates | Design generation and variation workflows in [Stitch Design Skills](https://github.com/google-labs-code/stitch-skills) | Stitch MCP must be configured. Once a candidate is chosen, implement it through project components, tokens, and state verification |

For example, if the memo's current problem is that errors are hard to notice, first use a review tool to explain the hierarchy issue, then try a single change. Reconsidering the whole layout has a clearer purpose only when two or three local adjustments still fail to support the task. Every additional tool also needs a clear answer to who accepts its output and where that output is saved.

## Build visual judgment into each concrete choice

After changing an interface, leave a short record in the design notes: what changed, what it was intended to solve, and which content and states were checked. Making visual judgment part of routine maintenance gives you something to revisit the next time you ask whether a decision still holds.

Allow judgments to stop working, too. A layout that looks good with three short entries may become tiring with twenty long ones. Recording the content and tasks for which it does not fit is more useful than preserving “less is more” as an eternal truth.

As projects accumulate, you can reuse these records along with components. But the reusable unit should include its conditions: what problem a state layout solved, which sizes and content it was checked with, and what changes would require a fresh judgment. Personal style can then gradually become a set of choices you can explain.

If you start today, I suggest completing just this exercise: organize the memo in one Figma file, compare two directions, implement the chosen version, and then make one actual small change. By the end, you should be able to find the design reasoning, token source, real components, state examples, and a design snapshot corresponding to the current implementation. Whichever one is missing tells you what to add next.

I once summed up my engineering question this way: “Build around one problem: keeping context from getting lost when switching tools.” In design, that can have a small, concrete meaning: the next time you open the canvas or ask an agent to change a page, you still know why an element was designed that way and what evidence would justify changing it.

## References

These sources were checked on September 26, 2026. Citations for Figwright's implementation and workflows are pinned to commit `ee1ad5708634f8c2c0c1ac517f048acd2d7fca65`. Recheck product plans and tool capabilities when adopting them.

1. [Figma: Structure your Figma file for better code](https://developers.figma.com/docs/figma-mcp-server/structure-figma-file/) — Components, variables, naming, Auto Layout, and behavior annotations.
2. [DayPage public repository](https://github.com/getyak/daypage) — Project entry point. The description of shared token sources and CI comes from the author's existing engineering records; neither was rerun for this article.
3. [Figma: Starter plan overview](https://help.figma.com/hc/en-us/articles/13838684089751-Starter-plan-overview) — Free plan, team libraries, Dev Mode, and version history limits.
4. [Figma: Create and manage pages](https://help.figma.com/hc/en-us/articles/360038511293-Create-and-manage-pages) — Page limits for Design files in Starter teams.
5. [Figma: Components collection — Library fundamentals](https://help.figma.com/hc/en-us/articles/39723547036055-Components-collection-Library-fundamentals) — Local assets versus libraries published across files.
6. [Google Labs: design.md](https://github.com/google-labs-code/design.md) — Visual description format, token schema, and alpha status.
7. [Figwright README at the reviewed commit](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/README.md) — MCP, stdio, WebSocket, the plugin, local connections, and file routing.
8. [Figwright v0.5.0 release](https://github.com/awdr74100/figwright/releases/tag/v0.5.0) — Release version and date.
9. [Figwright: figma-codegen workflow](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-codegen/SKILL.md) — Reading, reuse, rendering, and mapping records.
10. [Figwright: token-map.ts](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/token-map.ts) — Input formats, matching, and ambiguity.
11. [Figwright: figma-build workflow](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/skills/figma-build/SKILL.md) — Reading existing assets, creating instances, binding, and screenshot checks.
12. [Figwright: profile.ts](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/profile/profile.ts) — The technology stacks covered by project detection.
13. [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) — The DTCG format and its specification status.
14. [Style Dictionary](https://styledictionary.com/) — Token transformation into multiple platform outputs.
15. [shadcn/ui: MCP Server](https://ui.shadcn.com/docs/mcp) — Browsing, searching, and installing component registry entries.
16. [Coinbase Design System: AI Overview](https://cds.coinbase.com/getting-started/ai-overview) — Skills, MCP, and platform-specific component documentation.
17. [Storybook: Accessibility tests](https://storybook.js.org/docs/writing-tests/accessibility-testing) — Automated component accessibility checks and human review.
18. [Figwright: design-diff.ts](https://github.com/awdr74100/figwright/blob/ee1ad5708634f8c2c0c1ac517f048acd2d7fca65/packages/mcp/src/tools/design-diff.ts) — Figma structure snapshots, differences, and baseline updates.
19. [VoltAgent: awesome-design-md](https://github.com/VoltAgent/awesome-design-md/blob/f6961238d5cddcf8042a74a70fc400ec67181abb/README.md) — A website visual description collection and its analysis categories at a fixed snapshot.
20. [GetDesign: Apple Design System Analysis](https://getdesign.md/apple/design-md) — The scope, intended uses, and unofficial status of the independent analysis.
21. [Impeccable](https://github.com/pbakaus/impeccable) — Design review commands and style rules.
22. [Tokens Studio: Remote Token Storage Integrations](https://docs.tokens.studio/token-storage/remote/) — Remote storage, Git synchronization, and selected Pro features.
23. [Google Labs: Stitch Design Skills](https://github.com/google-labs-code/stitch-skills) — Design generation, editing, variations, and the MCP prerequisite.
24. [Figma: How Plugins Run](https://developers.figma.com/docs/plugins/how-plugins-run/) — Plugin UI and sandbox layers, and document access.
25. [Figma: Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) — Official MCP access and allowances by plan and seat.
