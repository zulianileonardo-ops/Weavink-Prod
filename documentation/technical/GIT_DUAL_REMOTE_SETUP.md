---
id: technical-git-dual-remote-setup-049
title: Dual GitHub + GitLab Repository Setup
category: technical
tags: [git, github, gitlab, repository, deployment, version-control, multi-remote, infrastructure, setup]
status: active
created: 2025-11-21
updated: 2025-11-21
related:
  - git-manager-skill
---

# Dual GitHub + GitLab Repository Setup

## Overview

**Purpose**: Configure Weavink repository to automatically push to both GitHub and GitLab

**Scope**: Repository configuration, remote setup, authentication, troubleshooting

**Target Audience**: Developers setting up new environments, team members onboarding

**Status**: Active (deployed 2025-11-21)

### Why Dual Remotes?

**Business Requirements**:
- **GitHub**: Public collaboration, CI/CD, community engagement
- **GitLab**: Enterprise backup, internal workflows, alternative deployment

**Benefits**:
- ✅ Automatic synchronization across platforms
- ✅ Redundancy (no single point of failure)
- ✅ Flexibility in deployment options
- ✅ No manual syncing required

---

## Current Configuration

### Configured Remotes

```bash
origin (fetch/push): https://github.com/Leo910032/temp2.git
Weavink (fetch/push): git@gitlab.com:website9841615/weavink.git
```

**Repository Details**:
- **Primary Remote**: `origin` (GitHub)
- **Secondary Remote**: `Weavink` (GitLab)
- **Authentication**: HTTPS for GitHub, SSH for GitLab

---

## Initial Setup

### Prerequisites

- Git installed (2.x or higher)
- SSH key configured for GitLab
- GitHub account with repository access
- GitLab account with repository access

### Step 1: Clone Repository

```bash
# Clone from GitHub (primary)
git clone https://github.com/Leo910032/temp2.git
cd temp2
```

### Step 2: Add GitLab Remote

```bash
# Add GitLab as secondary remote
git remote add Weavink git@gitlab.com:website9841615/weavink.git

# Verify remotes
git remote -v
```

**Expected Output**:
```
origin    https://github.com/Leo910032/temp2.git (fetch)
origin    https://github.com/Leo910032/temp2.git (push)
Weavink   git@gitlab.com:website9841615/weavink.git (fetch)
Weavink   git@gitlab.com:website9841615/weavink.git (push)
```

### Step 3: Configure SSH for GitLab

```bash
# Test GitLab SSH connection
ssh -T git@gitlab.com

# Expected: "Welcome to GitLab, @username!"
```

