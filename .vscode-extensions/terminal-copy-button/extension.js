const vscode = require('vscode');

let statusBarItem;
let terminalDataListener;
let lastCommand = '';
let lastOutput = '';
let isCapturingCommand = true;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Terminal Copy Button extension is now active');

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'terminalCopyButton.copyLastOutput';
    statusBarItem.text = '$(copy) Copy Terminal';
    statusBarItem.tooltip = 'Copy last terminal command and output';
    statusBarItem.show();

    // Register command
    let disposable = vscode.commands.registerCommand(
        'terminalCopyButton.copyLastOutput',
        copyLastTerminalOutput
    );

    // Listen to terminal creation to attach data listeners
    vscode.window.onDidOpenTerminal(terminal => {
        attachTerminalListener(terminal);
    });

    // Attach to existing terminals
    vscode.window.terminals.forEach(terminal => {
        attachTerminalListener(terminal);
    });

    context.subscriptions.push(disposable);
    context.subscriptions.push(statusBarItem);
}

function attachTerminalListener(terminal) {
    // Try to get the terminal's write emitter if available
    // Note: This is a workaround since VSCode doesn't expose direct terminal output
    // We'll use a different approach: capture using terminal.sendText with echo

    // Store reference to active terminal
    vscode.window.onDidChangeActiveTerminal(activeTerminal => {
        if (activeTerminal) {
            console.log('Active terminal changed:', activeTerminal.name);
        }
    });
}

async function copyLastTerminalOutput() {
    const activeTerminal = vscode.window.activeTerminal;

    if (!activeTerminal) {
        vscode.window.showWarningMessage('No active terminal found');
        return;
    }

    try {
        // Method 1: Try to use terminal selection if available
        const editor = vscode.window.activeTextEditor;
        const selection = editor?.selection;

        // Method 2: Use a more reliable approach - execute a command to capture output
        // This requires the terminal to support command history

        // Show input box to let user paste or we auto-capture
        const result = await vscode.window.showInformationMessage(
            'Terminal output capture has limitations in VSCode API. Choose capture method:',
            'Capture Selection',
            'Capture Visible Area',
            'Manual Paste'
        );

        if (result === 'Capture Selection') {
            await captureSelection();
        } else if (result === 'Capture Visible Area') {
            await captureVisibleTerminal();
        } else if (result === 'Manual Paste') {
            await manualPasteCapture();
        }

    } catch (error) {
        vscode.window.showErrorMessage(`Error copying terminal output: ${error.message}`);
    }
}

async function captureSelection() {
    // Copy current selection to clipboard
    await vscode.commands.executeCommand('editor.action.clipboardCopyAction');

    const clipboardContent = await vscode.env.clipboard.readText();

    if (clipboardContent) {
        // Format as command + output
        const formatted = `# Terminal Output (Captured)\n\`\`\`bash\n${clipboardContent}\n\`\`\``;
        await vscode.env.clipboard.writeText(formatted);
        vscode.window.showInformationMessage('✓ Terminal output copied to clipboard');
    } else {
        vscode.window.showWarningMessage('No text selected in terminal');
    }
}

async function captureVisibleTerminal() {
    const activeTerminal = vscode.window.activeTerminal;

    // Execute a command that outputs the last commands
    // This uses bash/zsh history
    const captureCommand = `
# Capture last command and output
LAST_CMD=$(fc -ln -1 | sed 's/^[ \\t]*//')
echo "=== LAST COMMAND ==="
echo "$LAST_CMD"
echo ""
echo "=== OUTPUT ABOVE ==="
`;

    activeTerminal.sendText(captureCommand, true);

    vscode.window.showInformationMessage(
        '📋 Terminal history printed. Select the output and run "Capture Selection"',
        'Got it'
    );
}

async function manualPasteCapture() {
    const input = await vscode.window.showInputBox({
        prompt: 'Paste the terminal command and output here',
        placeHolder: 'command\noutput...',
        multiline: true,
        ignoreFocusOut: true
    });

    if (input) {
        const formatted = `# Terminal Output\n\`\`\`bash\n${input}\n\`\`\``;
        await vscode.env.clipboard.writeText(formatted);
        vscode.window.showInformationMessage('✓ Terminal output copied to clipboard');
    }
}

function deactivate() {
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};
