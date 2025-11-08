# 🚨 GitHub Actions - Relatório de Erros

**Gerado em:** 2025-11-08 22:12:26
**Repositório:** marceloterra1983/TradingSystem
**Total de Falhas Analisadas:** 15

---

## 📊 Resumo Executivo

| Workflow | Branch | Data | Status |
|----------|--------|------|--------|
| 150 | main | 2025-11-08T22:09:55Z | ❌ Failed |
| 150 | main | 2025-11-08T22:09:55Z | ❌ Failed |
| Always Generate Error Report | main | 2025-11-08T21:43:17Z | ❌ Failed |
| 130 | main | 2025-11-08T21:41:42Z | ❌ Failed |
| 130 | main | 2025-11-08T21:41:42Z | ❌ Failed |
| Always Generate Error Report | main | 2025-11-08T21:11:10Z | ❌ Failed |
| Always Generate Error Report | main | 2025-11-08T21:10:30Z | ❌ Failed |
| Always Generate Error Report | main | 2025-11-08T21:09:36Z | ❌ Failed |
| Always Generate Error Report | main | 2025-11-08T21:09:27Z | ❌ Failed |
| Always Generate Error Report | main | 2025-11-08T21:09:00Z | ❌ Failed |
| 120 | main | 2025-11-08T21:08:18Z | ❌ Failed |
| 120 | main | 2025-11-08T21:08:18Z | ❌ Failed |
| 120 | main | 2025-11-08T21:08:18Z | ❌ Failed |
| 120 | main | 2025-11-08T21:08:18Z | ❌ Failed |
| 120 | main | 2025-11-08T21:08:18Z | ❌ Failed |

---

## 🔍 Detalhes dos Erros


### 🔴 150

