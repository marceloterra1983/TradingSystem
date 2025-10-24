/**
 * Terminal Detection Utility
 * Detects available terminal emulators on Windows and Linux
 */

const { execSync } = require('child_process');
const os = require('os');

/**
 * Detect if a command is available
 * @param {string} command
 * @returns {boolean}
 */
function isCommandAvailable(command) {
  try {
    const platform = os.platform();
    const checkCmd = platform === 'win32' ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { windowsHide: true, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect Windows terminal
 * @returns {{type: string, command: string}|null}
 */
function detectWindowsTerminal() {
  if (isCommandAvailable('wt.exe')) {
    return { type: 'windows-terminal', command: 'wt.exe' };
  }
  if (isCommandAvailable('powershell.exe')) {
    return { type: 'powershell', command: 'powershell.exe' };
  }
  if (isCommandAvailable('cmd.exe')) {
    return { type: 'cmd', command: 'cmd.exe' };
  }
  return null;
}

/**
 * Detect Linux terminal
 * @returns {{type: string, command: string}|null}
 */
function detectLinuxTerminal() {
  const terminals = [
    { type: 'gnome-terminal', command: 'gnome-terminal' },
    { type: 'konsole', command: 'konsole' },
    { type: 'xfce4-terminal', command: 'xfce4-terminal' },
    { type: 'terminator', command: 'terminator' },
    { type: 'tilix', command: 'tilix' },
    { type: 'xterm', command: 'xterm' },
  ];

  for (const terminal of terminals) {
    if (isCommandAvailable(terminal.command)) {
      return terminal;
    }
  }
  
  return null;
}

/**
 * Detect macOS terminal
 * @returns {{type: string, command: string}|null}
 */
function detectMacTerminal() {
  if (isCommandAvailable('open')) {
    return { type: 'terminal-app', command: 'open' };
  }
  if (isCommandAvailable('iTerm')) {
    return { type: 'iterm', command: 'open' };
  }
  return null;
}

/**
 * Detect best terminal for current platform
 * @returns {{platform: string, type: string, command: string}|null}
 */
function detectTerminal() {
  const platform = os.platform();

  switch (platform) {
    case 'win32':
      const winTerminal = detectWindowsTerminal();
      return winTerminal ? { platform, ...winTerminal } : null;

    case 'linux':
      const linuxTerminal = detectLinuxTerminal();
      return linuxTerminal ? { platform, ...linuxTerminal } : null;

    case 'darwin':
      const macTerminal = detectMacTerminal();
      return macTerminal ? { platform, ...macTerminal } : null;

    default:
      return null;
  }
}

/**
 * Get all available terminals on current platform
 * @returns {Array<{type: string, command: string}>}
 */
function getAllAvailableTerminals() {
  const platform = os.platform();
  const available = [];

  if (platform === 'win32') {
    if (isCommandAvailable('wt.exe')) {
      available.push({ type: 'windows-terminal', command: 'wt.exe' });
    }
    if (isCommandAvailable('powershell.exe')) {
      available.push({ type: 'powershell', command: 'powershell.exe' });
    }
    if (isCommandAvailable('cmd.exe')) {
      available.push({ type: 'cmd', command: 'cmd.exe' });
    }
  } else if (platform === 'linux') {
    const linuxTerminals = [
      'gnome-terminal',
      'konsole',
      'xfce4-terminal',
      'terminator',
      'tilix',
      'xterm',
    ];
    for (const term of linuxTerminals) {
      if (isCommandAvailable(term)) {
        available.push({ type: term, command: term });
      }
    }
  } else if (platform === 'darwin') {
    if (isCommandAvailable('open')) {
      available.push({ type: 'terminal-app', command: 'open' });
    }
  }

  return available;
}

module.exports = {
  detectTerminal,
  detectWindowsTerminal,
  detectLinuxTerminal,
  detectMacTerminal,
  getAllAvailableTerminals,
  isCommandAvailable,
};