**If SSH fails**, see [SSH Setup](#ssh-key-setup) below.

### Step 4: Sync Existing Commits to GitLab

```bash
# Push all branches to GitLab
git push Weavink --all

# Push all tags (if any)
git push Weavink --tags
```

---

## Usage Patterns

### Manual Push to Both Remotes

```bash
# Get current branch
current_branch=$(git branch --show-current)

# Push to GitHub
git push origin $current_branch

# Push to GitLab
git push Weavink $current_branch
```

### Automated Push (git-manager-skill)

The git-manager-skill automatically pushes to both remotes:

```bash
# Single command pushes to ALL remotes
for remote in $(git remote); do
  git push $remote $(git branch --show-current)
done
```

See: `.claude/skills/git-manager-skill/SKILL.md` for workflow details

---

## Authentication Setup

### GitHub Authentication (HTTPS)

**Method**: Personal Access Token (PAT)

1. Generate token: https://github.com/settings/tokens
2. Required scopes: `repo`, `workflow`
3. Cache credentials:
   ```bash
   git config --global credential.helper cache
   git config --global credential.helper 'cache --timeout=3600'
   ```

### GitLab Authentication (SSH)

#### SSH Key Setup

1. **Generate SSH Key** (if not exists):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Save to: ~/.ssh/id_ed25519
   ```

2. **Add to SSH Agent**:
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   ```

3. **Copy Public Key**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   # Copy output
   ```

4. **Add to GitLab**:
   - Go to: https://gitlab.com/-/profile/keys
   - Paste public key
   - Save

5. **Test Connection**:
   ```bash
   ssh -T git@gitlab.com
   # Expected: "Welcome to GitLab, @username!"
   ```

#### SSH Known Hosts Setup

If you encounter "Host key verification failed":

```bash
# Remove old GitLab key (if exists)
ssh-keygen -f ~/.ssh/known_hosts -R "gitlab.com"

# Add current GitLab host keys
ssh-keyscan -H gitlab.com >> ~/.ssh/known_hosts
```

---

## Troubleshooting

### Issue 1: GitLab SSO/SAML Message

**Symptom**: GitLab web interface shows:
```
Your account is authenticated with SSO or SAML. To push and pull over HTTPS with Git using this account, you must set a password or set up a personal access token to use instead of a password.
```

**Solution**: **You can safely ignore this message!**

This warning only applies to HTTPS authentication. Since you're using SSH (`git@gitlab.com`), it doesn't affect you.

**Verification**:
```bash
# Check your remote URL
git remote -v

# If you see "git@gitlab.com", you're using SSH ✅
# If you see "https://gitlab.com", you need to switch to SSH or set up PAT
```

### Issue 2: Push Fails to GitLab (Permission Denied)

**Symptom**:
```
Permission denied (publickey)
fatal: Could not read from remote repository
```

**Solution**:
1. Verify SSH key is added to GitLab account
2. Test SSH connection: `ssh -T git@gitlab.com`
3. Check SSH agent: `ssh-add -l`
4. Re-add key: `ssh-add ~/.ssh/id_ed25519`

### Issue 3: Push Fails to GitHub (Authentication)

**Symptom**:
```
remote: Support for password authentication was removed
fatal: Authentication failed
```

**Solution**:
1. Use Personal Access Token (not password)
2. Update remote URL:
   ```bash
   git remote set-url origin https://<token>@github.com/Leo910032/temp2.git
   ```
3. Or use SSH: `git remote set-url origin git@github.com:Leo910032/temp2.git`

### Issue 4: Host Key Verification Failed

**Symptom**:
```
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
```

**Solution**:
```bash
# Remove old host key
ssh-keygen -f ~/.ssh/known_hosts -R "gitlab.com"

# Add current host keys
ssh-keyscan -H gitlab.com >> ~/.ssh/known_hosts

# Try again
git push Weavink main
```

### Issue 5: Remotes Out of Sync

**Symptom**: One remote has commits the other doesn't

**Solution**:
```bash
# Check status of each remote
git log origin/main..HEAD --oneline
git log Weavink/main..HEAD --oneline

# Push missing commits to specific remote
git push origin main
git push Weavink main
```

### Issue 6: Different Branch Names

**Symptom**: GitHub uses `main`, GitLab uses `master`

**Solution**:
```bash
# Standardize on 'main'
git branch -m master main
git push -u origin main
git push -u Weavink main

# Delete old master branch (optional)
git push origin :master
git push Weavink :master
```

---

## Verification Checklist

After setup, verify:

- [ ] `git remote -v` shows both remotes
- [ ] SSH connection to GitLab works: `ssh -T git@gitlab.com`
- [ ] Can push to GitHub: `git push origin <branch>`
- [ ] Can push to GitLab: `git push Weavink <branch>`
- [ ] git-manager-skill works (if using skills)
- [ ] Both remotes show same commits: `git log origin/main` vs `git log Weavink/main`
- [ ] Branch tracking is set up: `git branch -vv`

---

## Best Practices

1. **Always Push to Both** - Use git-manager-skill or script to avoid divergence
2. **Verify After Push** - Check both platforms to confirm sync
3. **Use SSH for GitLab** - More reliable than HTTPS for private repos with SSO
4. **Keep Credentials Cached** - Configure credential helper for GitHub
5. **Document Changes** - Update this guide if remote URLs change
6. **Test Before Push** - Run builds and tests locally first
7. **Monitor Both Platforms** - Set up notifications for both GitHub and GitLab

---

## Integration with Skills

### git-manager-skill

The git-manager-skill automatically handles dual-remote pushes:
- Single confirmation prompt for both remotes
- Automatic error handling per remote
- Status checks across all remotes

See: `.claude/skills/git-manager-skill/SKILL.md` (lines 21-55, 199-276)

### build-manager-skill

Build process is independent of git remotes (builds from local).

### docs-manager-skill

Documentation is committed locally, then pushed to both remotes via git-manager.

---

## Security Considerations

1. **SSH Keys**: Never commit private keys (`.ssh/id_ed25519`)
2. **GitHub Tokens**: Never commit PATs to repository
3. **Environment Variables**: Use `.env.local` for tokens, add to `.gitignore`
4. **GitLab Access**: Restrict repository access to team members only
5. **Branch Protection**: Enable on both platforms to prevent force pushes
6. **Regular Audits**: Verify SSH keys and tokens periodically
7. **Revoke Old Credentials**: Remove SSH keys from unused machines

---

## Advanced Configuration

### Push to All Remotes with Alias

Add to `~/.gitconfig`:

```bash
[alias]
    pushall = "!f() { for remote in $(git remote); do git push $remote \"$@\"; done; }; f"
```

Usage:
```bash
git pushall main
# Pushes main branch to all configured remotes
```

### Auto-track All Remotes

```bash
# Set up branch to track both remotes
git branch --set-upstream-to=origin/main main

# Push to all remotes with single command
git config --global push.default current
```

---

## References

- [GitHub: Managing Remotes](https://docs.github.com/en/get-started/getting-started-with-git/managing-remote-repositories)
- [GitLab: SSH Keys](https://docs.gitlab.com/ee/user/ssh.html)
- [GitLab: SSO/SAML Authentication](https://docs.gitlab.com/ee/user/group/saml_sso/)
- [Git Documentation: Working with Remotes](https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes)

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-11-21 | Initial setup documentation | docs-manager-skill |
| 2025-11-21 | Added troubleshooting section | docs-manager-skill |
| 2025-11-21 | Added GitLab SSO message explanation | docs-manager-skill |

---

*This guide documents the dual GitHub + GitLab repository configuration for Weavink, enabling automatic synchronization across both platforms.*
