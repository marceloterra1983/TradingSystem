/**
 * Terminal Detector Tests
 */

const terminalDetector = require('../src/utils/terminal-detector');
const os = require('os');

describe('Terminal Detector', () => {
  describe('isCommandAvailable', () => {
    it('should detect node as available', () => {
      const available = terminalDetector.isCommandAvailable('node');
      expect(available).toBe(true);
    });

    it('should detect non-existent command as unavailable', () => {
      const available = terminalDetector.isCommandAvailable('nonexistent-command-xyz-123');
      expect(available).toBe(false);
    });
  });

  describe('detectTerminal', () => {
    it('should detect a terminal on current platform', () => {
      const terminal = terminalDetector.detectTerminal();
      
      // Should return object or null
      if (terminal) {
        expect(terminal).toHaveProperty('platform');
        expect(terminal).toHaveProperty('type');
        expect(terminal).toHaveProperty('command');
        expect(typeof terminal.platform).toBe('string');
        expect(typeof terminal.type).toBe('string');
        expect(typeof terminal.command).toBe('string');
      } else {
        // On CI/headless systems, may not have GUI terminal
        expect(terminal).toBeNull();
      }
    });

    it('should match platform to OS', () => {
      const terminal = terminalDetector.detectTerminal();
      const platform = os.platform();
      
      if (terminal) {
        expect(terminal.platform).toBe(platform);
      }
    });
  });

  describe('getAllAvailableTerminals', () => {
    it('should return an array', () => {
      const terminals = terminalDetector.getAllAvailableTerminals();
      expect(Array.isArray(terminals)).toBe(true);
    });

    it('should return terminal objects with correct structure', () => {
      const terminals = terminalDetector.getAllAvailableTerminals();
      
      terminals.forEach((terminal) => {
        expect(terminal).toHaveProperty('type');
        expect(terminal).toHaveProperty('command');
        expect(typeof terminal.type).toBe('string');
        expect(typeof terminal.command).toBe('string');
      });
    });
  });

  describe('Platform-specific detection', () => {
    const platform = os.platform();

    if (platform === 'win32') {
      it('should detect Windows terminal', () => {
        const terminal = terminalDetector.detectWindowsTerminal();
        if (terminal) {
          expect(terminal.type).toMatch(/windows-terminal|powershell|cmd/);
        }
      });
    }

    if (platform === 'linux') {
      it('should detect Linux terminal', () => {
        const terminal = terminalDetector.detectLinuxTerminal();
        if (terminal) {
          expect(terminal.type).toMatch(/gnome-terminal|konsole|xfce4-terminal|terminator|tilix|xterm/);
        }
      });
    }

    if (platform === 'darwin') {
      it('should detect macOS terminal', () => {
        const terminal = terminalDetector.detectMacTerminal();
        if (terminal) {
          expect(terminal.type).toMatch(/terminal-app|iterm/);
        }
      });
    }
  });
});













