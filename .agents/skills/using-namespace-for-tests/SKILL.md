---
name: using-namespace-for-tests
description: Runs tests and commands on ephemeral Namespace devboxes via `devbox`, including hydrating workspaces, installing toolchains, and running multiple instances in parallel. Use when a sandboxed, isolated Linux environment is needed to run tests or commands, especially when several independent test runs should execute concurrently.
---

# Running tests and commands on ephemeral Namespace devboxes

Spin up one or more ephemeral Namespace devboxes to run tests or commands in isolation, optionally in parallel. Devboxes are `linux/amd64` VMs with Docker available.

Throughout this skill:

- **devbox** — an ephemeral Namespace machine, identified by its `name`.
- `<name>` — the devbox name passed to all `devbox` subcommands.

## Workflow

1. Create a devbox.
2. Check if the repo was checked out or auto-cloned.
3. Hydrate the workspace.
4. Install the dependencies.
5. Run commands over `devbox ssh`.
6. Destroy the devbox. 

## 1. Create a devbox

Pick a base image that already includes the project's toolchain (Go, Node, etc.) to avoid reinstalling dependencies on every run. Start by running `devbox image list -o json` to discover existing project images - if one fits, use it. Reserve custom images for complex workspace startup setups - if multiple tests will share the same environment or the suite runs frequently, build one with `devbox image build ./my-image --name=my-team/node`. For simpler cases, fall back to `builtin:base` and install dependencies directly.

**Important** When passing `--image`, use the image's short `name` field from `devbox image list -o json` (e.g. `<org>/<image>` or `builtin:base`), NOT the full `repository` URL. Passing a full `nscr.io/...` reference falls back to a deprecated path and typically fails with `MANIFEST_UNKNOWN`.

```bash
devbox create \
  --name <name> \
  --image <image> \
  --size <size> \
  --ephemeral \
  --checkout <repo-url> \
  --purpose "<purpose>"
```

`--checkout <repo-url>` (e.g. `git@github.com:org/repo.git`) clones the repository into `/workspaces/<repo-name>`. If creation fails because checkout is unavailable for the repo or org, prompt the user to either retry without `--checkout` using the tarball upload path, or pause so they can fix checkout configuration.

Sizes: `s` (4 vCPU / 8 GB), `m` (8 vCPU / 16 GB), `l` (16 vCPU / 32 GB), `xl` (32 vCPU / 64 GB). Use `s` only for narrow commands or small targeted tests; prefer `m` when the workload has large dependencies or builds multiple packages, to avoid OOM. If a process is killed with `signal: killed`, upgrade to a larger size and retry.

**Note** Devbox creation might fail due to Namespace plan limits on resource tiers or instance counts. If this happens: **PROMPT THE USER BEFORE PROCEEDING** run `devbox list` and expire any unneeded ephemeral devboxes to free capacity, then retry; As a last resort, consolidate work across fewer devboxes rather than blocking.

## 2. Hydrate the workspace and install toolchains

### Upload and download files

```bash
devbox upload <name> <local-path>  <remote-path> [--mkdir]
devbox download <name> <remote-path> <local-path>
```

- `<remote-path>` MUST be a full file path. A trailing `/` fails.
- `--mkdir` creates missing parent directories; it does NOT make the target a directory.
- The executable bit is NOT preserved. Run `chmod +x` over `devbox ssh` after uploading scripts.

### Hydrate the workspace

**Important** Namespace devboxes configured with a repo in the UI auto-clone it to `/workspaces/<repo-name>` on startup. Always check there first before uploading a tarball:

```bash
devbox ssh <name> -- ls /workspaces/
```

If the repo is already present, use that path directly and skip the upload steps below. The auto-cloned repo reflects the default branch configured in the Namespace UI.

If the repo is not present, upload a tarball. Use `/tmp` only as a staging location for small uploaded files such as scripts or tarballs: it may be a small tmpfs and Docker bind mounts from it may not be visible to the host Docker daemon bind mounts from it may not be visible to the host Docker daemon. Prefer `/workspaces/<repo-name>` when auto-cloned, or `/workspaces/src` for extracted tarballs.

**Important** Always exclude OS metadata files (._*, .DS_Store, Thumbs.db, desktop.ini) from tarballs.

