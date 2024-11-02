// src/historyService.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ChatHistoryEntry, SupportedModel } from './types';
import { getWorkspaceRoot } from './utils';
import logger from './logger';

/**
 * Manages chat history for the Navicode extension.
 */

const HISTORY_FILE_NAME = 'chat-history.json';
const MAX_HISTORY_ENTRIES = 10;

let history: ChatHistoryEntry[] = [];
let historyFilePath: string = '';

/**
 * Initializes the history service by loading existing history or creating a new history file.
 * @param context The extension context.
 */
export function initializeHistory(context: vscode.ExtensionContext): void {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
        logger.log('Workspace root not found. History will not be initialized.');
        return;
    }

    const navicodeDir = path.join(rootDir, '.navicode');
    if (!fs.existsSync(navicodeDir)) {
        fs.mkdirSync(navicodeDir, { recursive: true });
        logger.log(`Created directory for history: ${navicodeDir}`);
    }

    historyFilePath = path.join(navicodeDir, HISTORY_FILE_NAME);

    if (fs.existsSync(historyFilePath)) {
        try {
            const data = fs.readFileSync(historyFilePath, 'utf-8');
            history = JSON.parse(data) as ChatHistoryEntry[];
            logger.log(`Loaded existing chat history from ${historyFilePath}`);
        } catch (error: any) {
            vscode.window.showErrorMessage('Error loading chat history.');
            logger.log('--- Error Loading Chat History ---');
            logger.log(error.toString());
            history = [];
        }
    } else {
        history = [];
        saveHistory();
        logger.log('Initialized new chat history.');
    }
}

/**
 * Adds a new entry to the chat history and saves it.
 * @param entry The chat history entry to add.
 */
export function addChatHistory(entry: ChatHistoryEntry): void {
    history.unshift(entry);
    if (history.length > MAX_HISTORY_ENTRIES) {
        history.pop();
    }
    saveHistory();
}

/**
 * Retrieves the current chat history.
 * @returns An array of chat history entries.
 */
export function getChatHistory(): ChatHistoryEntry[] {
    return history;
}

/**
 * Saves the chat history to the history file.
 */
function saveHistory(): void {
    try {
        fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
        logger.log('Chat history saved successfully.');
    } catch (error: any) {
        vscode.window.showErrorMessage('Error saving chat history.');
        logger.log('--- Error Saving Chat History ---');
        logger.log(error.toString());
    }
}

/**
 * Clears the chat history.
 */
export function clearChatHistory(): void {
    history = [];
    saveHistory();
    logger.log('Chat history cleared.');
}
