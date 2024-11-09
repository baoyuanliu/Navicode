// src/embeddingService.ts

import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import {
  getWorkspaceRoot,
  getApiKey,
  getProjectFiles,
  getIncludedFileExtensions,
  getExcludedFileExtensions,
} from './utils';
import { FileEmbeddings } from './types';
import logger from './logger';

/**
 * Generates an embedding for the given text using OpenAI's Embedding API.
 * @param text The input text to embed.
 * @returns The embedding vector as an array of numbers.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getApiKey();
  logger.log(`Using API Key: ${apiKey ? '****' : 'None provided'}`);
  if (!apiKey) {
    logger.log('GPT API key is missing.');
    return [];
  }

  try {
    vscode.window.showInformationMessage('Generating embedding...');
    logger.log('Generating embedding...');
    const response = await axios.post(
      'https://api.openai.com/v1/embeddings',
      {
        model: 'text-embedding-3-large',
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.log('Received response from Embedding API.');

    const embedding = response.data?.data?.[0]?.embedding;
    if (Array.isArray(embedding) && embedding.every((num) => typeof num === 'number')) {
      vscode.window.showInformationMessage('Embedding generated successfully.');
      logger.log('Embedding generated successfully.');
      return embedding as number[];
    } else {
      vscode.window.showErrorMessage(
        'Invalid embedding format received from Embedding API.'
      );
      console.error('Invalid embedding format:', embedding);
      logger.log('Invalid embedding format received from Embedding API.');
      return [];
    }
  } catch (error: any) {
    handleEmbeddingError(error);
    return [];
  }
}

/**
 * Handles errors during embedding generation.
 * @param error The error object.
 */
function handleEmbeddingError(error: any): void {
  logger.log('Error occurred while generating embedding.');
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      error: { message: string; type: string; param?: string; code?: string };
    }>;
    vscode.window.showErrorMessage('Error generating embedding.');
    logger.log('--- Embedding API Error ---');
    if (axiosError.response) {
      logger.logJSON(axiosError.response.data);
      const errorMessage =
        axiosError.response.data?.error?.message || 'Unknown error';
      vscode.window.showErrorMessage(`Error generating embedding: ${errorMessage}`);
    } else if (axiosError.request) {
      logger.log('No response received from Embedding API.');
      vscode.window.showErrorMessage(
        'No response received from Embedding API. Please check your network connection.'
      );
    } else {
      logger.log('Error setting up the request.');
      vscode.window.showErrorMessage(
        `Error setting up the Embedding API request: ${axiosError.message}`
      );
    }
  } else {
    vscode.window.showErrorMessage(
      'An unexpected error occurred while generating embedding.'
    );
    logger.log('--- Unexpected Error ---');
    logger.log(error.toString());
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
  const magnitudeA = Math.hypot(...vecA);
  const magnitudeB = Math.hypot(...vecB);
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  logger.log(`Calculated cosine similarity: ${similarity}`);
  return similarity;
}

/**
 * Saves file embeddings to a JSON file.
 * @param embeddings The file embeddings to save.
 */