**Important (macOS hosts)** BSD `tar` on macOS embeds xattrs/resource forks as `LIBARCHIVE.xattr.com.apple.*` PAX headers. GNU `tar` on Linux materializes those as AppleDouble `._*` companion files on extract, even when `--exclude='._*'` was passed at create time (because they don't exist as files yet). Always disable xattr capture at create time with `COPYFILE_DISABLE=1` AND `--no-xattrs`:

```bash
COPYFILE_DISABLE=1 tar --no-xattrs \
  --exclude=.git --exclude=node_modules \
  --exclude='._*' --exclude='.DS_Store' \
  -czf /tmp/repo.tgz -C <repo-root> .
devbox upload <name> /tmp/repo.tgz /tmp/repo.tgz
devbox ssh    <name> -- mkdir -p /workspaces/src
devbox ssh    <name> -- tar -xzf /tmp/repo.tgz -C /workspaces/src
```

After extract, verify no `._*` files leaked through: `devbox ssh <name> -- find /workspaces/src -name '._*' | head`.

**Important** If the project uses local `replace` / `use` directives (Go workspaces, multi-module monorepos, path-based dependencies), upload the whole workspace, not just the sub-tree under test.

### Install toolchains

Prefer a base image that already ships with the project's toolchain to avoid installing things on every run. If a toolchain-matched image isn't available, install only what the test needs.

**Important** Make sure to check the --version of each required tool, it might already exist.

**Note** `builtin:base` may provide languages like Go via an on-demand shim: the first invocation can trigger an automatic download. Try the command before manually installing - the shim may already handle it.

```bash
devbox ssh <name> -- apt-get update
devbox ssh <name> -- apt-get install -y --no-install-recommends \
    git ca-certificates curl tar build-essential
devbox ssh <name> -- curl -fsSL -o /tmp/go.tgz https://go.dev/dl/go<version>.linux-amd64.tar.gz
devbox ssh <name> -- tar -xzf /tmp/go.tgz -C /usr/local
```

## 3. Run commands over `devbox ssh`

```bash
devbox ssh <name> -- <cmd> <args...>
```

**Important** Run one command per `devbox ssh` invocation. Do NOT chain with `&&`, and do NOT wrap multiple statements with `devbox ssh <name> -- bash -c "a && b"` — argument quoting through `devbox ssh` is unreliable and the script body can be split across argv. For anything beyond a single command, write the script to a file, `devbox upload` it, then `devbox ssh <name> -- bash /tmp/script.sh`.

**Important** Run `devbox ssh` invocations against different devboxes in parallel. Do NOT serialize independent work.

**Important** Write all script output to a remote log file and return only a tiny summary by default.

```bash
cat > /tmp/run.sh <<'EOF'
#!/bin/bash
set -euo pipefail
export PATH=/usr/local/go/bin:$PATH
mkdir -p /workspaces/tmp
export TMPDIR=/workspaces/tmp
LOG=/workspaces/run.log

cd /workspaces/src
status=0
go test ./... >"$LOG" 2>&1 || status=$?

echo "exit=$status log=$LOG bytes=$(wc -c <"$LOG")"
exit "$status"
EOF
devbox upload <name> /tmp/run.sh /tmp/run.sh
devbox ssh    <name> -- chmod +x /tmp/run.sh
devbox ssh    <name> -- bash /tmp/run.sh

# Pull the full log only if the summary shows a non-zero exit.
devbox download <name> /workspaces/run.log /tmp/run.log
```

**Note** Capture the workload's exit code (`status=0; cmd || status=$?`) before printing the summary. Use `devbox download` only for devboxes whose summary reported a non-zero exit, unless specified otherwise.

**Note** When using a bare `.` as a test target, confirm the directory actually contains testable source files first — running a test runner against an empty or non-package directory typically exits non-zero.

## 4. Lifecycle

```bash
devbox list [-o json]
devbox expire <name> --force    # always tear down when done
```

**Important** On failure caused by missing dependencies, install them and retry the failing test. Do the same for any uploaded scripts. Always expire the devbox at the end of a task — including failure paths — unless the user asks to keep it.

## Quick reference: hydrate-and-test recipe

```bash
NAME=test-$(cat /dev/urandom | tr -dc 'a-z0-9' | head -c 8)

devbox create \
  --name "$NAME" \
  --image builtin:base \
  --size <size> \
  --ephemeral \ 
  --purpose "<purpose>"

# Check if the repo was auto-cloned by Namespace (configured repos land at /workspaces/<repo-name>)
devbox ssh "$NAME" -- ls /workspaces/

# IF repo directory is present, use /workspaces/<repo-name> as <repo_dir> below.
# ELSE (repo not present) — create and upload a tarball, use /workspaces/src as <repo_dir>:
tar --exclude=.git --exclude='._*' -czf /tmp/repo.tgz -C <repo> .
devbox upload "$NAME" /tmp/repo.tgz /tmp/repo.tgz
devbox ssh    "$NAME" -- mkdir -p <repo_dir>
devbox ssh    "$NAME" -- tar -xzf /tmp/repo.tgz -C <repo_dir>
# END IF

# Install toolchain if not found
devbox ssh "$NAME" -- curl -fsSL -o /tmp/go.tgz https://go.dev/dl/go<version>.linux-amd64.tar.gz
devbox ssh "$NAME" -- tar -xzf /tmp/go.tgz -C /usr/local

cat > /tmp/run.sh <<'EOF'
#!/bin/bash
set -euo pipefail
export PATH=/usr/local/go/bin:$PATH
mkdir -p /workspaces/tmp
export TMPDIR=/workspaces/tmp
LOG=/workspaces/run.log
cd <repo_dir>
status=0
go test ./... >"$LOG" 2>&1 || status=$?
echo "exit=$status log=$LOG bytes=$(wc -c <"$LOG")"
exit "$status"
EOF
devbox upload "$NAME" /tmp/run.sh /tmp/run.sh
devbox ssh    "$NAME" -- chmod +x /tmp/run.sh
devbox ssh    "$NAME" -- bash /tmp/run.sh

# Only download the full log if the summary above shows a non-zero exit.
# devbox download "$NAME" /workspaces/run.log /tmp/run.log

devbox expire "$NAME" --force
```

## After tests

After the final step, print a result summary as an ASCII table followed by a short comment.
