// src/logger.ts

import * as vscode from 'vscode';

/**
 * Singleton Logger for Navicode Extension
 */
class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Navicode Logs');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public log(message: string): void {
        this.outputChannel.appendLine(message);
    }

    public logJSON(obj: any): void {
        this.outputChannel.appendLine(JSON.stringify(obj, null, 2));
    }

    public show(): void {
        this.outputChannel.show(true);
    }
}

const logger = Logger.getInstance();
export default logger;
