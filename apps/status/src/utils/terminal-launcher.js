/**
 * Cross-Platform Terminal Launcher
 * Launches services in new terminal windows on Windows, Linux and macOS
 */

const { spawn } = require('child_process');

/**
 * Launch service in Windows Terminal
 */
function launchWindowsTerminal(serviceName, workingDir, command) {
  const escapedCommand = command.replace(/'/g, "''");
  const psCommand = escapedCommand.startsWith('&') ? escapedCommand : `& ${escapedCommand}`;
  const innerCommand = `& { Set-Location -LiteralPath '${workingDir.replace(/'/g, "''")}'; $host.ui.RawUI.WindowTitle='${serviceName}'; ${psCommand} }`;

  const args = [
    '-w',
    '0',
    'new-tab',
    '--title',
    serviceName,
    '--startingDirectory',
    workingDir,
    'powershell.exe',
    '-NoExit',
    '-Command',
    innerCommand,
  ];

  const child = spawn('wt.exe', args, {
    windowsHide: false,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'windows-terminal', success: true };
}

/**
 * Launch service in PowerShell (Windows fallback)
 */
function launchPowerShell(serviceName, workingDir, command) {
  const escapedWorkingDir = workingDir.replace(/'/g, "''");
  const escapedCommand = command.replace(/'/g, "''");
  const psCommand = escapedCommand.startsWith('&') ? escapedCommand : `& ${escapedCommand}`;
  const innerCommand = `& { Set-Location -LiteralPath '${escapedWorkingDir}'; $host.ui.RawUI.WindowTitle='${serviceName}'; ${psCommand} }`;

  const args = ['/c', 'start', '""', 'powershell.exe', '-NoExit', '-Command', innerCommand];

  const child = spawn('cmd.exe', args, {
    cwd: workingDir,
    windowsHide: false,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'powershell', success: true };
}

/**
 * Launch service in gnome-terminal (Linux)
 */
function launchGnomeTerminal(serviceName, workingDir, command) {
  const args = [
    '--title', serviceName,
    '--working-directory', workingDir,
    '--',
    'bash',
    '-c',
    `${command}; echo ''; echo 'Press Enter to close...'; read`,
  ];

  const child = spawn('gnome-terminal', args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'gnome-terminal', success: true };
}

/**
 * Launch service in Konsole (Linux/KDE)
 */
function launchKonsole(serviceName, workingDir, command) {
  const args = [
    '--workdir', workingDir,
    '--hold',
    '-e',
    'bash',
    '-c',
    command,
  ];

  const child = spawn('konsole', args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'konsole', success: true };
}

/**
 * Launch service in xfce4-terminal (Linux/XFCE)
 */
function launchXfce4Terminal(serviceName, workingDir, command) {
  const args = [
    '--title', serviceName,
    '--working-directory', workingDir,
    '--hold',
    '-e',
    `bash -c "${command}"`,
  ];

  const child = spawn('xfce4-terminal', args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'xfce4-terminal', success: true };
}

/**
 * Launch service in generic X terminal (Linux fallback)
 */
function launchXterm(serviceName, workingDir, command) {
  const args = [
    '-T', serviceName,
    '-e',
    'bash',
    '-c',
    `cd "${workingDir}" && ${command}; echo ''; echo 'Press Enter to close...'; read`,
  ];

  const child = spawn('xterm', args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'xterm', success: true };
}

/**
 * Launch service in macOS Terminal.app
 */
function launchMacTerminal(serviceName, workingDir, command) {
  const script = `
tell application "Terminal"
  activate
  do script "cd '${workingDir}' && ${command}"
end tell
`;

  const args = ['-a', 'Terminal'];

  const child = spawn('open', args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  
  return { method: 'terminal-app', success: true };
}

/**
 * Launch service based on terminal type
 */
function launchByType(terminalType, serviceName, workingDir, command) {
  switch (terminalType) {
    case 'windows-terminal':
      return launchWindowsTerminal(serviceName, workingDir, command);
    case 'powershell':
      return launchPowerShell(serviceName, workingDir, command);
    case 'gnome-terminal':
      return launchGnomeTerminal(serviceName, workingDir, command);
    case 'konsole':
      return launchKonsole(serviceName, workingDir, command);
    case 'xfce4-terminal':
      return launchXfce4Terminal(serviceName, workingDir, command);
    case 'xterm':
      return launchXterm(serviceName, workingDir, command);
    case 'terminal-app':
      return launchMacTerminal(serviceName, workingDir, command);
    default:
      throw new Error(`Unsupported terminal type: ${terminalType}`);
  }
}

module.exports = {
  launchWindowsTerminal,
  launchPowerShell,
  launchGnomeTerminal,
  launchKonsole,
  launchXfce4Terminal,
  launchXterm,
  launchMacTerminal,
  launchByType,
};













