"use strict";
// src/utils.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExcludedFileExtensions = exports.getIncludedFileExtensions = exports.getApiKey = exports.getWorkspaceRoot = exports.getProjectFiles = exports.getProjectStructure = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Recursively retrieves the project structure, excluding specified directories.
 * @param dir The current directory path.
 * @param rootDir The root directory path for calculating relative paths.
 * @param excludeDirs An array of directory names to exclude.
 * @param currentDepth The current depth of recursion.
 * @param maxDepth The maximum depth to traverse.
 * @returns The project structure as a nested object.
 */
function getProjectStructure(dir, rootDir, excludeDirs = ['node_modules', '.git', '.vscode'], currentDepth = 0, maxDepth = 5) {
    if (currentDepth > maxDepth) {
        return {};
    }
    const relativePath = path.relative(rootDir, dir);
    const name = path.basename(dir);
    const type = fs.lstatSync(dir).isDirectory() ? 'folder' : 'file';
    if (type === 'folder' && excludeDirs.includes(name)) {
        return null;
    }
    const item = {
        path: relativePath === '' ? '.' : relativePath,
        name: name,
        type: type
    };
    if (type === 'folder') {
        const children = fs.readdirSync(dir)
            .map(child => getProjectStructure(path.join(dir, child), rootDir, excludeDirs, currentDepth + 1, maxDepth))
            .filter(child => child !== null);
        item.children = children;
    }
    return item;
}
exports.getProjectStructure = getProjectStructure;
/**
 * Retrieves all project files, excluding specified directories and applying include/exclude filters.
 * @param dir The current directory path.
 * @param rootDir The root directory path for calculating relative paths.
 * @param excludeDirs An array of directory names to exclude.
 * @param currentDepth The current depth of recursion.
 * @param maxDepth The maximum depth to traverse.
 * @returns An object mapping relative file paths to their contents.
 */
function getProjectFiles(dir, rootDir, excludeDirs = ['node_modules', '.git', '.vscode'], currentDepth = 0, maxDepth = 5) {
    const files = {};
    if (currentDepth > maxDepth) {
        return files;
    }
    let items;
    try {
        items = fs.readdirSync(dir);
    }
    catch (err) {
        vscode.window.showErrorMessage(`Failed to read directory: ${dir}`);
        console.error(`Failed to read directory: ${dir}`, err);
        return files;
    }
    const includedExtensions = getIncludedFileExtensions();
    const excludedExtensions = getExcludedFileExtensions();
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(rootDir, fullPath);
        let stat;
        try {
            stat = fs.lstatSync(fullPath);
        }
        catch (err) {
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
        }
        else if (type === 'file') {
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
            let content;
            try {
                content = fs.readFileSync(fullPath, 'utf-8');
            }
            catch (err) {
                vscode.window.showErrorMessage(`Failed to read file: ${fullPath}`);
                console.error(`Failed to read file: ${fullPath}`, err);
                continue;
            }
            files[relativePath] = content;
        }
    }
    return files;
}
exports.getProjectFiles = getProjectFiles;
/**
 * Retrieves the workspace root directory.
 * @returns The workspace root path.
 */
function getWorkspaceRoot() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder is open.');
        return '';
    }
    return workspaceFolders[0].uri.fsPath;
}
exports.getWorkspaceRoot = getWorkspaceRoot;
/**
 * Retrieves the API key from the extension settings.
 * @returns The OpenAI API key.
 */
function getApiKey() {
    const apiKey = vscode.workspace.getConfiguration('navicode').get('apiKey');
    if (!apiKey) {
        vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
    }
    return apiKey;
}
exports.getApiKey = getApiKey;
/**
 * Retrieves the list of file extensions to include from the extension settings.
 * @returns An array of included file extensions.
 */
function getIncludedFileExtensions() {
    const includes = vscode.workspace.getConfiguration('navicode').get('includeFileExtensions') || [];
    return includes.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
}
exports.getIncludedFileExtensions = getIncludedFileExtensions;
/**
 * Retrieves the list of file extensions to exclude from the extension settings.
 * @returns An array of excluded file extensions.
 */
function getExcludedFileExtensions() {
    const excludes = vscode.workspace.getConfiguration('navicode').get('excludeFileExtensions') || [];
    return excludes.map(ext => ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
}
exports.getExcludedFileExtensions = getExcludedFileExtensions;
//# sourceMappingURL=utils.js.map