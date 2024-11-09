// src/dependencyAnalyzer.ts

import madge from 'madge';
import * as vscode from 'vscode';
import {
  getIncludedFileExtensionsNoDot,
  getWorkspaceRoot,
} from './utils';
import { DependencyGraph } from './types';
import logger from './logger';

/**
 * Generates a dependency graph for the project using Madge.
 * @returns The dependency graph as an object.
 */
export async function generateDependencyGraph(): Promise<DependencyGraph> {
  const rootDir = getWorkspaceRoot();
  logger.log(`Workspace root directory: ${rootDir}`);
  if (!rootDir) {
    vscode.window.showErrorMessage(
      'Cannot determine workspace root for dependency analysis.'
    );
    logger.log('Cannot determine workspace root for dependency analysis.');
    return {};
  }

  try {
    vscode.window.showInformationMessage('Analyzing project dependencies...');
    logger.log('Analyzing project dependencies...');
    const includedExtensions = getIncludedFileExtensionsNoDot();
    logger.log(
      `Using included file extensions for Madge: ${includedExtensions.join(
        ', '
      )}`
    );
    const result = await madge(rootDir, {
      fileExtensions: includedExtensions,
      excludeRegExp: [/node_modules/, /\.test\.[jt]s$/, /\.spec\.[jt]s$/],
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