export function saveFileEmbeddings(embeddings: FileEmbeddings): void {
  const rootDir = getWorkspaceRoot();
  logger.log(`Saving embeddings to workspace root: ${rootDir}`);
  if (!rootDir) {
    logger.log('Cannot determine workspace root for saving embeddings.');
    return;
  }

  const navicodeDir = path.join(rootDir, '.navicode');
  const embeddingsPath = path.join(navicodeDir, 'file-embeddings.json');
  logger.log(`Embeddings path: ${embeddingsPath}`);

  try {
    if (!fs.existsSync(navicodeDir)) {
      fs.mkdirSync(navicodeDir, { recursive: true });
      vscode.window.showInformationMessage(`Created directory: ${navicodeDir}`);
      logger.log(`Created directory: ${navicodeDir}`);
    }
    fs.writeFileSync(
      embeddingsPath,
      JSON.stringify(embeddings, null, 2),
      'utf-8'
    );
    vscode.window.showInformationMessage(
      'File embeddings have been saved successfully.'
    );
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
  logger.log(`Loading embeddings from workspace root: ${rootDir}`);
  if (!rootDir) {
    logger.log('Cannot determine workspace root for loading embeddings.');
    return {};
  }

  const embeddingsPath = path.join(rootDir, '.navicode', 'file-embeddings.json');
  logger.log(`Embeddings path: ${embeddingsPath}`);

  try {
    if (!fs.existsSync(embeddingsPath)) {
      logger.log(`Embeddings file not found at ${embeddingsPath}. Creating a new one.`);
      const navicodeDir = path.dirname(embeddingsPath);
      if (!fs.existsSync(navicodeDir)) {
        fs.mkdirSync(navicodeDir, { recursive: true });
        logger.log(`Created directory: ${navicodeDir}`);
      }
      fs.writeFileSync(embeddingsPath, JSON.stringify({}, null, 2), 'utf-8');
      vscode.window.showInformationMessage(`Created new embeddings file at ${embeddingsPath}.`);
      return {};
    }
    const data = fs.readFileSync(embeddingsPath, 'utf-8');
    const embeddings: FileEmbeddings = JSON.parse(data);
    logger.log(`Loaded embeddings from ${embeddingsPath}`);
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
 * @returns A list of similar file paths.
 */
export function findSimilarFiles(
  promptEmbedding: number[],
  fileEmbeddings: FileEmbeddings
): string[] {
  logger.log('Starting semantic search for similar files.');
  logger.log(`Prompt Embedding Length: ${promptEmbedding.length}`);
  logger.log(`Number of file embeddings: ${Object.keys(fileEmbeddings).length}`);
  const similarityScores: Array<{ file: string; similarity: number }> = [];

  for (const [file, embedding] of Object.entries(fileEmbeddings)) {
    logger.log(`Processing file: ${file}`);
    logger.log(`Embedding Length for ${file}: ${embedding.length}`);
    if (promptEmbedding.length !== embedding.length) {
      logger.log(`Skipping file ${file} due to embedding length mismatch.`);
      continue;
    }
    const similarity = cosineSimilarity(promptEmbedding, embedding);
    logger.log(`Similarity for ${file}: ${similarity}`);
    similarityScores.push({ file, similarity });
  }

  // Sort files by similarity in descending order
  similarityScores.sort((a, b) => b.similarity - a.similarity);

  // Compute mean and standard deviation of similarity scores
  const similarities = similarityScores.map((item) => item.similarity);
  const meanSimilarity =
    similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
  const stdDevSimilarity = Math.sqrt(
    similarities.reduce((sum, val) => sum + (val - meanSimilarity) ** 2, 0) /
      similarities.length
  );

  logger.log(`Mean Similarity: ${meanSimilarity}`);
  logger.log(`Standard Deviation of Similarity: ${stdDevSimilarity}`);

  // Set threshold as mean + k * stdDev
  const k = 0.5; // Adjust this value to include more or fewer files
  const dynamicThreshold = meanSimilarity + k * stdDevSimilarity;
  logger.log(`Dynamic Threshold (Mean + ${k} * StdDev): ${dynamicThreshold}`);

  // Include all files with similarity above the dynamic threshold
  const similarFiles = similarityScores
    .filter((item) => item.similarity >= dynamicThreshold)
    .map((item) => item.file);

  logger.log(`Files selected based on dynamic threshold:`);
  logger.logJSON(similarFiles);

  return similarFiles;
}

/**
 * Preprocesses and generates embeddings for all project files.
 * Implements caching to avoid regenerating embeddings for unchanged files.
 */
export async function preprocessEmbeddings(): Promise<void> {
  const rootDir = getWorkspaceRoot();
  if (!rootDir) {
    vscode.window.showErrorMessage('Cannot determine workspace root.');
    logger.log('Cannot determine workspace root.');
    return;
  }

  const projectFiles = getProjectFiles(rootDir, rootDir);
  logger.log(`Number of project files to preprocess: ${Object.keys(projectFiles).length}`);
  const embeddings: FileEmbeddings = loadFileEmbeddings();

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
  let embeddingsUpdated = false;

  for (const [filePath, content] of Object.entries(projectFiles)) {
    processedFiles++;
    logger.log(`Processing file ${processedFiles}/${totalFiles}: ${filePath}`);

    // Check if embedding already exists to avoid redundant API calls
    if (embeddings[filePath]) {
      // Optionally, implement a file hash check to ensure the file hasn't changed
      logger.log(`Skipping embedding for ${filePath} as it already exists.`);
      continue;
    }

    const embedding = await generateEmbedding(content);
    if (embedding.length > 0) {
      embeddings[filePath] = embedding;
      embeddingsUpdated = true;
      logger.log(`Embedding generated for ${filePath}`);
    } else {
      logger.log(`Failed to generate embedding for ${filePath}`);
    }

    vscode.window.showInformationMessage(
      `Processed file (${processedFiles}/${totalFiles}): ${filePath}`
    );
  }

  if (embeddingsUpdated) {
    logger.log('Saving generated embeddings.');
    saveFileEmbeddings(embeddings);
  } else {
    vscode.window.showInformationMessage('No new embeddings were generated.');
    logger.log('No new embeddings were generated.');
  }
}
