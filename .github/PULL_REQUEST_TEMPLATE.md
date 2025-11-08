# Pull Request

## 📋 Description

### Summary
<!-- Provide a brief summary of your changes -->

### Motivation
<!-- Why is this change necessary? What problem does it solve? -->

### Related Issues
<!-- Link to related issues: Fixes #123, Relates to #456 -->

---

## 🔄 Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Code refactoring (no functional changes)
- [ ] 🔧 Configuration change
- [ ] 🏗️ Infrastructure change (Docker, CI/CD, scripts)
- [ ] 🧪 Test coverage improvement

---

## 🔐 Security & Configuration

**⚠️ CRITICAL: Hardcoded URLs Prevention Policy**

- [ ] ✅ **No hardcoded URLs** - All URLs use environment variables (`.env` or `.env.defaults`)
- [ ] ✅ **ESLint passes** - No hardcoded URL warnings (run `npm run lint` or `npm run lint:all`)
- [ ] ✅ **Port registry updated** - New services added to `config/ports/registry.yaml`
- [ ] ✅ **Environment variables documented** - Added to `config/.env.defaults` with comments
- [ ] ✅ **Pre-commit hook passes** - `npm run ports:scan-hardcoded` successful

**📖 Policy**: [Hardcoded URLs Prevention Policy](../governance/controls/hardcoded-urls-prevention-policy.md)

**✅ Validation Commands**:
```bash
# Scan for hardcoded URLs
npm run ports:scan-hardcoded

# Validate port registry
npm run ports:validate

# Run ESLint
npm run lint:all  # All projects
```

---

## 🧪 Testing Checklist

### Code Quality
- [ ] Code follows project style guidelines (ESLint, Prettier)
- [ ] Self-review of my own code completed
- [ ] Comments added for complex logic
- [ ] No compiler warnings or errors

### Testing
- [ ] New tests added for new features/fixes
- [ ] All existing tests pass
- [ ] Test coverage maintained or improved

### Integration
- [ ] Changes work in local development environment
- [ ] Changes tested with Docker containers (if applicable)
- [ ] Database migrations tested (if applicable)
- [ ] API endpoints tested (if applicable)

---

## 📚 Documentation

- [ ] Code changes documented in comments/JSDoc
- [ ] README.md updated (if applicable)
- [ ] Documentation updated in `/docs` (if applicable)
- [ ] API specs updated (OpenAPI/Swagger) (if applicable)
- [ ] Architecture Decision Record (ADR) created (for significant changes)

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] `.env.defaults` updated with new variables
- [ ] Docker Compose files updated (if applicable)
- [ ] Migration scripts created/tested (if applicable)
- [ ] Rollback plan documented (for breaking changes)

### Post-deployment
- [ ] Health checks pass (`bash scripts/maintenance/health-check-all.sh`)
- [ ] Service dependencies verified
- [ ] Logs checked for errors
- [ ] Metrics/monitoring verified (if applicable)

---

## ⚠️ Breaking Changes

<!-- If this is a breaking change, describe what breaks and the migration path -->

**Does this PR introduce breaking changes?**
- [ ] Yes (fill out section below)
- [ ] No

**If yes, describe the changes and migration path:**

```
<!-- Example:
- Changed API endpoint from /api/v1/users to /api/v2/users
- Migration: Update all client code to use new endpoint
- Backward compatibility: Old endpoint will be deprecated in v2.0, removed in v3.0
-->
```

---

## 📸 Screenshots / Videos

<!-- If applicable, add screenshots or videos to help explain your changes -->

---

## 🔗 Additional Context

<!-- Add any other context about the pull request here -->

### Dependencies
<!-- List any dependencies this PR has (other PRs, external services, etc.) -->

### Performance Impact
<!-- Describe any performance implications of this change -->

### Security Considerations
<!-- Describe any security implications of this change -->

---

## 👀 Review Focus Areas

<!-- Guide reviewers on what to focus on -->

- [ ] Please review security/configuration changes carefully
- [ ] Please verify test coverage is adequate
- [ ] Please check for performance implications
- [ ] Please validate documentation accuracy

---

## ✅ Final Checklist (before requesting review)

- [ ] PR title follows [Conventional Commits](https://www.conventionalcommits.org/) format (e.g., `feat:`, `fix:`, `chore:`)
- [ ] All CI checks pass
- [ ] Branch is up-to-date with target branch
- [ ] No merge conflicts
- [ ] All conversations from previous reviews resolved
- [ ] Commits are clean and well-organized (consider squashing if needed)

---

**Policy Compliance**: This PR follows [TradingSystem Governance Standards](../governance/README.md)

