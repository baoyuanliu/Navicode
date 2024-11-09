// src/utils.ts

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DependencyGraph } from './types';
import logger from './logger';

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
        logger.log(`Max recursion depth reached at directory: ${dir}`);
        return {};
    }

    const relativePath = path.relative(rootDir, dir);
    const name = path.basename(dir);
    const type = fs.lstatSync(dir).isDirectory() ? 'folder' : 'file';

    if (type === 'folder' && excludeDirs.includes(name)) {
        logger.log(`Excluding directory: ${dir}`);
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
        logger.log(`Max recursion depth reached at directory: ${dir}`);
        return files;
    }

    let items: string[];
    try {
        items = fs.readdirSync(dir);
    } catch (err) {
        vscode.window.showErrorMessage(`Failed to read directory: ${dir}`);
        console.error(`Failed to read directory: ${dir}`, err);
        logger.log(`Failed to read directory: ${dir} - Error: ${String(err)}`);
        return files;
    }

    const includedExtensions = getIncludedFileExtensions();
    const excludedExtensions = getExcludedFileExtensions();
    logger.log(`Included file extensions: ${includedExtensions.join(', ')}`);
    logger.log(`Excluded file extensions: ${excludedExtensions.join(', ')}`);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(rootDir, fullPath);
        let stat: fs.Stats;
        try {
            stat = fs.lstatSync(fullPath);
        } catch (err) {
            vscode.window.showErrorMessage(`Failed to get stats for: ${fullPath}`);
            console.error(`Failed to get stats for: ${fullPath}`, err);
            logger.log(`Failed to get stats for: ${fullPath} - Error: ${String(err)}`);
            continue;
        }
        const type = stat.isDirectory() ? 'folder' : 'file';

        if (type === 'folder') {
            if (excludeDirs.includes(item)) {
                logger.log(`Excluding directory: ${fullPath}`);
                continue;
            }
            Object.assign(files, getProjectFiles(fullPath, rootDir, excludeDirs, currentDepth + 1, maxDepth));
        } else if (type === 'file') {
            const ext = path.extname(item).toLowerCase();
            logger.log(`Processing file: ${relativePath} with extension: ${ext}`);

            // Apply include/exclude filters
            if (includedExtensions.length > 0 && !includedExtensions.includes(ext)) {
                logger.log(`Excluding file due to include filter: ${relativePath}`);
                continue;
            }
            if (excludedExtensions.includes(ext)) {
                logger.log(`Excluding file due to exclude filter: ${relativePath}`);
                continue;
            }

            const binaryExtensions = ['.exe', '.dll', '.so', '.bin', '.jpg', '.png', '.gif', '.ico', '.svg'];
            if (binaryExtensions.includes(ext)) {
                logger.log(`Excluding binary file: ${relativePath}`);
                continue;
            }
            let content: string;
            try {
                content = fs.readFileSync(fullPath, 'utf-8');
            } catch (err) {
                vscode.window.showErrorMessage(`Failed to read file: ${fullPath}`);
                console.error(`Failed to read file: ${fullPath}`, err);
                logger.log(`Failed to read file: ${fullPath} - Error: ${String(err)}`);
                continue;
            }
            files[relativePath] = content;
            logger.log(`Added file for embedding: ${relativePath}`);
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
        logger.log('No workspace folder is open.');
        return '';
    }
    const rootPath = workspaceFolders[0].uri.fsPath;
    logger.log(`Workspace root path retrieved: ${rootPath}`);
    return rootPath;
}

/**
 * Retrieves the API key from the extension settings.
 * @returns The OpenAI API key.
 */
export function getApiKey(): string {
    const apiKey = vscode.workspace.getConfiguration('navicode').get('apiKey') as string;
    if (!apiKey) {
        vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
        logger.log('GPT API key is not set in the settings.');
    } else {
        logger.log('GPT API key retrieved from settings.');
    }
    return apiKey;
}

/**
 * Retrieves the list of file extensions to include from the extension settings.
 * @returns An array of included file extensions.
 */
export function getIncludedFileExtensions(): string[] {
    const includes = vscode.workspace.getConfiguration('navicode').get<string[]>('includeFileExtensions') || [];
    const formattedIncludes = includes.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
    logger.log(`Formatted included file extensions: ${formattedIncludes.join(', ')}`);
    return formattedIncludes;
}

/**
 * Retrieves the list of file extensions to include from the extension settings, without leading dots.
 * @returns An array of included file extensions without dots.
 */
export function getIncludedFileExtensionsNoDot(): string[] {
    const includes = vscode.workspace.getConfiguration('navicode').get<string[]>('includeFileExtensions') || [];
    const formattedIncludes = includes.map(ext => ext.startsWith('.') ? ext.substring(1).toLowerCase() : ext.toLowerCase());
    logger.log(`Formatted included file extensions (no dot): ${formattedIncludes.join(', ')}`);
    return formattedIncludes;
}

/**
 * Retrieves the list of file extensions to exclude from the extension settings.
 * @returns An array of excluded file extensions.
 */
export function getExcludedFileExtensions(): string[] {
    const excludes = vscode.workspace.getConfiguration('navicode').get<string[]>('excludeFileExtensions') || [];
    const formattedExcludes = excludes.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
    logger.log(`Formatted excluded file extensions: ${formattedExcludes.join(', ')}`);
    return formattedExcludes;
}

/**
 * Retrieves the list of file extensions to exclude from the extension settings, without leading dots.
 * @returns An array of excluded file extensions without dots.
 */
export function getExcludedFileExtensionsNoDot(): string[] {
    const excludes = vscode.workspace.getConfiguration('navicode').get<string[]>('excludeFileExtensions') || [];
    const formattedExcludes = excludes.map(ext => ext.startsWith('.') ? ext.substring(1).toLowerCase() : ext.toLowerCase());
    logger.log(`Formatted excluded file extensions (no dot): ${formattedExcludes.join(', ')}`);
    return formattedExcludes;
}
