---
title: 'Argo CD in Production: GitOps Sync, ApplicationSets, Rollbacks, and Security'
ShowRssButtonInSectionTermList: true
date: 2025-05-09T20:45:39+08:00
lastmod: 2026-07-31T00:00:00+08:00
draft: false
showtoc: true
tocopen: false
type: posts
author: ["Xinwei Xiong", "Me"]
keywords: []
tags:
  - Kubernetes
  - DevOps
  - Cloud Native
  - Deployment
  - Automation
  - Security
categories:
  - Development
description: >
  Build a reliable Argo CD delivery model: understand Applications, ApplicationSets, sync and rollback semantics, version pinning, RBAC, and production security.
cover:
  image: /images/covers/engineering/2025/argo-cd.jpeg
  alt: Argo CD continuously comparing desired state in Git with live Kubernetes state
tldr:
  - Argo CD is a declarative continuous-delivery controller for Kubernetes. It compares desired and live state; it does not replace builds, tests, image scanning, or rollout analysis.
  - An Application defines what to deploy and where. An AppProject limits sources, destinations, and resource permissions. An ApplicationSet generates Applications from data. Their responsibilities are distinct.
  - Automated sync does not automatically imply pruning or self-healing. Both behaviors require explicit choices, and Argo CD history rollback is unavailable while automated sync is enabled.
  - Production installations should pin a supported release, minimize both Argo CD and Kubernetes permissions, and treat repository credentials, cluster credentials, and manifest-generation plugins as control-plane assets.
  - Git is not correct merely because it is called the source of truth. Reliability comes from reviewed, traceable desired state that a controller can reconcile repeatedly.
maturity: evergreen
---

## A green sync does not prove the delivery system is safe

When Argo CD turns an application green, it proves one narrow thing: at that moment, the cluster matches the desired manifests Argo CD calculated. It does not prove that the image passed its tests, that a deletion is safe, or that the next Git change belongs in production.

That boundary is the right place to begin. Argo CD is not a pipeline that makes release judgments for a team. It is a Kubernetes controller that repeatedly compares, reports, and—when policy permits—reconciles state. Its value is not another attractive dashboard. Its value is turning deployment intent from scattered commands into something reviewable and reproducible.

