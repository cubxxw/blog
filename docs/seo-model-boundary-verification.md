# Replaying the SEO model boundary

`seo-model-boundary-proof.json` records the actual artifacts and observations
for Action `v1.0.240` (commit `ed670b4cf9de2a5a570d130d2f6197b9e543cd64`),
SDK `0.3.288`, CLI `2.1.288`, and shell-quote `1.8.4`.

The Action tag upgrades both the SDK and native CLI, even though its argument
parser is unchanged. Updating version labels alone is insufficient. The
semantic workflow test binds the Action version and exact argument string,
including schema and turn limit, to this proof. Appended or duplicate flags
are rejected. Do not relax that test to make dependency upgrades pass.

## What was verified

On 2026-10-06, the replay ran the official Action's hash-checked TypeScript
parser (with types erased), the real SDK, and the native Linux x64 CLI. The
CLI's SHA256 also matched the official native installer manifest. No CLI
parser or tool-selection implementation was copied into the test.

The entire replay runs inside a fresh Linux user/network namespace, with an
empty HOME and allowlisted environment. It stops if this isolation is
unavailable. There are no real credentials, live provider requests or paid
model calls. Each case reaches the native CLI's `system.init`, then stops
with `authentication_failed`, zero input/output tokens and zero cost.

Five runtime cases establish the following:

1. Exact workflow arguments: tools are exactly `["StructuredOutput"]`.
2. Same boundary without `--json-schema`: tools are exactly `[]`.
3. Seeded user/project startup hooks, project MCP configuration and slash
   command: exact workflow arguments still expose only `StructuredOutput`,
   no MCP servers, skills or slash commands; no hook or MCP marker executes.
4. Control with `--tools=` removed: operational tools including `Bash`,
   `Read` and `Write` appear. This confirms the empty inventory is meaningful.
5. Control with `--safe-mode` removed: the seeded harmless startup hook runs.
   This confirms that the positive case actually suppresses configuration.

The Action parser is also checked for explicit `tools=`, strict MCP config,
safe mode, disabled slash commands, empty MCP configuration, the MCP deny
pattern, two-turn limit and debug override. Quoted-empty `--tools ""` is
collapsed to a bare flag by the Action parser and remains forbidden. This
renewal makes no unobserved claim about which following flag the CLI consumes.

Agent-mode MCP selection was separately source-reviewed in the pinned
Action's `src/modes/agent/index.ts` and `src/mcp/install-mcp-server.ts`:
the explicit prompt selects agent mode, `parseAllowedTools` returns `[]`,
and commit signing is not enabled, so the Action supplies no MCP servers.
These sources are included in the verified artifact hashes.

## Reproduce

Requires Linux x64, Node 22.13+ (including CI's Node 22), `unshare`, Git, npm,
curl, tar, and the repository's declared `yaml` dependency. The downloads
below are official public artifacts. Approximately 350 MB of disk is needed.
Use a fresh directory; no installation scripts or vendor installer run.

```bash
REPO="$PWD"
WORK="$(mktemp -d)"
ACTION="$WORK/action"
ARTIFACTS="$WORK/vendor"
git clone --depth=1 --branch v1.0.240 \
  https://github.com/anthropics/claude-code-action "$ACTION"
test "$(git -C "$ACTION" rev-parse HEAD)" = \
  ed670b4cf9de2a5a570d130d2f6197b9e543cd64
mkdir -p "$ARTIFACTS/artifacts" "$ARTIFACTS/sdk" "$ARTIFACTS/cli" \
  "$ARTIFACTS/cli-linux" "$ARTIFACTS/node_modules/shell-quote"
cd "$ARTIFACTS"
npm --cache "$WORK/npm-cache" --userconfig /dev/null pack \
  @anthropic-ai/claude-agent-sdk@0.3.288 \
  @anthropic-ai/claude-code@2.1.288 \
  @anthropic-ai/claude-code-linux-x64@2.1.288 \
  shell-quote@1.8.4 --ignore-scripts --pack-destination artifacts
tar -xzf artifacts/anthropic-ai-claude-agent-sdk-0.3.288.tgz -C sdk --strip-components=1
tar -xzf artifacts/anthropic-ai-claude-code-2.1.288.tgz -C cli --strip-components=1
tar -xzf artifacts/anthropic-ai-claude-code-linux-x64-2.1.288.tgz -C cli-linux --strip-components=1
tar -xzf artifacts/shell-quote-1.8.4.tgz -C node_modules/shell-quote --strip-components=1
curl --fail --location \
  https://downloads.claude.ai/claude-code-releases/2.1.288/manifest.json \
  --output artifacts/official-native-manifest.json
cd "$REPO"
node scripts/verify-seo-model-boundary.mjs "$ACTION" "$ARTIFACTS"
```

The harness verifies archive integrity, source/binary hashes, the installer
manifest, the checked-in workflow, and runtime assertions. It prints a JSON
receipt only after all five cases pass. Temporary HOME/configuration/hook
fixtures are removed afterwards. Downloads remain in the chosen work
directory for inspection. A mismatch or unavailable namespace is a failure;
never rerun the vendor code without isolation to work around it.

## Limits and future renewals

This is Linux CLI initialization evidence, not a live GitHub Actions run or
OAuth/model-output acceptance. Built-in plugin metadata is visible at
initialization; the observed tool inventory still has no operational tools.
No assertion is made about unobserved internal function calls such as
`getAllBaseTools`; the former source-extraction hashes are superseded by
hash-checked native execution and explicit positive controls.

Future upgrades must acquire their own official artifacts, independently
review relevant Action/SDK/CLI changes, rerun equivalent boundary checks,
and update the workflow, hashes, versions and documentation together.
Live OAuth and structured-output readback remain separate acceptance work.
