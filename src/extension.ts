// src/extension.ts

import * as vscode from 'vscode';
import { showWebview } from './webview';
import { preprocessEmbeddings } from './embeddingService';

/**
 * Activates the Navicode extension.
 * @param context The extension context.
 */
export function activate(context: vscode.ExtensionContext) {
    let openPromptDisposable = vscode.commands.registerCommand('navicode.openPrompt', () => {
        showWebview(context);
    });

    let preprocessEmbeddingsDisposable = vscode.commands.registerCommand('navicode.preprocessEmbeddings', async () => {
        await preprocessEmbeddings();
        vscode.window.showInformationMessage('File embeddings have been preprocessed.');
    });

    context.subscriptions.push(openPromptDisposable);
    context.subscriptions.push(preprocessEmbeddingsDisposable);
}

/**
 * Deactivates the Navicode extension.
 */
export function deactivate() {}
