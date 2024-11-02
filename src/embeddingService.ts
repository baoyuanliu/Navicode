// src/embeddingService.ts

import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot, getApiKey, getProjectFiles, getProjectStructure, getIncludedFileExtensions, getExcludedFileExtensions } from './utils';
import { FileEmbeddings } from './types';
import logger from './logger';

/**
 * Generates an embedding for the given text using OpenAI's Embedding API.
 * @param text The input text to embed.
 * @returns The embedding vector as an array of numbers.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = getApiKey();
    if (!apiKey) {
        logger.log('GPT API key is missing.');
        return [];
    }

    try {
        vscode.window.showInformationMessage('Generating embedding...');
        logger.log('Generating embedding...');
        const response = await axios.post('https://api.openai.com/v1/embeddings', {
            model: "text-embedding-3-large",
            input: text
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
            // Ensure that the embedding is of type number[]
            const embedding = response.data.data[0].embedding;
            if (Array.isArray(embedding) && embedding.every((num: any) => typeof num === 'number')) {
                vscode.window.showInformationMessage('Embedding generated successfully.');
                logger.log('Embedding generated successfully.');
                return embedding as number[];
            } else {
                vscode.window.showErrorMessage('Invalid embedding format received from Embedding API.');
                console.error('Invalid embedding format:', embedding);
                logger.log('Invalid embedding format received from Embedding API.');
                return [];
            }
        } else {
            vscode.window.showErrorMessage('Invalid response from Embedding API.');
            console.error('Invalid response:', response.data);
            logger.log('Invalid response from Embedding API.');
            return [];
        }
    } catch (error: any) {
        // Log the error details
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<{ error: { message: string; type: string; param?: string; code?: string } }>;
            vscode.window.showErrorMessage('Error generating embedding.');
            logger.log('--- Embedding API Error ---');
            if (axiosError.response) {
                logger.logJSON(axiosError.response.data);
                const errorMessage = axiosError.response.data?.error?.message || 'Unknown error';
                vscode.window.showErrorMessage('Error generating embedding: ' + errorMessage);
            } else if (axiosError.request) {
                logger.log('No response received from Embedding API.');
                vscode.window.showErrorMessage('No response received from Embedding API. Please check your network connection.');
            } else {
                logger.log('Error setting up the request.');
                vscode.window.showErrorMessage('Error setting up the Embedding API request: ' + axiosError.message);
            }
        } else {
            vscode.window.showErrorMessage('An unexpected error occurred while generating embedding.');
            logger.log('--- Unexpected Error ---');
            logger.log(error.toString());
        }
        return [];
    }
}

/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity as a number between -1 and 1.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Saves file embeddings to a JSON file.
 * @param embeddings The file embeddings to save.
 */
export function saveFileEmbeddings(embeddings: FileEmbeddings): void {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
        logger.log('Cannot determine workspace root for saving embeddings.');
        return;
    }

    const navicodeDir = path.join(rootDir, '.navicode');
    const embeddingsPath = path.join(navicodeDir, 'file-embeddings.json');

    try {
        if (!fs.existsSync(navicodeDir)) {
            fs.mkdirSync(navicodeDir, { recursive: true });
            vscode.window.showInformationMessage(`Created directory: ${navicodeDir}`);
            logger.log(`Created directory: ${navicodeDir}`);
        }
        fs.writeFileSync(embeddingsPath, JSON.stringify(embeddings, null, 2), 'utf-8');
        vscode.window.showInformationMessage('File embeddings have been saved successfully.');
        logger.log('File embeddings have been saved successfully.');
        console.log(`File embeddings saved to ${embeddingsPath}`);
    } catch (error: any) {
        vscode.window.showErrorMessage('Error saving file embeddings.');
        console.error('Error saving embeddings:', error);
        logger.log('--- Error Saving Embeddings ---');
        logger.log(error.toString());
    }
}

/**
 * Loads file embeddings from the JSON file.
 * @returns The loaded file embeddings.
 */
export function loadFileEmbeddings(): FileEmbeddings {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
        logger.log('Cannot determine workspace root for loading embeddings.');
        return {};
    }

    const embeddingsPath = path.join(rootDir, '.navicode', 'file-embeddings.json');

    try {
        if (!fs.existsSync(embeddingsPath)) {
            logger.log(`Embeddings file not found at ${embeddingsPath}`);
            vscode.window.showInformationMessage(`Embeddings file not found at ${embeddingsPath}. Please run the preprocessing command.`);
            return {};
        }
        const data = fs.readFileSync(embeddingsPath, 'utf-8');
        const embeddings: FileEmbeddings = JSON.parse(data);
        logger.log(`Loaded embeddings from ${embeddingsPath}`);
        logger.logJSON(embeddings);
        return embeddings;
    } catch (error: any) {
        vscode.window.showErrorMessage('Error loading file embeddings.');
        console.error('Error loading embeddings:', error);
        logger.log('--- Error Loading Embeddings ---');
        logger.log(error.toString());
        return {};
    }
}

/**
 * Finds similar files based on the prompt embedding.
 * @param promptEmbedding The embedding vector for the prompt.
 * @param fileEmbeddings The embeddings for all files.
 * @param threshold The similarity threshold.
 * @returns A list of similar file paths.
 */
export function findSimilarFiles(promptEmbedding: number[], fileEmbeddings: FileEmbeddings, threshold: number = 0.7): string[] {
    const similarFiles: string[] = [];
    for (const [file, embedding] of Object.entries(fileEmbeddings)) {
        const similarity = cosineSimilarity(promptEmbedding, embedding);
        if (similarity >= threshold) {
            similarFiles.push(file);
            logger.log(`File "${file}" has similarity ${similarity.toFixed(4)}`);
        }
    }
    return similarFiles;
}

/**
 * Preprocesses and generates embeddings for all project files.
 */
export async function preprocessEmbeddings(): Promise<void> {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
        vscode.window.showErrorMessage('Cannot determine workspace root.');
        logger.log('Cannot determine workspace root.');
        return;
    }

    const projectFiles = getProjectFiles(rootDir, rootDir);
    const embeddings: FileEmbeddings = {};

    const totalFiles = Object.keys(projectFiles).length;
    if (totalFiles === 0) {
        vscode.window.showErrorMessage('No project files found to preprocess.');
        logger.log('No project files found to preprocess.');
        return;
    }

    vscode.window.showInformationMessage(`Starting preprocessing of ${totalFiles} files...`);
    logger.log(`Starting preprocessing of ${totalFiles} files...`);
    console.log(`Starting preprocessing of ${totalFiles} files...`);

    let processedFiles = 0;

    for (const [filePath, content] of Object.entries(projectFiles)) {
        processedFiles++;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Preprocessing embeddings (${processedFiles}/${totalFiles})`,
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: (100 / totalFiles) });
            vscode.window.showInformationMessage(`Processing file (${processedFiles}/${totalFiles}): ${filePath}`);
            logger.log(`Processing file (${processedFiles}/${totalFiles}): ${filePath}`);
            console.log(`Processing file (${processedFiles}/${totalFiles}): ${filePath}`);
            const embedding = await generateEmbedding(content);
            if (embedding.length > 0) {
                embeddings[filePath] = embedding;
                logger.log(`Embedding generated for ${filePath}`);
            } else {
                logger.log(`Failed to generate embedding for ${filePath}`);
            }
        });
    }

    if (Object.keys(embeddings).length > 0) {
        saveFileEmbeddings(embeddings);
    } else {
        vscode.window.showErrorMessage('No embeddings were generated. Please ensure your API key is correct and you have network connectivity.');
        logger.log('No embeddings were generated.');
    }
}
