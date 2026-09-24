/** Build-time closed registry. Browser entries validate only their own kind
 * through spec-core.mjs, avoiding unrelated models in each article bundle. */
import { validateWith, validateContextBudget, validateAgentLoop } from './spec-core.mjs';
export { SCHEMA_VERSION, LOCALES, LIMITS, formatErrors } from './spec-core.mjs';
import { validateSessionTree } from './session-tree-model.mjs';
import { validateSessionScope } from './session-scope-model.mjs';
import { validateMemoryLineage } from './memory-lineage-model.mjs';
import { validateEffectRecovery } from './effect-recovery-model.mjs';
import { validateGitopsReconcile } from './gitops-reconcile-model.mjs';
import { validateReliabilityChain } from './reliability-chain-model.mjs';
import { validateTaskCost } from './task-cost-model.mjs';
import { validateNotificationThreshold } from './notification-threshold-model.mjs';
import { validateVectorCosine } from './vector-cosine-model.mjs';
import { validateFlowBottleneck } from './flow-bottleneck-model.mjs';

const validators = Object.freeze({
  'context-budget': validateContextBudget,
  'agent-loop': validateAgentLoop,
  'session-tree': validateSessionTree,
  'session-scope': validateSessionScope,
  'memory-lineage': validateMemoryLineage,
  'effect-recovery': validateEffectRecovery,
  'gitops-reconcile': validateGitopsReconcile,
  'reliability-chain': validateReliabilityChain,
  'task-cost': validateTaskCost,
  'notification-threshold': validateNotificationThreshold,
  'vector-cosine': validateVectorCosine,
  'flow-bottleneck': validateFlowBottleneck,
});
export const KINDS = Object.freeze(Object.keys(validators));
export function validateSpec(raw, options) {
  return validateWith(raw, KINDS, validators[raw?.kind], options);
}
