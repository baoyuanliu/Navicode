// src/extension.ts

import * as vscode from 'vscode';
import { showWebview } from './webview';
import { preprocessEmbeddings } from './embeddingService';
import logger from './logger';

/**
 * Activates the Navicode extension.
 * @param context The extension context.
 */
export function activate(context: vscode.ExtensionContext) {
  logger.log('Ok. Activating Navicode extension.');

  const openPromptDisposable = vscode.commands.registerCommand(
    'navicode.openPrompt',
    () => {
      logger.log('Command "navicode.openPrompt" invoked.');
      showWebview(context);
    }
  );

  const preprocessEmbeddingsDisposable = vscode.commands.registerCommand(
    'navicode.preprocessEmbeddings',
    async () => {
      logger.log('Command "navicode.preprocessEmbeddings" invoked.');
      await preprocessEmbeddings();
      vscode.window.showInformationMessage('File embeddings have been preprocessed.');
      logger.log('File embeddings have been preprocessed.');
    }
  );

  context.subscriptions.push(openPromptDisposable);
  context.subscriptions.push(preprocessEmbeddingsDisposable);

  logger.log('Navicode extension activated successfully.');
}

/**
 * Deactivates the Navicode extension.
 */
export function deactivate() {
  logger.log('Deactivating Navicode extension.');
  // Perform any necessary cleanup here
}
