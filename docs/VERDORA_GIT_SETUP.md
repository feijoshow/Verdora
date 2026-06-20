# Verdora — Version Control Setup for the Test Round

Goal: always get back to exactly what testers used, and work on risky refinement without breaking `main`.

## One-time setup

```bash
git checkout main
git pull origin main

git checkout -b testing
git push -u origin testing
```

- **`main`** — ongoing development
- **`testing`** — build handed to testers (updated deliberately)
- **`refine/phase-*`** — short-lived phase branches

## Branch per phase

```bash
git checkout main
git checkout -b refine/phase-1-stability
# ... work, commit ...
git push -u origin refine/phase-1-stability

# When phase checklist is done and verified on device:
git checkout testing
git merge --no-ff refine/phase-1-stability -m "merge: phase 1 stability fixes"
git push origin testing
```

## Tag the tester build

```bash
git checkout testing
git tag -a v1.0.0-test1 -m "First tester round: June 2026"
git push origin v1.0.0-test1
```

## Commit message format

```
fix: cold-start no longer shows logged-in state with expired session
polish: unify loading copy on Scanner during Gemini analysis
```

Types: `fix`, `polish`, `chore`, `hotfix` — avoid `wip` / `updates`.

## Safety commands

```bash
git diff main...refine/phase-1-stability
git log --oneline refine/phase-1-stability
git checkout v1.0.0-test1
```

## Secrets check

```bash
git ls-files | grep -i "\.env$"
# should return nothing
```

Ensure `.env` and `frontend/.env` are in `.gitignore`. Rotate any keys that were ever committed.
