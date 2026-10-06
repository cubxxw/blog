#!/usr/bin/env node
// Manual, offline security replay. See docs/seo-model-boundary-verification.md.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import YAML from 'yaml';

const script = fileURLToPath(import.meta.url);
const repo = path.resolve(path.dirname(script), '..');
const [actionInput, artifactsInput, isolated] = process.argv.slice(2);
assert.ok(actionInput && artifactsInput, 'Usage: node scripts/verify-seo-model-boundary.mjs ACTION_DIR ARTIFACTS_DIR');
assert.equal(process.platform, 'linux', 'This replay requires Linux network namespaces');
assert.equal(process.arch, 'x64', 'This proof covers the Linux x64 CLI artifact');
const action = path.resolve(actionInput);
const artifacts = path.resolve(artifactsInput);

// Isolate the entire replay, including the SDK, before importing vendor code.
// Never fall back to an online run if unshare is unavailable or denied.
if (isolated !== '--isolated') {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-proof-home-'));
  try {
    const run = spawnSync('unshare', [
      '--user', '--map-root-user', '--net', process.execPath,
      script, action, artifacts, '--isolated',
    ], {
      env: {
        PATH: '/usr/bin:/bin', HOME: home,
        SEO_PROOF_PARENT_NET: fs.readlinkSync('/proc/self/ns/net'),
      },
      stdio: 'inherit', timeout: 120_000,
    });
    if (run.error) throw run.error;
    assert.equal(run.status, 0, 'Offline replay failed; do not bypass network isolation');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
  process.exit(0);
}
assert.ok(process.env.SEO_PROOF_PARENT_NET, 'Use the normal entrypoint');
assert.notEqual(fs.readlinkSync('/proc/self/ns/net'), process.env.SEO_PROOF_PARENT_NET);
const proof = JSON.parse(fs.readFileSync(path.join(repo, 'docs/seo-model-boundary-proof.json'), 'utf8'));
const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const [name, item] of Object.entries(proof.artifacts)) {
  const file = path.join(item.root === 'action' ? action : artifacts, item.path);
  assert.equal(sha256(file), proof.hashes[name], `${name}: artifact differs from verified bytes`);
}
for (const [file, integrity] of Object.entries(proof.packageIntegrity)) {
  const actual = 'sha512-' + createHash('sha512').update(fs.readFileSync(path.join(artifacts, 'artifacts', file))).digest('base64');
  assert.equal(actual, integrity, `${file}: npm archive integrity mismatch`);
}
const manifest = JSON.parse(fs.readFileSync(path.join(artifacts, 'artifacts/official-native-manifest.json'), 'utf8'));
assert.equal(manifest.version, proof.versions.cli);
assert.equal(manifest.platforms['linux-x64'].checksum, proof.hashes.cliBinary);
assert.equal(JSON.parse(fs.readFileSync(path.join(artifacts, 'sdk/package.json'))).version, proof.versions.sdk);
assert.equal(JSON.parse(fs.readFileSync(path.join(artifacts, 'cli/package.json'))).version, proof.versions.cli);
assert.ok(fs.readFileSync(path.join(action, 'bun.lock'), 'utf8').includes(`@anthropic-ai/claude-agent-sdk@${proof.versions.sdk}`));
assert.ok(fs.readFileSync(path.join(action, 'src/entrypoints/run.ts'), 'utf8').includes(`const claudeCodeVersion = "${proof.versions.cli}"`));

