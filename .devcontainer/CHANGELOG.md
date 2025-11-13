# DevContainer Changelog

## [2.0.0] - 2025-11-13

### Major Changes
- Complete rewrite of setup process
- Automated setup script
- Fixed all permission issues
- Removed redundant Python venv

### Added
- `setup-devcontainer-perfect.sh` - One-command setup
- `.env.devcontainer` - Stack configuration
- `STACKS.md` - Stack documentation
- Intelligent multi-stack auto-start

### Changed
- npm ci → npm install (more flexible)
- Named volumes → Bind mounts (better permissions)
- Python venv → Global pip (simpler)
- Dashboard port: 3103 → 8090

### Fixed
- EACCES permission errors
- typedoc/typescript conflicts with --legacy-peer-deps
- Incorrect port documentation
- Python venv activation failures

### Testing
- ✅ 2812 npm packages
- ✅ Python with pandas/numpy/requests
- ✅ 13 Docker containers
- ✅ All services accessible