This guide was checked against the stable Argo CD documentation on **2026-07-31**. Installation versions, upgrade steps, and support windows change. For production, choose a supported tag from the [official releases](https://github.com/argoproj/argo-cd/releases) and pin it; the `stable` branch is not an immutable release.

---

## What Argo CD does—and what it leaves to other systems

[Argo CD](https://argo-cd.readthedocs.io/en/stable/) is a declarative GitOps continuous-delivery tool for Kubernetes. It renders manifests from Git, Helm, Kustomize, or a config-management plugin, compares them with a target cluster, and marks differences `OutOfSync`. A human or an automated policy then decides whether to synchronize them.

The smallest useful loop looks like this:

```text
code or configuration review
            ↓
desired state in Git
            ↓
Argo CD renders and compares manifests
            ↓
manual or automated sync
            ↓
Kubernetes live state and health
```

The exclusions matter as much as the loop:

- **CI** still builds, tests, signs, and scans images.
- **Kubernetes** schedules and runs workloads; Argo CD does not choose the node container runtime.
- **Argo Rollouts or another rollout controller** handles canary, blue-green, or metric-driven promotion. Argo CD can install those custom resources without becoming the analysis engine.
- **Git history** shows how intent changed, but it does not make that intent correct. Once a bad manifest reaches a trusted branch, the controller can execute the mistake with impressive consistency.

### Docker is not an Argo CD runtime prerequisite

Older diagrams often present Docker, Kubernetes, and Argo CD as one fixed stack. That collapses a build tool, an image format, and a node runtime into the same concept. Kubernetes removed the in-tree `dockershim` in version 1.24. Nodes need a CRI-compatible runtime such as containerd or CRI-O; Docker Engine can still be connected through a compatible adapter. Docker can also build OCI images locally without being the runtime that executes them in the cluster.

Argo CD works through the Kubernetes API and declarative resources. It neither depends on nor benefits from claims that Docker is “the most widely used runtime.” Runtime selection belongs to the cluster distribution, CRI support, security requirements, and operating model. See the Kubernetes [container-runtime documentation](https://kubernetes.io/docs/setup/production-environment/container-runtimes/).

---

## Three core objects, three different responsibilities

### Application: what should run, and where

An `Application` is Argo CD's basic management unit. It joins a source and revision to a destination cluster, namespace, project, and sync policy:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: demo
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: <PINNED_COMMIT_OR_TAG>
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      enabled: false
    syncOptions:
      - CreateNamespace=true
```

The example intentionally starts with automated sync disabled and does not follow `HEAD`. A learning environment may track a branch. A production environment should choose a commit, tag, or controlled configuration branch that fits its release model—and make ownership of that reference explicit.

### AppProject: the boundary around an Application

An `AppProject` is not a folder label. It is a guardrail that can restrict:

- allowed source repositories;
- allowed destination clusters and namespaces;
- permitted cluster-scoped and namespace-scoped resource kinds;
- identities allowed to view, synchronize, or administer project Applications.

The permissive `default` Project is convenient for a tutorial. It is a poor boundary between mutually untrusted teams. Define projects deliberately. The more wildcard permissions they contain, the less effectively review and RBAC can contain a mistake. The official [Projects guide](https://argo-cd.readthedocs.io/en/stable/user-guide/projects/) shows the declarative model.

### ApplicationSet: generation, not another kind of Application

The `ApplicationSet` controller takes parameters from generators and renders an Application template for each result. Stable documentation lists List, Cluster, Git, Matrix, Merge, SCM Provider, Pull Request, Cluster Decision Resource, and Plugin generators.

Common patterns include:

- one Application per registered cluster;
- one Application per Git directory or configuration file;
- a temporary preview environment for each open pull request;
- a Matrix that combines application and cluster dimensions.

Two operational facts prevent a surprising number of incidents:

1. **ApplicationSet owns the generated Applications.** A manual edit to a child Application may be overwritten during the next reconciliation.
2. **Generator input is security-sensitive.** Git, SCM, pull-request, and plugin generators can affect repositories, destinations, and parameters. Before delegating ApplicationSet creation, read the official [security guidance](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Security/) and restrict both Projects and allowed SCM providers.

For new templates, Go Template mode with strict missing-key handling turns an absent value into a visible failure instead of a silently malformed destination:

```yaml
spec:
  goTemplate: true
  goTemplateOptions:
    - missingkey=error
```

ApplicationSet reduces repetition. It does not perform authorization design. The faster a template generates resources, the faster an unsafe boundary propagates.

---

## Installation: follow `stable` for a demo, pin a release for production

The official Getting Started guide uses the `stable` manifest for a quick evaluation:

```bash
kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

The same guide recommends a pinned version for production. Replace `<SUPPORTED_VERSION>` with a tag you have checked against Releases and the relevant upgrade notes:

```bash
ARGOCD_VERSION=<SUPPORTED_VERSION>

kubectl create namespace argocd
kubectl apply -n argocd --server-side --force-conflicts \
  -f "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml"
```

Here `--server-side` avoids the client-side apply annotation-size limit for large CRDs. `--force-conflicts` takes ownership of conflicting fields. That combination is documented for the official Argo CD manifests; it is not a universal promise of safety for every workload. If you changed fields that the upstream manifests also define, an installation or upgrade can overwrite them.

Choose an installation shape by requirement:

| Shape | Appropriate use | Boundary |
|---|---|---|
| Non-HA multi-tenant | evaluation, demonstration, non-production | official docs do not recommend it for production |
| HA multi-tenant | production platform and multiple teams | more resources; manifest anti-affinity requires at least three different nodes |
| Argo CD Core | headless GitOps for a cluster administrator | no resident API server, OIDC, or full Argo CD RBAC; primarily Kubernetes RBAC |
| Helm or Kustomize | declarative installation customization | chart or base versions and values still need pinning and review |

Applying an HA bundle does not by itself produce a highly available service. Failure domains, Redis, controller and repo-server capacity, recovery, networking, and the external identity provider still matter.

### First access

For local verification, start with port forwarding:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
argocd admin initial-password -n argocd
argocd login localhost:8080
```

The default installation uses a self-signed certificate. Treat `--insecure` as an explicit local-testing compromise, not a production recipe. Configure trusted TLS for a real endpoint. After the first login, change the password and remove `argocd-initial-admin-secret`, then establish SSO, RBAC, and the long-term admin-account policy.

---

## The first sync: observe the control loop

After creating an Application, inspect the rendered result and the difference before applying it:

```bash
kubectl apply -f guestbook-application.yaml
argocd app get guestbook
argocd app diff guestbook
argocd app sync guestbook
argocd app wait guestbook --health
```

A first deployment is normally `OutOfSync` because Git describes resources that do not yet exist. After synchronization it may become `Synced`, while health is calculated separately for the resource types in the tree. The states are not synonyms:

- `Synced + Degraded`: the manifests match, but the workload is unhealthy;
- `OutOfSync + Healthy`: the current workload may serve traffic, but it has drifted from Git;
- `Unknown`: comparison or health assessment could not complete.

A productive diagnostic sequence is to verify rendered manifests, inspect the diff, examine the sync operation and resource tree, and then move to Kubernetes events and logs. Green is not a finish line. It is the evidence the controller can provide at that moment.

---

## Automated sync, pruning, self-healing, and rollback are separate decisions

Automated sync can be enabled explicitly:

```yaml
spec:
  syncPolicy:
    automated:
      enabled: true
      prune: false
      selfHeal: false
```

The official [automated-sync semantics](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/) establish several important limits:

- automated sync is attempted when an Application is `OutOfSync`;
- deleting a manifest from Git does not trigger automatic pruning unless `prune` is enabled;
- changing the live cluster does not trigger self-healing unless `selfHeal` is enabled;
- `allowEmpty` is an additional safety choice, not a routine default;
- for an Application generated by ApplicationSet, update the template or use the documented temporary-control mechanism rather than patching the child;
- **Argo CD cannot perform history rollback while automated sync is enabled.**

### Two rollback paths with different meanings

`argocd app rollback APP [HISTORY_ID]` restores a previous deployment-history entry, after automated sync is disabled. But if Git still names the newer desired state, a later reconciliation can bring it back.

For a durable production recovery, the usual path is:

1. revert in Git or create an explicit corrective commit;
2. pass the required review;
3. synchronize the new desired state;
4. separately handle database migrations or external dependencies that manifests cannot reverse.

History rollback is useful for immediate recovery. A Git revert makes the recovered state durable. Neither is an automatic, SLO-driven rollback: that decision requires a rollout controller and observability system working together.

---

## Sync options change risk, not just behavior

Argo CD exposes many [sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/). Select each one for a specific problem:

| Option | Problem it addresses | What to examine |
|---|---|---|
| `CreateNamespace=true` | creates a missing destination namespace | does not by itself establish correct metadata or permissions |
| `ApplyOutOfSyncOnly=true` | reduces work for very large Applications | changes sync coverage; test interactions with hooks and waves |
| `PruneLast=true` | delays pruning until healthy sync waves finish | deletion still occurs; confirmation and recovery still matter |
| `FailOnSharedResource=true` | fails when another Application owns a resource | useful for exposing ownership collisions |
| `Delete=confirm` / `Prune=confirm` | requires approval for critical deletion | approval itself needs RBAC and audit protection |
| `ServerSideApply=true` | handles large manifests, partial resources, or field ownership | Argo CD uses `--force-conflicts`; inspect `managedFields` |
| `Replace=true` | replaces a resource when apply is unsuitable | may recreate resources and cause an outage; takes precedence over SSA |
| `Force=true` | deletes and recreates a resource | deliberately destructive; reserve for resources meant to be recreated |

Server-Side Apply is not an unconditional best practice for every Application. It is useful for concrete annotation-size, partial-manifest, and field-ownership problems. It can also transfer ownership and force conflicts. Inspect `managedFields`, co-managing controllers, and the client-side migration path before enabling it.

Hooks and sync waves are not a general-purpose orchestration engine either. They work well for PreSync, Sync, PostSync, and SyncFail operations closely bound to a release. Long-running jobs, complex data migrations, and cross-system transactions still need explicit idempotency, timeout, and compensation design.

---

## Security: pull removes one credential path and concentrates another

The pull model lets CI update Git without holding target-cluster or Argo CD API credentials. That is a real advantage. It does not make the system safe by definition. The controller can hold powerful target credentials, repo-server processes repository content, and ApplicationSet can multiply a decision across clusters.

A production baseline includes at least the following.

### Restrict both authorization layers

- **Argo CD RBAC** controls who can view, sync, override, inspect logs, or exec through Argo CD.
- **Kubernetes RBAC** controls what application-controller can actually create or modify in a target cluster.

Locking down the UI while leaving the controller permanently unrestricted does not contain the blast radius. Keep `policy.default` minimal because every authenticated user receives those permissions, and a `deny` rule cannot revoke the default grant. Validate and test policy with the commands in the official [RBAC documentation](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/) rather than relying on visual inspection.

### Use AppProject to bound the blast radius

Restrict source repositories, destinations, and resource kinds. Be especially cautious with Namespaces, CRDs, ClusterRoles, and other cluster-scoped resources. Do not let an untrusted team create Applications or ApplicationSets in an unrestricted Project.

### Treat repositories and plugins as execution boundaries

Config-management plugins execute commands in the repo-server environment. Minimize and isolate plugin images, parameters, environment variables, repository access, and credentials. Give SCM and pull-request generator tokens only the scope they require, and restrict allowed provider endpoints.

### Keep plaintext secrets out of Git

Select a secret workflow that fits the organization—External Secrets, Sealed Secrets, or SOPS, for example—and trace where plaintext appears. Encryption support does not guarantee that a secret is absent from repo-server, a cache, logs, or the target cluster.

### Pin inputs and rehearse upgrades

Pin Argo CD releases, Helm charts, remote Kustomize bases, and production application revisions. Read each relevant minor-version upgrade guide. Exercise CRDs, RBAC, diff behavior, and synchronization in a representative environment before production.

---

## ApplicationSet and multi-cluster design begin with failure domains

One Argo CD instance for many clusters provides a unified view and a smaller operating surface. It also centralizes target credentials and enlarges the control-plane failure domain. One instance per cluster improves isolation but multiplies SSO, RBAC, configuration, and upgrade work.

Before choosing a topology, answer:

1. Which clusters may share a trust domain?
2. How many applications may one repo-server or controller failure affect?
3. Can the platform team operate several upgrade and policy streams?
4. May the management cluster reach every target Kubernetes API?
5. Who owns credential rotation, revocation, and auditing?

ApplicationSet can remove repeated YAML. It cannot answer these questions. Scale is not merely the number of Applications; it is the distance one mistake can travel.

---

## A safer adoption sequence

I would introduce Argo CD in this order:

1. **Prove one manual-sync path.** Use a pinned release, one repository, one cluster, and one Application. Verify diff and health behavior.
2. **Put Application and AppProject in Git.** Make source, destination, and resource boundaries reviewable with the workload.
3. **Build observability.** Monitor reconciliation, Git requests, manifest generation, sync duration, queues, caches, and failure reasons.
4. **Enable automation in layers.** Start with automated sync, then evaluate `prune` and `selfHeal` separately. Add deletion and shared-resource safeguards.
5. **Rehearse recovery.** Test history rollback, Git revert, database recovery, and reconstruction of the Argo CD control plane.
6. **Add ApplicationSet and multiple clusters last.** Expand generation only after templates and trust boundaries are stable.

It looks slower than enabling every feature at once. It avoids the most expensive kind of rework: copying a policy to every cluster before the team knows what the policy means.

---

## FAQ

### Is Argo CD a complete CI/CD platform?

It is more precise to call it a Kubernetes continuous-delivery and GitOps reconciliation tool. CI still builds, tests, scans, and publishes images. Argo CD delivers the declared configuration and continues comparing it with the cluster.

### Does automated sync delete resources automatically?

No. Automatic pruning must be enabled explicitly, and empty Applications have an additional `allowEmpty` guard. Critical resources can require confirmed deletion or pruning alongside RBAC and recovery controls.

### What happens to an emergency live edit with self-heal enabled?

When live state differs from Git, self-heal attempts to restore Git's state. If an emergency change should remain, commit it to Git quickly. In a multi-source Application, a change in another source can trigger automated synchronization even when self-heal is disabled.

### Can I roll back to an earlier deployment?

Yes, through `argocd app rollback`, after disabling automated sync. If Git still points at the newer state, the history rollback is not durable; normally it needs a Git revert or corrective commit as well.

### Should every Application use Server-Side Apply?

No. It solves specific manifest-size, partial-management, and field-ownership problems. Review `managedFields`, co-managing controllers, and migration effects first.

### Can I edit an Application generated by ApplicationSet?

The Kubernetes object can be edited temporarily, but the controller may restore the generated template during reconciliation. Durable changes belong in the ApplicationSet template or its generator data.

---

## Closing: Git stores a commitment, not truth

“Git is the single source of truth” is memorable and incomplete. Git stores the team's public commitment about desired state. Argo CD checks whether reality has drifted from that commitment.

The commitment can still be wrong. Reliability therefore comes from more than automation: someone reviews change, boundaries constrain authority, evidence explains state, and recovery exists when judgment fails. Argo CD's deepest value is not eliminating engineering judgment. It is preserving that judgment in history and making its execution repeatable.

---

## Primary references

- [Argo CD stable documentation](https://argo-cd.readthedocs.io/en/stable/)
- [Getting Started and version-pinning guidance](https://argo-cd.readthedocs.io/en/stable/getting_started/)
- [Installation modes and high availability](https://argo-cd.readthedocs.io/en/stable/operator-manual/installation/)
- [ApplicationSet and generators](https://argo-cd.readthedocs.io/en/stable/user-guide/application-set/)
- [ApplicationSet security](https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Security/)
- [Automated sync semantics](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Sync options](https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/)
- [RBAC configuration](https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/)
- [Kubernetes container runtimes](https://kubernetes.io/docs/setup/production-environment/container-runtimes/)

*Facts and boundaries were checked on 2026-07-31. Support windows, commands, and security defaults change; use the documentation and upgrade notes for the release you deploy.*
