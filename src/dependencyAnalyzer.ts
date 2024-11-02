// src/dependencyAnalyzer.ts

import madge from 'madge';
import * as vscode from 'vscode';
import { getWorkspaceRoot, getIncludedFileExtensions } from './utils'; // Added import for getIncludedFileExtensions
import { DependencyGraph } from './types';
import logger from './logger';

/**
 * Generates a dependency graph for the project using Madge.
 * @returns The dependency graph as an object.
 */
export async function generateDependencyGraph(): Promise<DependencyGraph> {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
        vscode.window.showErrorMessage('Cannot determine workspace root for dependency analysis.');
        logger.log('Cannot determine workspace root for dependency analysis.');
        return {};
    }

    try {
        vscode.window.showInformationMessage('Analyzing project dependencies...');
        logger.log('Analyzing project dependencies...');
        const result = await madge(rootDir, {
            fileExtensions: getIncludedFileExtensions(),
            excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./],
        });
        const dependencyGraph = result.obj();
        logger.log('Dependency Graph:');
        logger.logJSON(dependencyGraph);
        vscode.window.showInformationMessage('Dependency analysis completed.');
        return dependencyGraph;
    } catch (error: any) {
        vscode.window.showErrorMessage('Error generating dependency graph.');
        console.error('Dependency Analysis Error:', error);
        logger.log('--- Dependency Analysis Error ---');
        logger.log(error.toString());
        return {};
    }
}