const workflow = YAML.parse(fs.readFileSync(path.join(repo, '.github/workflows/seo-analyze.yml'), 'utf8'));
const model = workflow.jobs.interpret.steps.find((step) => step.uses?.startsWith('anthropics/claude-code-action@'));
assert.equal(model.uses, `anthropics/claude-code-action@${proof.versions.action}`);
assert.equal(model.env.ACTIONS_STEP_DEBUG, 'false');
assert.equal(model.with.show_full_output, 'false');
assert.equal(model.with.display_report, 'false');
assert.equal(model.with.use_commit_signing, undefined);
assert.ok(model.with.claude_args.includes(proof.boundary.flags));
const expectedSchema = JSON.stringify(proof.boundary.jsonSchema);
assert.ok(model.with.claude_args.includes(`--json-schema '${expectedSchema}'`));
assert.equal(model.with.claude_args.trim(), `${proof.boundary.flags} --json-schema '${expectedSchema}' --max-turns ${proof.boundary.maxTurns}`);

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-proof-replay-'));
try {
  // Type erasure only: run the hash-checked upstream parser, not a reimplementation.
  fs.symlinkSync(path.join(artifacts, 'node_modules'), path.join(work, 'node_modules'));
  for (const [name, source] of [
    ['parse-sdk-options', 'base-action/src/parse-sdk-options.ts'],
    ['parse-tools', 'src/modes/agent/parse-tools.ts'],
  ]) {
    fs.writeFileSync(path.join(work, `${name}.mjs`), stripTypeScriptTypes(fs.readFileSync(path.join(action, source), 'utf8')));
  }
  const { parseSdkOptions } = await import(pathToFileURL(path.join(work, 'parse-sdk-options.mjs')));
  const { parseAllowedTools } = await import(pathToFileURL(path.join(work, 'parse-tools.mjs')));
  const { query } = await import(pathToFileURL(path.join(artifacts, 'sdk/sdk.mjs')));
  const flags = model.with.claude_args;
  assert.deepEqual(parseAllowedTools(flags), []);
  process.env.ACTIONS_STEP_DEBUG = 'false';
  const parse = (claudeArgs) => parseSdkOptions({
    claudeArgs, showFullOutput: 'false',
    pathToClaudeCodeExecutable: path.join(artifacts, 'cli-linux/claude'),
  });
  const parsed = parse(flags);
  assert.equal(parsed.showFullOutput, false);
  assert.equal(parsed.hasJsonSchema, true);
  assert.equal(parsed.sdkOptions.extraArgs['tools='], null);
  assert.equal(parsed.sdkOptions.extraArgs['strict-mcp-config'], null);
  assert.equal(parsed.sdkOptions.extraArgs['safe-mode'], null);
  assert.equal(parsed.sdkOptions.extraArgs['disable-slash-commands'], null);
  assert.equal(parsed.sdkOptions.extraArgs['mcp-config'], '{"mcpServers":{}}');
  assert.deepEqual(parsed.sdkOptions.disallowedTools, ['mcp__*']);
  assert.equal(parsed.sdkOptions.maxTurns, proof.boundary.maxTurns);
  assert.equal(parsed.sdkOptions.allowedTools, undefined);
  const quoted = parse(flags.replace('--tools=', '--tools ""'));
  assert.equal(quoted.sdkOptions.extraArgs.tools, null, 'Quoted empty becomes a bare flag');
  assert.equal(quoted.sdkOptions.extraArgs['tools='], undefined);
  process.env.ACTIONS_STEP_DEBUG = 'true';
  assert.equal(parse(flags).showFullOutput, true, 'Debug overrides the false input');
  process.env.ACTIONS_STEP_DEBUG = 'false';

  const bareFlags = `${proof.boundary.flags} --max-turns ${proof.boundary.maxTurns}`;
  const cases = [
    { name: 'workflow-schema', args: flags, tools: ['StructuredOutput'] },
    { name: 'empty-base', args: bareFlags, tools: [] },
    { name: 'contaminated-workflow', args: flags, tools: ['StructuredOutput'], seed: true },
    { name: 'control-default-tools', args: bareFlags.replace('--tools= ', ''), controlTools: true },
    { name: 'control-hooks-without-safe-mode', args: bareFlags.replace(' --safe-mode', ''), tools: [], seed: true, hook: true },
  ];
  const evidence = [];
  for (const test of cases) {
    const cwd = path.join(work, test.name);
    const home = path.join(cwd, 'home');
    fs.mkdirSync(path.join(cwd, '.claude/commands'), { recursive: true });
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    const hookMarker = path.join(cwd, 'hook-ran');
    const mcpMarker = path.join(cwd, 'mcp-ran');
    if (test.seed) {
      const settings = { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: `touch ${JSON.stringify(hookMarker)}` }] }] } };
      for (const file of [path.join(cwd, '.claude/settings.json'), path.join(home, '.claude/settings.json')]) fs.writeFileSync(file, JSON.stringify(settings));
      fs.writeFileSync(path.join(cwd, '.mcp.json'), JSON.stringify({ mcpServers: { sentinel: { command: '/bin/sh', args: ['-c', `touch ${JSON.stringify(mcpMarker)}`] } } }));
      fs.writeFileSync(path.join(cwd, '.claude/commands/sentinel.md'), 'Offline sentinel command');
    }
    const env = { PATH: '/usr/bin:/bin', HOME: home, ACTIONS_STEP_DEBUG: 'false', CLAUDE_CODE_ENTRYPOINT: 'claude-code-github-action' };
    const messages = [];
    let argv;
    let failure;
    try {
      for await (const message of query({
        prompt: 'Offline boundary probe',
        options: {
          ...parse(test.args).sdkOptions, cwd, env,
          spawnClaudeCodeProcess: (options) => {
            argv = options.args;
            return spawn(options.command, options.args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], signal: options.signal });
          },
        },
      })) messages.push(message);
    } catch (error) {
      failure = error.message;
    }
    const init = messages.find((item) => item.type === 'system' && item.subtype === 'init');
    const result = messages.find((item) => item.type === 'result');
    assert.ok(init, `${test.name}: native CLI never initialized`);
    assert.ok(messages.some((item) => item.error === 'authentication_failed'), `${test.name}: expected credential-free stop`);
    assert.ok(failure && result?.is_error);
    assert.equal(result.total_cost_usd, 0);
    assert.equal(result.usage.input_tokens, 0);
    assert.equal(result.usage.output_tokens, 0);
    assert.equal(init.apiKeySource, 'none');
    assert.equal(init.claude_code_version, proof.versions.cli);
    assert.deepEqual(init.mcp_servers, []);
    assert.deepEqual(init.slash_commands, []);
    assert.deepEqual(init.skills, []);
    if (test.controlTools) {
      assert.ok(init.tools.includes('Read') && init.tools.includes('Bash') && init.tools.includes('Write'), 'Control must expose actual operational tools');
    } else {
      assert.deepEqual(init.tools, test.tools, `${test.name}: unexpected tool inventory`);
      assert.ok(argv.includes('--tools='));
    }
    assert.ok(argv.includes('--strict-mcp-config'));
    assert.equal(argv[argv.indexOf('--mcp-config') + 1], '{"mcpServers":{}}');
    assert.equal(fs.existsSync(hookMarker), Boolean(test.hook));
    assert.equal(fs.existsSync(mcpMarker), false);
    evidence.push({
      name: test.name, tools: init.tools, mcpServers: init.mcp_servers,
      slashCommands: init.slash_commands, skills: init.skills,
      hookExecuted: fs.existsSync(hookMarker), authenticationFailed: true,
      costUsd: result.total_cost_usd,
    });
  }
  console.log(JSON.stringify({ platform: 'linux-x64', versions: proof.versions, networkIsolated: true, checks: evidence }, null, 2));
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
