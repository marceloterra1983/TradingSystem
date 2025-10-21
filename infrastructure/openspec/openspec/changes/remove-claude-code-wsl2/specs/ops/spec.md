## ADDED Requirements
### Requirement: WSL2 environments must exclude Claude Code tooling
All WSL2 distributions used in the trading platform workflow MUST be purged of Claude Code binaries, packages, configuration, and integrations, and future provisioning scripts MUST block its reintroduction.

#### Scenario: WSL2 distro audit passes
- **GIVEN** an engineer audits any WSL2 distro on a workstation
- **WHEN** they check installed packages, PATH entries, and filesystem locations
- **THEN** no Claude Code binaries, libraries, or CLI wrappers SHALL be present

#### Scenario: Editor integrations sanitized
- **GIVEN** editors such as VS Code or Neovim are configured inside WSL2
- **WHEN** their extensions and settings are reviewed
- **THEN** no extension or plugin SHALL invoke Claude Code or expect its sockets/configuration

#### Scenario: Bootstrap prevents reinstall
- **GIVEN** we run bootstrap or provisioning scripts for WSL2 images
- **WHEN** the scripts finish
- **THEN** they SHALL omit installing Claude Code and SHALL document approved alternatives