**Run ID:** `19199281192`
**Branch:** `main`
**Commit:** `a99c88a`
**Data:** 2025-11-08T22:09:55Z
**URL:** [19199281192](https://github.com/marceloterra1983/TradingSystem/actions/runs/19199281192)

#### 📋 Logs de Erro:

```
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:10:44.4402494Z [0;31m❌ Documentation build failed[0m
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:11:23.1552792Z [0;31m❌ Documentation build failed (exit code: 1)[0m
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:11:23.1774484Z [0;31m⚠️  Some builds failed. Check logs above.[0m
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:11:23.1861801Z ##[error]Process completed with exit code 1.
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19199281192 --log

# Re-executar workflow
gh run rerun 19199281192

# Abrir no browser
gh run view 19199281192 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 150

**Run ID:** `19199281197`
**Branch:** `main`
**Commit:** `a99c88a`
**Data:** 2025-11-08T22:09:55Z
**URL:** [19199281197](https://github.com/marceloterra1983/TradingSystem/actions/runs/19199281197)

#### 📋 Logs de Erro:

```
Validate Documentation Frontmatter	Validate frontmatter	2025-11-08T22:10:04.1481604Z [36;1m  echo "❌ Frontmatter validation failed!"[0m
Validate Documentation Frontmatter	Validate frontmatter	2025-11-08T22:10:04.1628673Z ❌ Frontmatter validation failed!
Validate Documentation Frontmatter	Validate frontmatter	2025-11-08T22:10:04.1641981Z ##[error]Process completed with exit code 1.
Validate Docusaurus Build	Build Docusaurus	2025-11-08T22:10:18.7879048Z npm error Missing script: "build"
Validate Docusaurus Build	Build Docusaurus	2025-11-08T22:10:18.7879754Z npm error
Validate Docusaurus Build	Build Docusaurus	2025-11-08T22:10:18.7880342Z npm error To see a list of scripts, run:
Validate Docusaurus Build	Build Docusaurus	2025-11-08T22:10:18.7880910Z npm error   npm run
Validate Docusaurus Build	Build Docusaurus	2025-11-08T22:10:18.7898457Z npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2025-11-08T22_10_18_721Z-debug-0.log
Validate Docusaurus Build	Build Docusaurus	2025-11-08T22:10:18.7954571Z ##[error]Process completed with exit code 1.
Validate Governance Snapshot	Check for uncommitted changes	2025-11-08T22:10:04.9628523Z [36;1m  echo "❌ Governance snapshot is out of sync!"[0m
Validate Governance Snapshot	Check for uncommitted changes	2025-11-08T22:10:04.9736364Z fatal: ambiguous argument 'governance/snapshots/governance-snapshot.json': unknown revision or path not in the working tree.
Validate Governance Snapshot	Check for uncommitted changes	2025-11-08T22:10:04.9739446Z ❌ Governance snapshot is out of sync!
Validate Governance Snapshot	Check for uncommitted changes	2025-11-08T22:10:04.9753056Z ##[error]Process completed with exit code 1.
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:05.4662432Z [36;1mERROR_COUNT=0[0m
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:05.4664943Z [36;1m    echo "❌ Error: $file"[0m
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:05.4665175Z [36;1m    ERROR_COUNT=$((ERROR_COUNT + 1))[0m
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:05.4665931Z [36;1mif [ $ERROR_COUNT -gt 0 ]; then[0m
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:05.4666242Z [36;1m  echo "❌ $ERROR_COUNT/$DIAGRAM_COUNT diagrams have syntax errors"[0m
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:46.8599310Z Some diagram description contains errors
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:46.8787106Z ❌ Error: docs/content/assets/diagrams/source/backend/idea-bank-component-architecture.puml
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:48.9825957Z Some diagram description contains errors
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:49.0010615Z ❌ Error: docs/content/assets/diagrams/source/frontend/customizable-layout-interaction-sequence.puml
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:49.6272970Z Some diagram description contains errors
Validate PlantUML Diagrams	Validate PlantUML diagrams	2025-11-08T22:10:49.6456909Z ❌ Error: docs/content/assets/diagrams/source/frontend/customizable-layout-component-architecture.puml
Validate Markdown Links	Check markdown links	2025-11-08T22:10:08.7650391Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:10.5443938Z   ERROR: 18 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:10.7885058Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:11.2989018Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:11.7006777Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:12.0508734Z   ERROR: 6 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:12.3013298Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:12.6319080Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:14.8517819Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:16.6423738Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:17.5310848Z   ERROR: 5 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:17.7819988Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:18.3721834Z   ERROR: 5 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:18.6130936Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:19.5304418Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure
Validate Markdown Links	Check markdown links	2025-11-08T22:10:19.5307739Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:19.5310021Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure → Status: 400
Validate Markdown Links	Check markdown links	2025-11-08T22:10:22.1488603Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:23.3246924Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:28.2446200Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:29.2535762Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:33.9214950Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:35.7120167Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:36.6363847Z   ERROR: 23 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:36.8760757Z   ERROR: 6 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:37.5502095Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:38.2628554Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:39.3476639Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:40.2052669Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:40.9718737Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:43.0462614Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:43.2742337Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:43.9210438Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:44.6676547Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:46.2680353Z   ERROR: 5 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:46.5000802Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure
Validate Markdown Links	Check markdown links	2025-11-08T22:10:46.5002137Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:46.5005835Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure → Status: 400
Validate Markdown Links	Check markdown links	2025-11-08T22:10:46.9494033Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:47.1779621Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:49.6991749Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:51.9842202Z Checking: docs/content/sdd/events/v1/order-failed.mdx
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.1768017Z FILE: docs/content/sdd/events/v1/order-failed.mdx
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.2032028Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.4351487Z   ERROR: 5 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.6546364Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.8828534Z   [✖] ./order-failed
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.8834275Z   ERROR: 6 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:52.8836173Z   [✖] ./order-failed → Status: 400
Validate Markdown Links	Check markdown links	2025-11-08T22:10:53.1227242Z   [✖] ../../events/v1/order-failed
Validate Markdown Links	Check markdown links	2025-11-08T22:10:53.1231871Z   ERROR: 6 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:53.1234553Z   [✖] ../../events/v1/order-failed → Status: 400
Validate Markdown Links	Check markdown links	2025-11-08T22:10:53.3545556Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:53.8166506Z   ERROR: 7 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:54.0606683Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:54.2854961Z   ERROR: 6 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:55.1576527Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:55.7456055Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:56.0630431Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:56.7667203Z   ERROR: 5 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:57.4308240Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:57.6737929Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:10:57.9089174Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:03.2290838Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:03.7150128Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:04.8208645Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:05.8144184Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:06.9117030Z   ERROR: 2 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:07.1480948Z   ERROR: 20 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:07.3841946Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:10.5988627Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:11.8877302Z   ERROR: 1 dead link found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:12.9909802Z   ERROR: 4 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:13.2372754Z   ERROR: 25 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:14.2138610Z   ERROR: 3 dead links found!
Validate Markdown Links	Check markdown links	2025-11-08T22:11:16.6479956Z   ERROR: 2 dead links found!
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19199281197 --log

# Re-executar workflow
gh run rerun 19199281197

# Abrir no browser
gh run view 19199281197 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 Always Generate Error Report

**Run ID:** `19199017547`
**Branch:** `main`
**Commit:** `8c9db76`
**Data:** 2025-11-08T21:43:17Z
**URL:** [19199017547](https://github.com/marceloterra1983/TradingSystem/actions/runs/19199017547)

#### 📋 Logs de Erro:

```
generate-error-report	Set up job	﻿2025-11-08T21:52:28.0028408Z Current runner version: '2.329.0'
generate-error-report	Set up job	2025-11-08T21:52:28.0053726Z ##[group]Runner Image Provisioner
generate-error-report	Set up job	2025-11-08T21:52:28.0054576Z Hosted Compute Agent
generate-error-report	Set up job	2025-11-08T21:52:28.0055101Z Version: 20251016.436
generate-error-report	Set up job	2025-11-08T21:52:28.0055800Z Commit: 8ab8ac8bfd662a3739dab9fe09456aba92132568
generate-error-report	Set up job	2025-11-08T21:52:28.0056472Z Build Date: 2025-10-15T20:44:12Z
generate-error-report	Set up job	2025-11-08T21:52:28.0057073Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:52:28.0057662Z ##[group]Operating System
generate-error-report	Set up job	2025-11-08T21:52:28.0058251Z Ubuntu
generate-error-report	Set up job	2025-11-08T21:52:28.0058697Z 24.04.3
generate-error-report	Set up job	2025-11-08T21:52:28.0059215Z LTS
generate-error-report	Set up job	2025-11-08T21:52:28.0059661Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:52:28.0060153Z ##[group]Runner Image
generate-error-report	Set up job	2025-11-08T21:52:28.0060778Z Image: ubuntu-24.04
generate-error-report	Set up job	2025-11-08T21:52:28.0061275Z Version: 20251102.99.1
generate-error-report	Set up job	2025-11-08T21:52:28.0062296Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20251102.99/images/ubuntu/Ubuntu2404-Readme.md
generate-error-report	Set up job	2025-11-08T21:52:28.0063988Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20251102.99
generate-error-report	Set up job	2025-11-08T21:52:28.0065324Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:52:28.0066558Z ##[group]GITHUB_TOKEN Permissions
generate-error-report	Set up job	2025-11-08T21:52:28.0068597Z Contents: write
generate-error-report	Set up job	2025-11-08T21:52:28.0069166Z Issues: write
generate-error-report	Set up job	2025-11-08T21:52:28.0069741Z Metadata: read
generate-error-report	Set up job	2025-11-08T21:52:28.0070262Z PullRequests: write
generate-error-report	Set up job	2025-11-08T21:52:28.0070747Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:52:28.0072945Z Secret source: Actions
generate-error-report	Set up job	2025-11-08T21:52:28.0073697Z Prepare workflow directory
generate-error-report	Set up job	2025-11-08T21:52:28.0398279Z Prepare all required actions
generate-error-report	Set up job	2025-11-08T21:52:28.0436812Z Getting action download info
generate-error-report	Set up job	2025-11-08T21:52:28.4058649Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
generate-error-report	Set up job	2025-11-08T21:52:28.5845510Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
generate-error-report	Set up job	2025-11-08T21:52:28.6991449Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
generate-error-report	Set up job	2025-11-08T21:52:29.0949012Z Complete job name: generate-error-report
generate-error-report	Checkout code	﻿2025-11-08T21:52:29.1663662Z ##[group]Run actions/checkout@v4
generate-error-report	Checkout code	2025-11-08T21:52:29.1664629Z with:
generate-error-report	Checkout code	2025-11-08T21:52:29.1665112Z   repository: marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:52:29.1665853Z   token: ***
generate-error-report	Checkout code	2025-11-08T21:52:29.1666264Z   ssh-strict: true
generate-error-report	Checkout code	2025-11-08T21:52:29.1666699Z   ssh-user: git
generate-error-report	Checkout code	2025-11-08T21:52:29.1667127Z   persist-credentials: true
generate-error-report	Checkout code	2025-11-08T21:52:29.1667601Z   clean: true
generate-error-report	Checkout code	2025-11-08T21:52:29.1668027Z   sparse-checkout-cone-mode: true
generate-error-report	Checkout code	2025-11-08T21:52:29.1668555Z   fetch-depth: 1
generate-error-report	Checkout code	2025-11-08T21:52:29.1668962Z   fetch-tags: false
generate-error-report	Checkout code	2025-11-08T21:52:29.1669405Z   show-progress: true
generate-error-report	Checkout code	2025-11-08T21:52:29.1669831Z   lfs: false
generate-error-report	Checkout code	2025-11-08T21:52:29.1670227Z   submodules: false
generate-error-report	Checkout code	2025-11-08T21:52:29.1670655Z   set-safe-directory: true
generate-error-report	Checkout code	2025-11-08T21:52:29.1671347Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:29.2737095Z Syncing repository: marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:52:29.2739028Z ##[group]Getting Git version info
generate-error-report	Checkout code	2025-11-08T21:52:29.2739857Z Working directory is '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	Checkout code	2025-11-08T21:52:29.2741023Z [command]/usr/bin/git version
generate-error-report	Checkout code	2025-11-08T21:52:29.2818141Z git version 2.51.2
generate-error-report	Checkout code	2025-11-08T21:52:29.2843874Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:29.2857620Z Temporarily overriding HOME='/home/runner/work/_temp/af4d4fb3-b879-48eb-a263-c1de72700a2b' before making global git config changes
generate-error-report	Checkout code	2025-11-08T21:52:29.2862876Z Adding repository directory to the temporary git global config as a safe directory
generate-error-report	Checkout code	2025-11-08T21:52:29.2864234Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/TradingSystem/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:52:29.2896613Z Deleting the contents of '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	Checkout code	2025-11-08T21:52:29.2899830Z ##[group]Initializing the repository
generate-error-report	Checkout code	2025-11-08T21:52:29.2904381Z [command]/usr/bin/git init /home/runner/work/TradingSystem/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:52:29.3001368Z hint: Using 'master' as the name for the initial branch. This default branch name
generate-error-report	Checkout code	2025-11-08T21:52:29.3003254Z hint: is subject to change. To configure the initial branch name to use in all
generate-error-report	Checkout code	2025-11-08T21:52:29.3005332Z hint: of your new repositories, which will suppress this warning, call:
generate-error-report	Checkout code	2025-11-08T21:52:29.3006489Z hint:
generate-error-report	Checkout code	2025-11-08T21:52:29.3007527Z hint: 	git config --global init.defaultBranch <name>
generate-error-report	Checkout code	2025-11-08T21:52:29.3008866Z hint:
generate-error-report	Checkout code	2025-11-08T21:52:29.3010151Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
generate-error-report	Checkout code	2025-11-08T21:52:29.3012146Z hint: 'development'. The just-created branch can be renamed via this command:
generate-error-report	Checkout code	2025-11-08T21:52:29.3014213Z hint:
generate-error-report	Checkout code	2025-11-08T21:52:29.3015193Z hint: 	git branch -m <name>
generate-error-report	Checkout code	2025-11-08T21:52:29.3016114Z hint:
generate-error-report	Checkout code	2025-11-08T21:52:29.3017343Z hint: Disable this message with "git config set advice.defaultBranchName false"
generate-error-report	Checkout code	2025-11-08T21:52:29.3019531Z Initialized empty Git repository in /home/runner/work/TradingSystem/TradingSystem/.git/
generate-error-report	Checkout code	2025-11-08T21:52:29.3022925Z [command]/usr/bin/git remote add origin https://github.com/marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:52:29.3053274Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:29.3054649Z ##[group]Disabling automatic garbage collection
generate-error-report	Checkout code	2025-11-08T21:52:29.3058024Z [command]/usr/bin/git config --local gc.auto 0
generate-error-report	Checkout code	2025-11-08T21:52:29.3087337Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:29.3088715Z ##[group]Setting up auth
generate-error-report	Checkout code	2025-11-08T21:52:29.3095067Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
generate-error-report	Checkout code	2025-11-08T21:52:29.3126213Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
generate-error-report	Checkout code	2025-11-08T21:52:29.3591143Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
generate-error-report	Checkout code	2025-11-08T21:52:29.3620406Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
generate-error-report	Checkout code	2025-11-08T21:52:29.3841350Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
generate-error-report	Checkout code	2025-11-08T21:52:29.3876367Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:29.3877586Z ##[group]Fetching the repository
generate-error-report	Checkout code	2025-11-08T21:52:29.3885167Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +8c9db766e83d8572a828c3ed0c39b92caf735cc8:refs/remotes/origin/main
generate-error-report	Checkout code	2025-11-08T21:52:32.0050331Z From https://github.com/marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:52:32.0051501Z  * [new ref]         8c9db766e83d8572a828c3ed0c39b92caf735cc8 -> origin/main
generate-error-report	Checkout code	2025-11-08T21:52:32.0083237Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:32.0084023Z ##[group]Determining the checkout info
generate-error-report	Checkout code	2025-11-08T21:52:32.0086017Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:32.0091458Z [command]/usr/bin/git sparse-checkout disable
generate-error-report	Checkout code	2025-11-08T21:52:32.0129523Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
generate-error-report	Checkout code	2025-11-08T21:52:32.0155884Z ##[group]Checking out the ref
generate-error-report	Checkout code	2025-11-08T21:52:32.0159545Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
generate-error-report	Checkout code	2025-11-08T21:52:32.7855398Z Switched to a new branch 'main'
generate-error-report	Checkout code	2025-11-08T21:52:32.7856200Z branch 'main' set up to track 'origin/main'.
generate-error-report	Checkout code	2025-11-08T21:52:32.7899246Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:52:32.7944500Z [command]/usr/bin/git log -1 --format=%H
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19199017547 --log

# Re-executar workflow
gh run rerun 19199017547

# Abrir no browser
gh run view 19199017547 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 130

**Run ID:** `19199004904`
**Branch:** `main`
**Commit:** `8c9db76`
**Data:** 2025-11-08T21:41:42Z
**URL:** [19199004904](https://github.com/marceloterra1983/TradingSystem/actions/runs/19199004904)

#### 📋 Logs de Erro:

```
Validate Docker Compose Files	Validate compose files	2025-11-08T21:56:24.1433482Z [36;1m    echo "❌ Validation failed: $compose_file"[0m
Validate Docker Compose Files	Validate compose files	2025-11-08T21:56:27.9469155Z ❌ Validation failed: ./apps/tp-capital/docker-compose.yml
Validate Docker Compose Files	Validate compose files	2025-11-08T21:56:27.9488160Z ##[error]Process completed with exit code 1.
Build & Scan llamaindex-query	Run Trivy security scanner (Table)	2025-11-08T21:57:42.2791684Z │                │ CVE-2024-58015 │          │          │                   │               │ kernel: wifi: ath12k: Fix for out-of bound access error      │
Build & Scan llamaindex-query	Upload Trivy results to GitHub Security	2025-11-08T21:57:49.3284898Z ##[error]Resource not accessible by integration - https://docs.github.com/rest
Build & Scan workspace-api	Build Docker image	2025-11-08T21:56:32.0602943Z #15 ERROR: failed to calculate checksum of ref yvdjnu07y774wa2tipdzy1ba9::142cplda012vwgyx7v5jam61w: "/shared": not found
Build & Scan workspace-api	Build Docker image	2025-11-08T21:56:32.0604927Z #16 ERROR: failed to calculate checksum of ref yvdjnu07y774wa2tipdzy1ba9::142cplda012vwgyx7v5jam61w: "/shared/logger/package.json": not found
Build & Scan workspace-api	Build Docker image	2025-11-08T21:56:32.0607040Z #17 ERROR: failed to calculate checksum of ref yvdjnu07y774wa2tipdzy1ba9::142cplda012vwgyx7v5jam61w: "/shared/middleware/package.json": not found
Build & Scan workspace-api	Build Docker image	2025-11-08T21:56:32.0618478Z ERROR: failed to build: failed to solve: failed to compute cache key: failed to calculate checksum of ref yvdjnu07y774wa2tipdzy1ba9::142cplda012vwgyx7v5jam61w: "/shared": not found
Build & Scan workspace-api	Build Docker image	2025-11-08T21:56:32.0702803Z ##[error]buildx failed with: ERROR: failed to build: failed to solve: failed to compute cache key: failed to calculate checksum of ref yvdjnu07y774wa2tipdzy1ba9::142cplda012vwgyx7v5jam61w: "/shared": not found
Build & Scan workspace-api	Upload Trivy results to GitHub Security	2025-11-08T21:56:32.6069602Z ##[error]Path does not exist: trivy-results-workspace-api.sarif
Build & Scan tp-capital	Run Trivy security scanner (Table)	2025-11-08T21:57:20.2318687Z │ app/node_modules/es-errors/package.json                                          │ node-pkg │        0        │    -    │
Build & Scan tp-capital	Run Trivy security scanner (Table)	2025-11-08T21:57:20.2349725Z │ app/node_modules/http-errors/package.json                                        │ node-pkg │        0        │    -    │
Build & Scan tp-capital	Run Trivy security scanner (Table)	2025-11-08T21:57:20.2490022Z │ usr/local/lib/node_modules/npm/node_modules/aggregate-error/package.json         │ node-pkg │        0        │    -    │
Build & Scan tp-capital	Run Trivy security scanner (Table)	2025-11-08T21:57:20.2559613Z │ usr/local/lib/node_modules/npm/node_modules/json-parse-even-better-errors/packa- │ node-pkg │        0        │    -    │
Build & Scan tp-capital	Run Trivy security scanner (Table)	2025-11-08T21:57:20.2661705Z │ usr/local/lib/node_modules/npm/node_modules/spdx-exceptions/package.json         │ node-pkg │        0        │    -    │
Build & Scan tp-capital	Upload Trivy results to GitHub Security	2025-11-08T21:57:25.4302586Z ##[error]Resource not accessible by integration - https://docs.github.com/rest
Build & Scan dashboard	Build Docker image	2025-11-08T21:56:37.7620873Z #12 ERROR: failed to calculate checksum of ref sqt00usczeyzfjbqzz200drc0::jfaz5j2lxzxv36hmn80e9uzmg: "/frontend/dashboard": not found
Build & Scan dashboard	Build Docker image	2025-11-08T21:56:37.7635022Z ERROR: failed to build: failed to solve: failed to compute cache key: failed to calculate checksum of ref sqt00usczeyzfjbqzz200drc0::jfaz5j2lxzxv36hmn80e9uzmg: "/frontend/dashboard": not found
Build & Scan dashboard	Build Docker image	2025-11-08T21:56:37.7707480Z ##[error]buildx failed with: ERROR: failed to build: failed to solve: failed to compute cache key: failed to calculate checksum of ref sqt00usczeyzfjbqzz200drc0::jfaz5j2lxzxv36hmn80e9uzmg: "/frontend/dashboard": not found
Build & Scan dashboard	Upload Trivy results to GitHub Security	2025-11-08T21:56:38.5553477Z ##[error]Path does not exist: trivy-results-dashboard.sarif
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19199004904 --log

# Re-executar workflow
gh run rerun 19199004904

# Abrir no browser
gh run view 19199004904 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 130

**Run ID:** `19199004898`
**Branch:** `main`
**Commit:** `8c9db76`
**Data:** 2025-11-08T21:41:42Z
**URL:** [19199004898](https://github.com/marceloterra1983/TradingSystem/actions/runs/19199004898)

#### 📋 Logs de Erro:

```
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T21:59:57.5554288Z [0;31m❌ Documentation build failed[0m
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:00:36.2295636Z [0;31m❌ Documentation build failed (exit code: 1)[0m
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:00:36.2715670Z [0;31m⚠️  Some builds failed. Check logs above.[0m
Build Dashboard & Docs (Parallel) (20.x)	Build (Parallel)	2025-11-08T22:00:36.2800119Z ##[error]Process completed with exit code 1.
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19199004898 --log

# Re-executar workflow
gh run rerun 19199004898

# Abrir no browser
gh run view 19199004898 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 Always Generate Error Report

**Run ID:** `19198668544`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:11:10Z
**URL:** [19198668544](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198668544)

#### 📋 Logs de Erro:

```
generate-error-report	Set up job	﻿2025-11-08T21:16:46.8761753Z Current runner version: '2.329.0'
generate-error-report	Set up job	2025-11-08T21:16:46.8790392Z ##[group]Runner Image Provisioner
generate-error-report	Set up job	2025-11-08T21:16:46.8791724Z Hosted Compute Agent
generate-error-report	Set up job	2025-11-08T21:16:46.8792278Z Version: 20251016.436
generate-error-report	Set up job	2025-11-08T21:16:46.8792884Z Commit: 8ab8ac8bfd662a3739dab9fe09456aba92132568
generate-error-report	Set up job	2025-11-08T21:16:46.8793600Z Build Date: 2025-10-15T20:44:12Z
generate-error-report	Set up job	2025-11-08T21:16:46.8794228Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:16:46.8794794Z ##[group]Operating System
generate-error-report	Set up job	2025-11-08T21:16:46.8795362Z Ubuntu
generate-error-report	Set up job	2025-11-08T21:16:46.8796044Z 24.04.3
generate-error-report	Set up job	2025-11-08T21:16:46.8796511Z LTS
generate-error-report	Set up job	2025-11-08T21:16:46.8797022Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:16:46.8797509Z ##[group]Runner Image
generate-error-report	Set up job	2025-11-08T21:16:46.8798106Z Image: ubuntu-24.04
generate-error-report	Set up job	2025-11-08T21:16:46.8798559Z Version: 20251102.99.1
generate-error-report	Set up job	2025-11-08T21:16:46.8799632Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20251102.99/images/ubuntu/Ubuntu2404-Readme.md
generate-error-report	Set up job	2025-11-08T21:16:46.8801377Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20251102.99
generate-error-report	Set up job	2025-11-08T21:16:46.8802603Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:16:46.8803834Z ##[group]GITHUB_TOKEN Permissions
generate-error-report	Set up job	2025-11-08T21:16:46.8805853Z Contents: write
generate-error-report	Set up job	2025-11-08T21:16:46.8806401Z Issues: write
generate-error-report	Set up job	2025-11-08T21:16:46.8806885Z Metadata: read
generate-error-report	Set up job	2025-11-08T21:16:46.8807467Z PullRequests: write
generate-error-report	Set up job	2025-11-08T21:16:46.8808025Z ##[endgroup]
generate-error-report	Set up job	2025-11-08T21:16:46.8810106Z Secret source: Actions
generate-error-report	Set up job	2025-11-08T21:16:46.8811160Z Prepare workflow directory
generate-error-report	Set up job	2025-11-08T21:16:46.9218227Z Prepare all required actions
generate-error-report	Set up job	2025-11-08T21:16:46.9280081Z Getting action download info
generate-error-report	Set up job	2025-11-08T21:16:47.2642489Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
generate-error-report	Set up job	2025-11-08T21:16:47.7842102Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
generate-error-report	Set up job	2025-11-08T21:16:47.9040579Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
generate-error-report	Set up job	2025-11-08T21:16:48.3250586Z Complete job name: generate-error-report
generate-error-report	Checkout code	﻿2025-11-08T21:16:48.4120150Z ##[group]Run actions/checkout@v4
generate-error-report	Checkout code	2025-11-08T21:16:48.4121954Z with:
generate-error-report	Checkout code	2025-11-08T21:16:48.4122830Z   repository: marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:16:48.4124288Z   token: ***
generate-error-report	Checkout code	2025-11-08T21:16:48.4125036Z   ssh-strict: true
generate-error-report	Checkout code	2025-11-08T21:16:48.4125823Z   ssh-user: git
generate-error-report	Checkout code	2025-11-08T21:16:48.4126623Z   persist-credentials: true
generate-error-report	Checkout code	2025-11-08T21:16:48.4127501Z   clean: true
generate-error-report	Checkout code	2025-11-08T21:16:48.4128295Z   sparse-checkout-cone-mode: true
generate-error-report	Checkout code	2025-11-08T21:16:48.4129267Z   fetch-depth: 1
generate-error-report	Checkout code	2025-11-08T21:16:48.4130040Z   fetch-tags: false
generate-error-report	Checkout code	2025-11-08T21:16:48.4131098Z   show-progress: true
generate-error-report	Checkout code	2025-11-08T21:16:48.4131917Z   lfs: false
generate-error-report	Checkout code	2025-11-08T21:16:48.4132655Z   submodules: false
generate-error-report	Checkout code	2025-11-08T21:16:48.4133469Z   set-safe-directory: true
generate-error-report	Checkout code	2025-11-08T21:16:48.4134618Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:48.5339802Z Syncing repository: marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:16:48.5344506Z ##[group]Getting Git version info
generate-error-report	Checkout code	2025-11-08T21:16:48.5346758Z Working directory is '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	Checkout code	2025-11-08T21:16:48.5350038Z [command]/usr/bin/git version
generate-error-report	Checkout code	2025-11-08T21:16:48.5417915Z git version 2.51.2
generate-error-report	Checkout code	2025-11-08T21:16:48.5447314Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:48.5463144Z Temporarily overriding HOME='/home/runner/work/_temp/fbb32061-b88f-4238-a55d-6f6c1b193905' before making global git config changes
generate-error-report	Checkout code	2025-11-08T21:16:48.5465958Z Adding repository directory to the temporary git global config as a safe directory
generate-error-report	Checkout code	2025-11-08T21:16:48.5469023Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/TradingSystem/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:16:48.5521654Z Deleting the contents of '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	Checkout code	2025-11-08T21:16:48.5525628Z ##[group]Initializing the repository
generate-error-report	Checkout code	2025-11-08T21:16:48.5530591Z [command]/usr/bin/git init /home/runner/work/TradingSystem/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:16:48.5636510Z hint: Using 'master' as the name for the initial branch. This default branch name
generate-error-report	Checkout code	2025-11-08T21:16:48.5639157Z hint: is subject to change. To configure the initial branch name to use in all
generate-error-report	Checkout code	2025-11-08T21:16:48.5642445Z hint: of your new repositories, which will suppress this warning, call:
generate-error-report	Checkout code	2025-11-08T21:16:48.5644839Z hint:
generate-error-report	Checkout code	2025-11-08T21:16:48.5646448Z hint: 	git config --global init.defaultBranch <name>
generate-error-report	Checkout code	2025-11-08T21:16:48.5648816Z hint:
generate-error-report	Checkout code	2025-11-08T21:16:48.5650599Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
generate-error-report	Checkout code	2025-11-08T21:16:48.5654054Z hint: 'development'. The just-created branch can be renamed via this command:
generate-error-report	Checkout code	2025-11-08T21:16:48.5656552Z hint:
generate-error-report	Checkout code	2025-11-08T21:16:48.5657759Z hint: 	git branch -m <name>
generate-error-report	Checkout code	2025-11-08T21:16:48.5659144Z hint:
generate-error-report	Checkout code	2025-11-08T21:16:48.5661239Z hint: Disable this message with "git config set advice.defaultBranchName false"
generate-error-report	Checkout code	2025-11-08T21:16:48.5663500Z Initialized empty Git repository in /home/runner/work/TradingSystem/TradingSystem/.git/
generate-error-report	Checkout code	2025-11-08T21:16:48.5666964Z [command]/usr/bin/git remote add origin https://github.com/marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:16:48.5694669Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:48.5697074Z ##[group]Disabling automatic garbage collection
generate-error-report	Checkout code	2025-11-08T21:16:48.5699361Z [command]/usr/bin/git config --local gc.auto 0
generate-error-report	Checkout code	2025-11-08T21:16:48.5732835Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:48.5735168Z ##[group]Setting up auth
generate-error-report	Checkout code	2025-11-08T21:16:48.5741578Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
generate-error-report	Checkout code	2025-11-08T21:16:48.5782592Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
generate-error-report	Checkout code	2025-11-08T21:16:48.6142470Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
generate-error-report	Checkout code	2025-11-08T21:16:48.6177170Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
generate-error-report	Checkout code	2025-11-08T21:16:48.6407867Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
generate-error-report	Checkout code	2025-11-08T21:16:48.6453182Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:48.6455720Z ##[group]Fetching the repository
generate-error-report	Checkout code	2025-11-08T21:16:48.6465066Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +505d7b65806c15594b86a0e77548ec4653df824d:refs/remotes/origin/main
generate-error-report	Checkout code	2025-11-08T21:16:51.1265111Z From https://github.com/marceloterra1983/TradingSystem
generate-error-report	Checkout code	2025-11-08T21:16:51.1266531Z  * [new ref]         505d7b65806c15594b86a0e77548ec4653df824d -> origin/main
generate-error-report	Checkout code	2025-11-08T21:16:51.1299140Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:51.1299639Z ##[group]Determining the checkout info
generate-error-report	Checkout code	2025-11-08T21:16:51.1301510Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:51.1306559Z [command]/usr/bin/git sparse-checkout disable
generate-error-report	Checkout code	2025-11-08T21:16:51.1347733Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
generate-error-report	Checkout code	2025-11-08T21:16:51.1375368Z ##[group]Checking out the ref
generate-error-report	Checkout code	2025-11-08T21:16:51.1379438Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
generate-error-report	Checkout code	2025-11-08T21:16:51.9042309Z Switched to a new branch 'main'
generate-error-report	Checkout code	2025-11-08T21:16:51.9043109Z branch 'main' set up to track 'origin/main'.
generate-error-report	Checkout code	2025-11-08T21:16:51.9087120Z ##[endgroup]
generate-error-report	Checkout code	2025-11-08T21:16:51.9129424Z [command]/usr/bin/git log -1 --format=%H
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198668544 --log

# Re-executar workflow
gh run rerun 19198668544

# Abrir no browser
gh run view 19198668544 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 Always Generate Error Report

**Run ID:** `19198662188`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:10:30Z
**URL:** [19198662188](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198662188)

#### 📋 Logs de Erro:

```
generate-error-report	UNKNOWN STEP	﻿2025-11-08T21:10:34.4011473Z Current runner version: '2.329.0'
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4036293Z ##[group]Runner Image Provisioner
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4037076Z Hosted Compute Agent
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4037625Z Version: 20251016.436
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4038229Z Commit: 8ab8ac8bfd662a3739dab9fe09456aba92132568
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4038933Z Build Date: 2025-10-15T20:44:12Z
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4039488Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4040073Z ##[group]Operating System
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4040623Z Ubuntu
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4041100Z 24.04.3
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4041596Z LTS
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4042031Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4042523Z ##[group]Runner Image
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4043055Z Image: ubuntu-24.04
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4043817Z Version: 20251102.99.1
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4044794Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20251102.99/images/ubuntu/Ubuntu2404-Readme.md
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4046374Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20251102.99
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4047360Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4048546Z ##[group]GITHUB_TOKEN Permissions
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4050548Z Contents: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4051066Z Issues: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4051646Z Metadata: read
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4052118Z PullRequests: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4052638Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4055552Z Secret source: Actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4056354Z Prepare workflow directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4390784Z Prepare all required actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.4430957Z Getting action download info
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.8370481Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:34.9574742Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.1277399Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.7621991Z Complete job name: generate-error-report
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8307207Z ##[group]Run actions/checkout@v4
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8308057Z with:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8308499Z   repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8309201Z   token: ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8309624Z   ssh-strict: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8310061Z   ssh-user: git
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8310498Z   persist-credentials: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8310982Z   clean: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8311417Z   sparse-checkout-cone-mode: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8311938Z   fetch-depth: 1
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8312376Z   fetch-tags: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8312823Z   show-progress: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8313511Z   lfs: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8313931Z   submodules: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8314393Z   set-safe-directory: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.8315101Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9410598Z Syncing repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9413661Z ##[group]Getting Git version info
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9415064Z Working directory is '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9416833Z [command]/usr/bin/git version
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9518015Z git version 2.51.2
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9546029Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9561411Z Temporarily overriding HOME='/home/runner/work/_temp/93556e69-f45f-4ed1-a440-31f071023ac7' before making global git config changes
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9564107Z Adding repository directory to the temporary git global config as a safe directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9568367Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9654754Z Deleting the contents of '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9658995Z ##[group]Initializing the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:35.9664102Z [command]/usr/bin/git init /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0310235Z hint: Using 'master' as the name for the initial branch. This default branch name
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0312003Z hint: is subject to change. To configure the initial branch name to use in all
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0313831Z hint: of your new repositories, which will suppress this warning, call:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0314667Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0315266Z hint: 	git config --global init.defaultBranch <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0316040Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0316586Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0317475Z hint: 'development'. The just-created branch can be renamed via this command:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0318179Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0318554Z hint: 	git branch -m <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0318989Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0319576Z hint: Disable this message with "git config set advice.defaultBranchName false"
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0357921Z Initialized empty Git repository in /home/runner/work/TradingSystem/TradingSystem/.git/
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0371979Z [command]/usr/bin/git remote add origin https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0447400Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0448639Z ##[group]Disabling automatic garbage collection
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0452441Z [command]/usr/bin/git config --local gc.auto 0
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0481631Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0482870Z ##[group]Setting up auth
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0489719Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.0520899Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.2282113Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.2314666Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.2538359Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.2582335Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.2583983Z ##[group]Fetching the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:36.2591658Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +505d7b65806c15594b86a0e77548ec4653df824d:refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4675615Z From https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4676470Z  * [new ref]         505d7b65806c15594b86a0e77548ec4653df824d -> origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4757108Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4757785Z ##[group]Determining the checkout info
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4759279Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4764863Z [command]/usr/bin/git sparse-checkout disable
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4805677Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4834005Z ##[group]Checking out the ref
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:38.4837985Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:39.2874789Z Switched to a new branch 'main'
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:39.2875449Z branch 'main' set up to track 'origin/main'.
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:39.2921279Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:10:39.2965988Z [command]/usr/bin/git log -1 --format=%H
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198662188 --log

# Re-executar workflow
gh run rerun 19198662188

# Abrir no browser
gh run view 19198662188 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 Always Generate Error Report

**Run ID:** `19198651055`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:09:36Z
**URL:** [19198651055](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198651055)

#### 📋 Logs de Erro:

```
generate-error-report	UNKNOWN STEP	﻿2025-11-08T21:09:39.8788155Z Current runner version: '2.329.0'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8815209Z ##[group]Runner Image Provisioner
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8816090Z Hosted Compute Agent
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8816777Z Version: 20251016.436
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8817423Z Commit: 8ab8ac8bfd662a3739dab9fe09456aba92132568
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8818179Z Build Date: 2025-10-15T20:44:12Z
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8818840Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8819488Z ##[group]Operating System
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8820097Z Ubuntu
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8820681Z 24.04.3
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8821202Z LTS
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8821960Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8822587Z ##[group]Runner Image
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8823231Z Image: ubuntu-24.04
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8823800Z Version: 20251102.99.1
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8824828Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20251102.99/images/ubuntu/Ubuntu2404-Readme.md
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8826535Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20251102.99
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8827588Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8828910Z ##[group]GITHUB_TOKEN Permissions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8831196Z Contents: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8832165Z Issues: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8832752Z Metadata: read
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8833284Z PullRequests: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8833935Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8836501Z Secret source: Actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.8837592Z Prepare workflow directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.9297454Z Prepare all required actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:39.9355492Z Getting action download info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:40.3238841Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:40.6674272Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:40.7853124Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.2317260Z Complete job name: generate-error-report
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3093682Z ##[group]Run actions/checkout@v4
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3094675Z with:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3095163Z   repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3096085Z   token: ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3096504Z   ssh-strict: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3096939Z   ssh-user: git
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3097386Z   persist-credentials: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3097893Z   clean: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3098351Z   sparse-checkout-cone-mode: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3098913Z   fetch-depth: 1
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3099347Z   fetch-tags: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3099814Z   show-progress: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3100266Z   lfs: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3100690Z   submodules: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3101150Z   set-safe-directory: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.3102090Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4264671Z Syncing repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4268106Z ##[group]Getting Git version info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4269723Z Working directory is '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4271432Z [command]/usr/bin/git version
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4333724Z git version 2.51.2
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4361161Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4378876Z Temporarily overriding HOME='/home/runner/work/_temp/5983be31-a278-4651-bcd4-202a27bf9ac5' before making global git config changes
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4382555Z Adding repository directory to the temporary git global config as a safe directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4385875Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4429998Z Deleting the contents of '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4433933Z ##[group]Initializing the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4438456Z [command]/usr/bin/git init /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4546395Z hint: Using 'master' as the name for the initial branch. This default branch name
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4548637Z hint: is subject to change. To configure the initial branch name to use in all
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4551176Z hint: of your new repositories, which will suppress this warning, call:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4552855Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4553466Z hint: 	git config --global init.defaultBranch <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4554486Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4555306Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4556605Z hint: 'development'. The just-created branch can be renamed via this command:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4557759Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4558336Z hint: 	git branch -m <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4559039Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4559730Z hint: Disable this message with "git config set advice.defaultBranchName false"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4561015Z Initialized empty Git repository in /home/runner/work/TradingSystem/TradingSystem/.git/
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4565743Z [command]/usr/bin/git remote add origin https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4604203Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4605571Z ##[group]Disabling automatic garbage collection
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4609245Z [command]/usr/bin/git config --local gc.auto 0
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4639700Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4641071Z ##[group]Setting up auth
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4649415Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.4683558Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.5113438Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.5148187Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.5380460Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.5430031Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.5431897Z ##[group]Fetching the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:41.5441849Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +505d7b65806c15594b86a0e77548ec4653df824d:refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1398674Z From https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1403878Z  * [new ref]         505d7b65806c15594b86a0e77548ec4653df824d -> origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1433332Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1433801Z ##[group]Determining the checkout info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1435629Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1440338Z [command]/usr/bin/git sparse-checkout disable
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1480308Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1508494Z ##[group]Checking out the ref
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.1512504Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.9270638Z Switched to a new branch 'main'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.9271414Z branch 'main' set up to track 'origin/main'.
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.9316285Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:44.9363783Z [command]/usr/bin/git log -1 --format=%H
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198651055 --log

# Re-executar workflow
gh run rerun 19198651055

# Abrir no browser
gh run view 19198651055 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 Always Generate Error Report

**Run ID:** `19198649686`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:09:27Z
**URL:** [19198649686](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198649686)

#### 📋 Logs de Erro:

```
generate-error-report	UNKNOWN STEP	﻿2025-11-08T21:09:30.5591189Z Current runner version: '2.329.0'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5626088Z ##[group]Runner Image Provisioner
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5627305Z Hosted Compute Agent
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5628330Z Version: 20251016.436
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5629385Z Commit: 8ab8ac8bfd662a3739dab9fe09456aba92132568
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5630588Z Build Date: 2025-10-15T20:44:12Z
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5631809Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5632973Z ##[group]Operating System
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5634043Z Ubuntu
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5635034Z 24.04.3
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5635802Z LTS
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5636677Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5637541Z ##[group]Runner Image
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5638547Z Image: ubuntu-24.04
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5639367Z Version: 20251102.99.1
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5641194Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20251102.99/images/ubuntu/Ubuntu2404-Readme.md
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5644149Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20251102.99
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5646077Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5648381Z ##[group]GITHUB_TOKEN Permissions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5650895Z Contents: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5651790Z Issues: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5653067Z Metadata: read
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5653925Z PullRequests: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5654977Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5658079Z Secret source: Actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.5659326Z Prepare workflow directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.6139776Z Prepare all required actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.6198120Z Getting action download info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:30.8367859Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.3501344Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.4755436Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8075037Z Complete job name: generate-error-report
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8899506Z ##[group]Run actions/checkout@v4
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8900870Z with:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8901726Z   repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8903302Z   token: ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8904069Z   ssh-strict: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8904872Z   ssh-user: git
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8905684Z   persist-credentials: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8906599Z   clean: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8907409Z   sparse-checkout-cone-mode: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8908415Z   fetch-depth: 1
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8909201Z   fetch-tags: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8910027Z   show-progress: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8910860Z   lfs: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8911612Z   submodules: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8912446Z   set-safe-directory: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:31.8913724Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0010738Z Syncing repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0013812Z ##[group]Getting Git version info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0015376Z Working directory is '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0017437Z [command]/usr/bin/git version
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0093675Z git version 2.51.2
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0119641Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0134205Z Temporarily overriding HOME='/home/runner/work/_temp/fff1caba-7bb1-43db-98df-ef57af1b2561' before making global git config changes
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0137053Z Adding repository directory to the temporary git global config as a safe directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0139912Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0174592Z Deleting the contents of '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0177609Z ##[group]Initializing the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0181861Z [command]/usr/bin/git init /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0335364Z hint: Using 'master' as the name for the initial branch. This default branch name
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0337657Z hint: is subject to change. To configure the initial branch name to use in all
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0340792Z hint: of your new repositories, which will suppress this warning, call:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0343654Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0345410Z hint: 	git config --global init.defaultBranch <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0347547Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0349438Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0352837Z hint: 'development'. The just-created branch can be renamed via this command:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0355476Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0356774Z hint: 	git branch -m <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0358217Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0360186Z hint: Disable this message with "git config set advice.defaultBranchName false"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0363244Z Initialized empty Git repository in /home/runner/work/TradingSystem/TradingSystem/.git/
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0366999Z [command]/usr/bin/git remote add origin https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0393531Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0396320Z ##[group]Disabling automatic garbage collection
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0398647Z [command]/usr/bin/git config --local gc.auto 0
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0427991Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0430359Z ##[group]Setting up auth
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0435768Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0468581Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0819035Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.0856625Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.1093425Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.1129380Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.1131890Z ##[group]Fetching the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:32.1141233Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +505d7b65806c15594b86a0e77548ec4653df824d:refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9327044Z From https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9328122Z  * [new ref]         505d7b65806c15594b86a0e77548ec4653df824d -> origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9360194Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9361086Z ##[group]Determining the checkout info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9363303Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9370221Z [command]/usr/bin/git sparse-checkout disable
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9413709Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9443791Z ##[group]Checking out the ref
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:33.9449002Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:34.7136460Z Switched to a new branch 'main'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:34.7137309Z branch 'main' set up to track 'origin/main'.
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:34.7181635Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:34.7225052Z [command]/usr/bin/git log -1 --format=%H
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198649686 --log

# Re-executar workflow
gh run rerun 19198649686

# Abrir no browser
gh run view 19198649686 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 Always Generate Error Report

**Run ID:** `19198642950`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:09:00Z
**URL:** [19198642950](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198642950)

#### 📋 Logs de Erro:

```
generate-error-report	UNKNOWN STEP	﻿2025-11-08T21:09:15.3540022Z Current runner version: '2.329.0'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3563961Z ##[group]Runner Image Provisioner
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3564786Z Hosted Compute Agent
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3565433Z Version: 20251016.436
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3566016Z Commit: 8ab8ac8bfd662a3739dab9fe09456aba92132568
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3566737Z Build Date: 2025-10-15T20:44:12Z
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3567341Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3567935Z ##[group]Operating System
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3568650Z Ubuntu
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3569183Z 24.04.3
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3569646Z LTS
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3570110Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3570650Z ##[group]Runner Image
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3571224Z Image: ubuntu-24.04
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3571771Z Version: 20251102.99.1
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3572737Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20251102.99/images/ubuntu/Ubuntu2404-Readme.md
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3574354Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20251102.99
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3575376Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3576578Z ##[group]GITHUB_TOKEN Permissions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3578789Z Contents: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3579434Z Issues: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3579949Z Metadata: read
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3580446Z PullRequests: write
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3581045Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3583178Z Secret source: Actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3583833Z Prepare workflow directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3895140Z Prepare all required actions
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.3931897Z Getting action download info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:15.8495470Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.0271068Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.1381271Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.6861392Z Complete job name: generate-error-report
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7554581Z ##[group]Run actions/checkout@v4
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7555461Z with:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7555929Z   repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7556642Z   token: ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7557042Z   ssh-strict: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7557454Z   ssh-user: git
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7557916Z   persist-credentials: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7558748Z   clean: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7559184Z   sparse-checkout-cone-mode: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7559691Z   fetch-depth: 1
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7560100Z   fetch-tags: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7560506Z   show-progress: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7560939Z   lfs: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7561332Z   submodules: false
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7561775Z   set-safe-directory: true
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.7562535Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8642186Z Syncing repository: marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8643994Z ##[group]Getting Git version info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8645040Z Working directory is '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8646127Z [command]/usr/bin/git version
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8712483Z git version 2.51.2
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8737884Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8752189Z Temporarily overriding HOME='/home/runner/work/_temp/d4e4f0d7-b0a9-495e-8e7f-eb1a21f36fb4' before making global git config changes
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8753576Z Adding repository directory to the temporary git global config as a safe directory
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8757325Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8791490Z Deleting the contents of '/home/runner/work/TradingSystem/TradingSystem'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8794863Z ##[group]Initializing the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8798747Z [command]/usr/bin/git init /home/runner/work/TradingSystem/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8897579Z hint: Using 'master' as the name for the initial branch. This default branch name
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8899283Z hint: is subject to change. To configure the initial branch name to use in all
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8900849Z hint: of your new repositories, which will suppress this warning, call:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8901545Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8902028Z hint: 	git config --global init.defaultBranch <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8903066Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8903935Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8905344Z hint: 'development'. The just-created branch can be renamed via this command:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8906300Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8906688Z hint: 	git branch -m <name>
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8907149Z hint:
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8907845Z hint: Disable this message with "git config set advice.defaultBranchName false"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8909320Z Initialized empty Git repository in /home/runner/work/TradingSystem/TradingSystem/.git/
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8914007Z [command]/usr/bin/git remote add origin https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8947148Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8948568Z ##[group]Disabling automatic garbage collection
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8952195Z [command]/usr/bin/git config --local gc.auto 0
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8980235Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8981449Z ##[group]Setting up auth
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.8987729Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9018293Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9356502Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9386805Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9606906Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9649334Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9650576Z ##[group]Fetching the repository
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:16.9659399Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +505d7b65806c15594b86a0e77548ec4653df824d:refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9399255Z From https://github.com/marceloterra1983/TradingSystem
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9400256Z  * [new ref]         505d7b65806c15594b86a0e77548ec4653df824d -> origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9424206Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9424969Z ##[group]Determining the checkout info
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9426789Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9432497Z [command]/usr/bin/git sparse-checkout disable
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9471216Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9497857Z ##[group]Checking out the ref
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:18.9502337Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:19.7146345Z Switched to a new branch 'main'
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:19.7147723Z branch 'main' set up to track 'origin/main'.
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:19.7192298Z ##[endgroup]
generate-error-report	UNKNOWN STEP	2025-11-08T21:09:19.7229503Z [command]/usr/bin/git log -1 --format=%H
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198642950 --log

# Re-executar workflow
gh run rerun 19198642950

# Abrir no browser
gh run view 19198642950 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 120

**Run ID:** `19198636800`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:08:18Z
**URL:** [19198636800](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198636800)

#### 📋 Logs de Erro:

```
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:51.2605413Z [22m[39m[DocsSearch] Hybrid search failed: Qdrant connection failed
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:52.1943329Z [22m[39mError: Not implemented: navigation (except hash changes)
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:52.1958706Z [22m[39mError: Not implemented: navigation (except hash changes)
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:56.5378190Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:56.5386693Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:56.7165892Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:56.8116736Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:56.9030323Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.0189834Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.1100660Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.1845131Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.2988364Z [90mstdout[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.2990470Z [90mstderr[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.2990858Z [22m[39m[DocsSearch] Non-recoverable error: Network error
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.3000486Z [90mstdout[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.3002600Z [90mstdout[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.3003041Z [22m[39m[DocsSearch] Hybrid search failed: Network error
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.3005379Z [90mstdout[2m | src/__tests__/components/DocsHybridSearchPage.spec.tsx[2m > [22m[2mDocsHybridSearchPage - Essential Tests[2m > [22m[2m6. Error Handling[2m > [22m[2mshould display error when both searches fail
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:57.3034974Z    [33m[2m✓[22m[39m DocsHybridSearchPage - Essential Tests[2m > [22m6. Error Handling[2m > [22mshould display error when both searches fail [33m 795[2mms[22m[39m
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:59.5099669Z   errors.ts        |       0 |        0 |       0 |       0 | 1-11              
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:59.8036498Z   fail_ci_if_error: false
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:09:00.3376261Z Could not pull latest version information: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:09:00.9425332Z error - 2025-11-08 21:09:00,942 -- Commit creating failed: {"message":"Token required - not valid tokenless upload"}
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:09:01.6558088Z error - 2025-11-08 21:09:01,655 -- Report creating failed: {"message":"Token required - not valid tokenless upload"}
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:09:03.6582425Z error - 2025-11-08 21:09:03,657 -- Upload failed: {"message":"Token required - not valid tokenless upload"}
Test Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:09:04.3148928Z Failed to save: Unable to reserve cache with key node-cache-Linux-x64-npm-be3768202db508ce0ca113de6a5c32798c90941a302f55d823af5873ab2d9374, another job may be creating this cache.
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5794014Z npm error code EUSAGE
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5794537Z npm error
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5795935Z npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5797363Z npm error
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5797857Z npm error Missing: @eslint/js@9.39.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5798511Z npm error Missing: eslint@9.39.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5799289Z npm error Missing: @eslint-community/eslint-utils@4.9.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5800017Z npm error Missing: @eslint-community/regexpp@4.12.2 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5800528Z npm error Missing: @eslint/config-array@0.21.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5801031Z npm error Missing: @eslint/config-helpers@0.4.2 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5801441Z npm error Missing: @eslint/core@0.17.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5801843Z npm error Missing: @eslint/eslintrc@3.3.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5802266Z npm error Missing: @eslint/plugin-kit@0.4.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5802940Z npm error Missing: @humanfs/node@0.16.7 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5803731Z npm error Missing: @humanwhocodes/module-importer@1.0.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5804214Z npm error Missing: @humanwhocodes/retry@0.4.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5804623Z npm error Missing: @types/estree@1.0.8 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5805197Z npm error Missing: ajv@6.12.6 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5805859Z npm error Missing: debug@4.4.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5806794Z npm error Missing: escape-string-regexp@4.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5807900Z npm error Missing: eslint-scope@8.4.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5808667Z npm error Missing: eslint-visitor-keys@4.2.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5809287Z npm error Missing: espree@10.4.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5809807Z npm error Missing: esquery@1.6.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5810330Z npm error Missing: esutils@2.0.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5810938Z npm error Missing: fast-deep-equal@3.1.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5811565Z npm error Missing: file-entry-cache@8.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5812191Z npm error Missing: find-up@5.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5812701Z npm error Missing: glob-parent@6.0.2 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5813268Z npm error Missing: ignore@5.3.2 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5813996Z npm error Missing: json-stable-stringify-without-jsonify@1.0.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5814727Z npm error Missing: lodash.merge@4.6.2 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5815345Z npm error Missing: optionator@0.9.4 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5815822Z npm error Missing: eslint-visitor-keys@3.4.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5816503Z npm error Missing: @eslint/object-schema@2.1.7 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5816944Z npm error Missing: debug@4.4.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5817323Z npm error Missing: @types/json-schema@7.0.15 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5817682Z npm error Missing: debug@4.4.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5818020Z npm error Missing: globals@14.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5818381Z npm error Missing: import-fresh@3.3.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5818735Z npm error Missing: js-yaml@4.1.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5819057Z npm error Missing: levn@0.4.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5819413Z npm error Missing: @humanfs/core@0.19.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5819829Z npm error Missing: json-schema-traverse@0.4.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5820211Z npm error Missing: uri-js@4.4.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5820555Z npm error Missing: esrecurse@4.3.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5821149Z npm error Missing: estraverse@5.3.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5821508Z npm error Missing: acorn@8.15.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5821865Z npm error Missing: acorn-jsx@5.3.2 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5822238Z npm error Missing: flat-cache@4.0.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5822588Z npm error Missing: flatted@3.3.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5822924Z npm error Missing: keyv@4.5.4 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5823287Z npm error Missing: parent-module@1.0.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5823664Z npm error Missing: resolve-from@4.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5824043Z npm error Missing: json-buffer@3.0.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5824406Z npm error Missing: prelude-ls@1.2.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5824765Z npm error Missing: type-check@0.4.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5825105Z npm error Missing: deep-is@0.1.4 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5825482Z npm error Missing: fast-levenshtein@2.0.6 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5825863Z npm error Missing: word-wrap@1.2.5 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5826196Z npm error Missing: ms@2.1.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5826735Z npm error Missing: ms@2.1.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5827062Z npm error Missing: argparse@2.0.1 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5827394Z npm error Missing: ms@2.1.3 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5827730Z npm error Missing: locate-path@6.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5828173Z npm error Missing: p-locate@5.0.0 from lock file
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5828472Z npm error
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5828701Z npm error Clean install a project
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5828934Z npm error
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5829111Z npm error Usage:
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5829297Z npm error npm ci
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5829472Z npm error
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5829659Z npm error Options:
Test Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:09:00.5830081Z npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198636800 --log

# Re-executar workflow
gh run rerun 19198636800

# Abrir no browser
gh run view 19198636800 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 120

**Run ID:** `19198636808`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:08:18Z
**URL:** [19198636808](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198636808)

#### 📋 Logs de Erro:

```
Lint Frontend (Dashboard)	UNKNOWN STEP	2025-11-08T21:08:39.1960281Z ✖ 4 problems (0 errors, 4 warnings)
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0387059Z npm error code EUSAGE
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0387616Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0389313Z npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0390637Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0391181Z npm error Missing: @eslint/js@9.39.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0391899Z npm error Missing: eslint@9.39.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0392799Z npm error Missing: @eslint-community/eslint-utils@4.9.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0393799Z npm error Missing: @eslint-community/regexpp@4.12.2 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0394907Z npm error Missing: @eslint/config-array@0.21.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0395892Z npm error Missing: @eslint/config-helpers@0.4.2 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0396707Z npm error Missing: @eslint/core@0.17.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0397471Z npm error Missing: @eslint/eslintrc@3.3.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0398262Z npm error Missing: @eslint/plugin-kit@0.4.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0399079Z npm error Missing: @humanfs/node@0.16.7 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0399953Z npm error Missing: @humanwhocodes/module-importer@1.0.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0400822Z npm error Missing: @humanwhocodes/retry@0.4.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0401543Z npm error Missing: @types/estree@1.0.8 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0402098Z npm error Missing: ajv@6.12.6 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0402608Z npm error Missing: debug@4.4.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0403300Z npm error Missing: escape-string-regexp@4.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0403964Z npm error Missing: eslint-scope@8.4.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0404884Z npm error Missing: eslint-visitor-keys@4.2.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0405508Z npm error Missing: espree@10.4.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0406048Z npm error Missing: esquery@1.6.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0406593Z npm error Missing: esutils@2.0.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0407180Z npm error Missing: fast-deep-equal@3.1.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0407912Z npm error Missing: file-entry-cache@8.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0408510Z npm error Missing: find-up@5.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0408877Z npm error Missing: glob-parent@6.0.2 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0409260Z npm error Missing: ignore@5.3.2 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0409739Z npm error Missing: json-stable-stringify-without-jsonify@1.0.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0410230Z npm error Missing: lodash.merge@4.6.2 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0410616Z npm error Missing: optionator@0.9.4 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0411026Z npm error Missing: eslint-visitor-keys@3.4.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0411466Z npm error Missing: @eslint/object-schema@2.1.7 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0411855Z npm error Missing: debug@4.4.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0412236Z npm error Missing: @types/json-schema@7.0.15 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0412854Z npm error Missing: debug@4.4.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0413205Z npm error Missing: globals@14.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0413589Z npm error Missing: import-fresh@3.3.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0413960Z npm error Missing: js-yaml@4.1.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0414293Z npm error Missing: levn@0.4.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0414902Z npm error Missing: @humanfs/core@0.19.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0415340Z npm error Missing: json-schema-traverse@0.4.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0415726Z npm error Missing: uri-js@4.4.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0416067Z npm error Missing: esrecurse@4.3.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0416634Z npm error Missing: estraverse@5.3.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0417005Z npm error Missing: acorn@8.15.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0417359Z npm error Missing: acorn-jsx@5.3.2 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0417711Z npm error Missing: flat-cache@4.0.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0418060Z npm error Missing: flatted@3.3.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0418393Z npm error Missing: keyv@4.5.4 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0418773Z npm error Missing: parent-module@1.0.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0419160Z npm error Missing: resolve-from@4.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0419542Z npm error Missing: json-buffer@3.0.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0419920Z npm error Missing: prelude-ls@1.2.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0420286Z npm error Missing: type-check@0.4.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0420637Z npm error Missing: deep-is@0.1.4 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0421014Z npm error Missing: fast-levenshtein@2.0.6 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0421400Z npm error Missing: word-wrap@1.2.5 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0421743Z npm error Missing: ms@2.1.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0422058Z npm error Missing: ms@2.1.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0422385Z npm error Missing: argparse@2.0.1 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0422719Z npm error Missing: ms@2.1.3 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0423060Z npm error Missing: locate-path@6.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0423437Z npm error Missing: p-locate@5.0.0 from lock file
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0423763Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0424043Z npm error Clean install a project
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0424274Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0424449Z npm error Usage:
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0424836Z npm error npm ci
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0425024Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0425207Z npm error Options:
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0425633Z npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0426260Z npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0426885Z npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0427498Z npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0427994Z npm error [--no-bin-links] [--no-fund] [--dry-run]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0428474Z npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0429019Z npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0429377Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0429715Z npm error aliases: clean-install, ic, install-clean, isntall-clean
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0430043Z npm error
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0430284Z npm error Run "npm help ci" for more info
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0430863Z npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2025-11-08T21_08_31_643Z-debug-0.log
Lint Backend (Workspace API)	UNKNOWN STEP	2025-11-08T21:08:35.0508023Z ##[error]Process completed with exit code 1.
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.7932700Z content/apps/telegram-gateway/troubleshooting.mdx:54 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "#### Redis Connection Failed"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.7935202Z content/apps/telegram-gateway/troubleshooting.mdx:66 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "#### Database Connection Failed"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.8085362Z content/apps/tp-capital/plan-implementation-complete.md:425 MD032/blanks-around-lists Lists should be surrounded by blank lines [Context: "- ❌ Schema collisions"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.8422484Z content/apps/workspace/categories-integration.md:22 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "### Antes ❌"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.8740107Z content/frontend/guidelines/hard-refresh.md:110 MD032/blanks-around-lists Lists should be surrounded by blank lines [Context: "- ❌ Se ver erros vermelhos → m..."]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.8939849Z content/governance/code-docs-sync.mdx:211 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "### 8.3 CI Failures"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.8942836Z content/governance/code-docs-sync.mdx:217 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "### 8.4 PR Automation Failures"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.9036392Z content/governance/controls/pre-deploy-checklist.mdx:345 MD022/blanks-around-headings Headings should be surrounded by blank lines [Expected: 1; Actual: 0; Below] [Context: "### Scenario 3: Frontend Shows "Failed to fetch""]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.9080579Z content/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.mdx:10 MD025/single-title/single-h1 Multiple top-level headings in the same document [Context: "Incident Report: TP-Capital Co..."]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.9081267Z content/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.mdx:62 MD031/blanks-around-fences Fenced code blocks should be surrounded by blank lines [Context: "```"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.9081955Z content/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.mdx:62 MD040/fenced-code-language Fenced code blocks should have a language specified [Context: "```"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.9082654Z content/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.mdx:67 MD031/blanks-around-fences Fenced code blocks should be surrounded by blank lines [Context: "```bash"]
Lint Documentation	UNKNOWN STEP	2025-11-08T21:08:42.9083346Z content/governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure.mdx:85 MD031/blanks-around-fences Fenced code blocks should be surrounded by blank lines [Context: "```"]
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198636808 --log

# Re-executar workflow
gh run rerun 19198636808

# Abrir no browser
gh run view 19198636808 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 120

**Run ID:** `19198636801`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:08:18Z
**URL:** [19198636801](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198636801)

#### 📋 Logs de Erro:

```
Build Dashboard & Docs (Parallel) (20.x)	UNKNOWN STEP	2025-11-08T21:09:05.6350273Z [0;31m❌ Documentation build failed[0m
Build Dashboard & Docs (Parallel) (20.x)	UNKNOWN STEP	2025-11-08T21:09:44.0549224Z [0;31m❌ Documentation build failed (exit code: 1)[0m
Build Dashboard & Docs (Parallel) (20.x)	UNKNOWN STEP	2025-11-08T21:09:44.0900531Z [0;31m⚠️  Some builds failed. Check logs above.[0m
Build Dashboard & Docs (Parallel) (20.x)	UNKNOWN STEP	2025-11-08T21:09:44.0988505Z ##[error]Process completed with exit code 1.
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198636801 --log

# Re-executar workflow
gh run rerun 19198636801

# Abrir no browser
gh run view 19198636801 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 120

**Run ID:** `19198636804`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:08:18Z
**URL:** [19198636804](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198636804)

#### 📋 Logs de Erro:

```
Lint & Type Check	UNKNOWN STEP	2025-11-08T21:08:59.1061493Z ✖ 4 problems (0 errors, 4 warnings)
Lint & Type Check	UNKNOWN STEP	2025-11-08T21:09:12.3679659Z Failed to save: Unable to reserve cache with key node-cache-Linux-x64-npm-b20a2d5a2e497c36a0aa00b309b76d7ca5f8c156a98c75dbff184d1b37a90e86, another job may be creating this cache.
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0864530Z .github/workflows/error-report-generator.yml:115:0 could not parse as YAML: yaml: line 115: could not find expected ':' [ syntax-check ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0872116Z .github/workflows/notify-on-failure.yml:21:17 context "secrets" is not allowed here. available contexts are "env", "github", "inputs", "job", "matrix", "needs", "runner", "steps", "strategy", "vars". see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details [ expression ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0880302Z .github/workflows/notify-on-failure.yml:21:47 context "secrets" is not allowed here. available contexts are "env", "github", "inputs", "job", "matrix", "needs", "runner", "steps", "strategy", "vars". see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details [ expression ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0888261Z .github/workflows/notify-on-failure.yml:46:17 context "secrets" is not allowed here. available contexts are "env", "github", "inputs", "job", "matrix", "needs", "runner", "steps", "strategy", "vars". see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details [ expression ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0896323Z .github/workflows/notify-on-failure.yml:65:17 context "secrets" is not allowed here. available contexts are "env", "github", "inputs", "job", "matrix", "needs", "runner", "steps", "strategy", "vars". see https://docs.github.com/en/actions/learn-github-actions/contexts#context-availability for more details [ expression ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0903279Z .github/workflows/pr-comment-on-failure.yml:51:0 could not parse as YAML: yaml: line 51: did not find expected alphabetic or numeric character [ syntax-check ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0904770Z   49 |             const body = `## ❌ Workflow Failed: ${workflowName}
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0905712Z > 51 | **Status:** Failed
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.0910460Z .github/workflows/pr-error-report.yml:72:654 "github.event.pull_request.head.ref" is potentially untrusted. avoid using it directly in inline scripts. instead, pass it through an environment variable. see https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions for more details [ expression ]
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.1181944Z ❌ actionlint reported issues (see /home/runner/work/TradingSystem/TradingSystem/outputs/reports/ci/actionlint-20251108-210832.log)
Workflow Lint	UNKNOWN STEP	2025-11-08T21:08:34.1286144Z ##[error]Process completed with exit code 1.
Security & Configuration Checks	UNKNOWN STEP	2025-11-08T21:08:43.6987797Z [36;1m  echo "❌ POLICY VIOLATION: Hardcoded localhost URLs detected!"[0m
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198636804 --log

# Re-executar workflow
gh run rerun 19198636804

# Abrir no browser
gh run view 19198636804 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


### 🔴 120

**Run ID:** `19198636793`
**Branch:** `main`
**Commit:** `505d7b6`
**Data:** 2025-11-08T21:08:18Z
**URL:** [19198636793](https://github.com/marceloterra1983/TradingSystem/actions/runs/19198636793)

#### 📋 Logs de Erro:

```
Validate Documentation Frontmatter	UNKNOWN STEP	2025-11-08T21:08:44.3559412Z [36;1m  echo "❌ Frontmatter validation failed!"[0m
Validate Documentation Frontmatter	UNKNOWN STEP	2025-11-08T21:08:44.3743504Z ❌ Frontmatter validation failed!
Validate Documentation Frontmatter	UNKNOWN STEP	2025-11-08T21:08:44.3756268Z ##[error]Process completed with exit code 1.
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:27.6743068Z [36;1mERROR_COUNT=0[0m
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:27.6746046Z [36;1m    echo "❌ Error: $file"[0m
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:27.6746327Z [36;1m    ERROR_COUNT=$((ERROR_COUNT + 1))[0m
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:27.6747260Z [36;1mif [ $ERROR_COUNT -gt 0 ]; then[0m
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:27.6747631Z [36;1m  echo "❌ $ERROR_COUNT/$DIAGRAM_COUNT diagrams have syntax errors"[0m
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:33.6992792Z Some diagram description contains errors
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:08:33.7185161Z ❌ Error: docs/content/diagrams/neon-internal-architecture.puml
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:09:02.2987714Z Some diagram description contains errors
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:09:02.3174029Z ❌ Error: docs/content/assets/diagrams/source/backend/idea-bank-component-architecture.puml
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:09:04.3889414Z Some diagram description contains errors
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:09:04.4078586Z ❌ Error: docs/content/assets/diagrams/source/frontend/customizable-layout-interaction-sequence.puml
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:09:05.0339075Z Some diagram description contains errors
Validate PlantUML Diagrams	UNKNOWN STEP	2025-11-08T21:09:05.0528111Z ❌ Error: docs/content/assets/diagrams/source/frontend/customizable-layout-component-architecture.puml
Validate Governance Snapshot	UNKNOWN STEP	2025-11-08T21:08:47.0802007Z [36;1m  echo "❌ Governance snapshot is out of sync!"[0m
Validate Governance Snapshot	UNKNOWN STEP	2025-11-08T21:08:47.0940185Z fatal: ambiguous argument 'governance/snapshots/governance-snapshot.json': unknown revision or path not in the working tree.
Validate Governance Snapshot	UNKNOWN STEP	2025-11-08T21:08:47.0942851Z ❌ Governance snapshot is out of sync!
Validate Governance Snapshot	UNKNOWN STEP	2025-11-08T21:08:47.0953547Z ##[error]Process completed with exit code 1.
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:45.5858904Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:46.9865124Z   ERROR: 18 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:47.2382800Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:47.7773213Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:48.2888904Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:48.7149995Z   ERROR: 6 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:48.9755354Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:49.3796452Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:51.7653060Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:53.1868535Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:54.2913665Z   ERROR: 5 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:54.5412938Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:55.1146314Z   ERROR: 5 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:55.3674164Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:56.3029535Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:56.3033325Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:56.3035452Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure → Status: 400
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:08:59.1065593Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:00.3176760Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:05.4371724Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:06.3822583Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:11.2948811Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:13.1505364Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:14.1019050Z   ERROR: 23 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:14.3512518Z   ERROR: 6 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:15.1471684Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:15.9661073Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:17.0524082Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:17.8297257Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:18.6734820Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:21.9393455Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:22.1724840Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:22.8162215Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:23.8267919Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:25.7715008Z   ERROR: 5 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:26.0134370Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:26.0135515Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:26.0140619Z   [✖] /governance/evidence/incidents/2025-11-05-tp-capital-connectivity-failure → Status: 400
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:26.4787924Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:26.7117989Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:29.2815447Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:31.7405048Z Checking: docs/content/sdd/events/v1/order-failed.mdx
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:31.9272546Z FILE: docs/content/sdd/events/v1/order-failed.mdx
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:31.9542288Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.1929111Z   ERROR: 5 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.4172215Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.6498698Z   [✖] ./order-failed
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.6504049Z   ERROR: 6 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.6506488Z   [✖] ./order-failed → Status: 400
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.8961356Z   [✖] ../../events/v1/order-failed
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.8965742Z   ERROR: 6 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:32.8969217Z   [✖] ../../events/v1/order-failed → Status: 400
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:33.1342448Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:33.6212671Z   ERROR: 7 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:33.8622055Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:34.0918391Z   ERROR: 6 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:34.9939455Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:35.6367549Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:35.9933619Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:36.7263855Z   ERROR: 5 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:37.3457181Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:37.5900314Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:37.8496258Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:42.9432463Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:43.4204635Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:44.5331979Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:45.5561673Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:46.6695954Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:46.9201516Z   ERROR: 20 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:47.1671051Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:50.4403899Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:51.7871895Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:52.9149425Z   ERROR: 4 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:53.1695597Z   ERROR: 25 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:54.1825918Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:56.0342438Z   ERROR: 2 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:56.9945846Z   ERROR: 3 dead links found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:57.9316131Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:58.1760120Z   ERROR: 1 dead link found!
Validate Markdown Links	UNKNOWN STEP	2025-11-08T21:09:58.4273943Z   ERROR: 17 dead links found!
```

#### 🔧 Comandos para Reproduzir Localmente:

```bash
# Ver logs completos
gh run view 19198636793 --log

# Re-executar workflow
gh run rerun 19198636793

# Abrir no browser
gh run view 19198636793 --web
```

#### 💡 Possíveis Soluções:

- Verificar logs completos acima
- Reproduzir erro localmente
- Consultar documentação: `.github/workflows/README.md`

---


## 📚 Recursos Úteis

- **Workflows README**: `.github/workflows/README.md`
- **Bundle Optimization**: `frontend/dashboard/BUNDLE-OPTIMIZATION.md`
- **Environment Guide**: `docs/content/tools/security-config/env.mdx`
- **Proxy Best Practices**: `docs/content/frontend/engineering/PROXY-BEST-PRACTICES.md`

## 🛠️ Scripts de Diagnóstico

```bash
# Monitorar workflows em tempo real
bash scripts/github/monitor-workflows.sh 30

# Ver status atual
bash scripts/github/check-workflows.sh status

# Listar apenas falhas
bash scripts/github/check-workflows.sh failures

# Download de artifacts
bash scripts/github/check-workflows.sh download <run-id>
```

## 🔄 Fluxo de Correção Recomendado

1. **Identificar** - Ler este relatório
2. **Reproduzir** - Executar comandos localmente
3. **Corrigir** - Aplicar soluções sugeridas
4. **Validar** - Rodar testes antes de commit
5. **Commit** - Fazer push das correções
6. **Verificar** - Acompanhar novo workflow

---

**Gerado por:** `scripts/github/collect-workflow-errors.sh`
**Próxima coleta:** Execute novamente o script para atualizar

