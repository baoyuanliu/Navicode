// src/utils.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyGraph } from './types';

/**
 * Recursively retrieves the project structure, excluding specified directories.
 * @param dir The current directory path.
 * @param rootDir The root directory path for calculating relative paths.
 * @param excludeDirs An array of directory names to exclude.
 * @param currentDepth The current depth of recursion.
 * @param maxDepth The maximum depth to traverse.
 * @returns The project structure as a nested object.
 */
export function getProjectStructure(
    dir: string,
    rootDir: string,
    excludeDirs: string[] = ['node_modules', '.git', '.vscode'],
    currentDepth: number = 0,
    maxDepth: number = 5
): any {
    if (currentDepth > maxDepth) {
        return {};
    }

    const relativePath = path.relative(rootDir, dir);
    const name = path.basename(dir);
    const type = fs.lstatSync(dir).isDirectory() ? 'folder' : 'file';

    if (type === 'folder' && excludeDirs.includes(name)) {
        return null;
    }

    const item: any = {
        path: relativePath === '' ? '.' : relativePath,
        name: name,
        type: type
    };

    if (type === 'folder') {
        const children = fs.readdirSync(dir)
            .map(child => getProjectStructure(
                path.join(dir, child),
                rootDir,
                excludeDirs,
                currentDepth + 1,
                maxDepth
            ))
            .filter(child => child !== null);
        item.children = children;
    }

    return item;
}

/**
 * Retrieves all project files, excluding specified directories and applying include/exclude filters.
 * @param dir The current directory path.
 * @param rootDir The root directory path for calculating relative paths.
 * @param excludeDirs An array of directory names to exclude.
 * @param currentDepth The current depth of recursion.
 * @param maxDepth The maximum depth to traverse.
 * @returns An object mapping relative file paths to their contents.
 */
export function getProjectFiles(
    dir: string,
    rootDir: string,
    excludeDirs: string[] = ['node_modules', '.git', '.vscode'],
    currentDepth: number = 0,
    maxDepth: number = 5
): { [key: string]: string } {
    const files: { [key: string]: string } = {};

    if (currentDepth > maxDepth) {
        return files;
    }

    let items: string[];
    try {
        items = fs.readdirSync(dir);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to read directory: ${dir}`);
        console.error(`Failed to read directory: ${dir}`, err);
        return files;
    }

    const includedExtensions = getIncludedFileExtensions();
    const excludedExtensions = getExcludedFileExtensions();

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(rootDir, fullPath);
        let stat: fs.Stats;
        try {
            stat = fs.lstatSync(fullPath);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to get stats for: ${fullPath}`);
            console.error(`Failed to get stats for: ${fullPath}`, err);
            continue;
        }
        const type = stat.isDirectory() ? 'folder' : 'file';

        if (type === 'folder') {
            if (excludeDirs.includes(item)) {
                continue;
            }
            Object.assign(files, getProjectFiles(fullPath, rootDir, excludeDirs, currentDepth + 1, maxDepth));
        } else if (type === 'file') {
            const ext = path.extname(item).toLowerCase();

            // Apply include/exclude filters
            if (includedExtensions.length > 0 && !includedExtensions.includes(ext)) {
                continue;
            }
            if (excludedExtensions.includes(ext)) {
                continue;
            }

            const binaryExtensions = ['.exe', '.dll', '.so', '.bin', '.jpg', '.png', '.gif', '.ico', '.svg'];
            if (binaryExtensions.includes(ext)) {
                continue;
            }
            let content: string;
            try {
                content = fs.readFileSync(fullPath, 'utf-8');
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to read file: ${fullPath}`);
                console.error(`Failed to read file: ${fullPath}`, err);
                continue;
            }
            files[relativePath] = content;
        }
    }

    return files;
}

/**
 * Retrieves the workspace root directory.
 * @returns The workspace root path.
 */
export function getWorkspaceRoot(): string {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return '';
    }
    return workspaceFolders[0].uri.fsPath;
}

/**
 * Retrieves the API key from the extension settings.
 * @returns The OpenAI API key.
 */
export function getApiKey(): string {
    const apiKey = vscode.workspace.getConfiguration('navicode').get('apiKey') as string;
    if (!apiKey) {
        vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
    }
    return apiKey;
}

/**
 * Retrieves the list of file extensions to include from the extension settings.
 * @returns An array of included file extensions.
 */
export function getIncludedFileExtensions(): string[] {
    const includes = vscode.workspace.getConfiguration('navicode').get<string[]>('includeFileExtensions') || [];
    return includes.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
}

/**
 * Retrieves the list of file extensions to exclude from the extension settings.
 * @returns An array of excluded file extensions.
 */
export function getExcludedFileExtensions(): string[] {
    const excludes = vscode.workspace.getConfiguration('navicode').get<string[]>('excludeFileExtensions') || [];
    return excludes.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
}
