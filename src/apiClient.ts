// src/apiClient.ts

import axios, { AxiosError } from 'axios';
import * as vscode from 'vscode';
import {
    generateEmbedding,
    cosineSimilarity,
    loadFileEmbeddings,
    findSimilarFiles
} from './embeddingService';
import { generateDependencyGraph } from './dependencyAnalyzer';
import {
    GPTResponse,
    DependencyGraph,
    FileEmbeddings,
    SupportedModel,
    OpenAIErrorResponse,
    ChatCompletionRequestMessage
} from './types';
import {
    getWorkspaceRoot,
    getApiKey,
    getIncludedFileExtensions,
    getExcludedFileExtensions
} from './utils';
import logger from './logger';
import { addChatHistory, getChatHistory } from './historyService';

/**
 * Supported Models and their max_tokens or max_completion_tokens
 */
const MODEL_CONFIG: Record<SupportedModel, { max_value: number; max_param: string }> = {
    'gpt-4o': {
        max_value: 16384,
        max_param: 'max_tokens'
    },
    'o1-preview': {
        max_value: 32768,
        max_param: 'max_completion_tokens'
    },
    'o1-mini': {
        max_value: 65536,
        max_param: 'max_completion_tokens'
    },
    'gpt-3.5-turbo': {
        max_value: 4096,
        max_param: 'max_tokens'
    },
    'gpt-4': {
        max_value: 8192,
        max_param: 'max_tokens'
    }
};

/**
 * Helper function to clean request data by removing null or undefined values.
 * @param data The request data object.
 * @returns Cleaned request data object.
 */
function cleanRequestData(data: any): any {
    return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
    );
}

/**
 * Determines if the model supports system messages.
 * @param model The GPT model identifier.
 * @returns Boolean indicating support for system messages.
 */
function supportsSystemMessage(model: SupportedModel): boolean {
    const modelsSupportingSystem = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o'];
    return modelsSupportingSystem.includes(model);
}

/**
 * Determines the appropriate temperature parameter based on the model.
 * @param model The GPT model identifier.
 * @param temperature The desired temperature value.
 * @returns An object with the correct temperature parameter.
 */
function getTemperatureParam(model: SupportedModel, temperature: number): any {
    const modelsWithFixedTemperature = ['o1-mini', 'o1-preview'];
    if (modelsWithFixedTemperature.includes(model)) {
        return {}; // Do not include temperature for these models
    }
    return { temperature: temperature };
}

/**
 * Sends the user's prompt along with selected files to the GPT API.
 * @param prompt User's input prompt.
 * @param model Selected GPT model.
 * @param directoryStructure Project's directory structure.
 * @param projectFiles All project files.
 * @param selectedFiles Files selected by the user.
 * @returns GPT's response as a string.
 */
export async function sendToGPTAPI(
    prompt: string,
    model: SupportedModel,
    directoryStructure: any,
    projectFiles: any,
    selectedFiles: string[]
): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) {
        vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
        logger.log('GPT API key is missing.');
        return '';
    }

    const filesContent: { [key: string]: string } = {};
    selectedFiles.forEach(filePath => {
        if (projectFiles[filePath]) {
            filesContent[filePath] = projectFiles[filePath];
        }
    });

    // Log the selected files
    logger.log('Selected Files for GPT API:');
    logger.logJSON(filesContent);

    // Construct the messages array as per OpenAI's Chat Completions API
    const messages: ChatCompletionRequestMessage[] = [];

    if (supportsSystemMessage(model)) {
        messages.push({ role: 'system', content: 'You are a helpful assistant.' });
    }

    messages.push({ role: 'user', content: prompt });
    messages.push({
        role: 'user',
        content: `Here are the selected files:\n${JSON.stringify(filesContent, null, 2)}`
    });

    const modelConfig = MODEL_CONFIG[model];
    const maxParam = modelConfig.max_param;
    const maxValue = modelConfig.max_value;
    const maxParamObject = { [maxParam]: maxValue };
    const temperatureParam = getTemperatureParam(model, 0.7);

    const requestData: any = {
        model: model,
        messages: messages,
        top_p: 1,
        n: 1,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 0,
        ...maxParamObject,
        ...temperatureParam
    };

    const cleanData = cleanRequestData(requestData);

    // Log the request payload
    logger.log('--- Sending GPT API Request ---');
    logger.logJSON(cleanData);

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', cleanData, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Log the full response
        logger.log('--- Received GPT API Response ---');
        logger.logJSON(response.data);

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const choice = response.data.choices[0];
            if (choice.message && choice.message.content) {
                // Add to chat history
                addChatHistory({
                    prompt: prompt,
                    model: model,
                    response: choice.message.content,
                    timestamp: new Date().toISOString()
                });

                return choice.message.content;
            } else {
                vscode.window.showErrorMessage('GPT API response is empty.');
                logger.log('GPT API response is empty.');
                return '';
            }
        } else {
            vscode.window.showErrorMessage('Invalid response structure from GPT API.');
            logger.log('Invalid response structure from GPT API.');
            return '';
        }
    } catch (error: any) {
        // Log the error details
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<OpenAIErrorResponse>;
            logger.log('--- GPT API Error ---');
            if (axiosError.response) {
                logger.logJSON(axiosError.response.data);
                const errorMessage = axiosError.response.data?.error?.message || 'Unknown error';
                vscode.window.showErrorMessage('Error communicating with GPT API: ' + errorMessage);
            } else if (axiosError.request) {
                logger.log('No response received from GPT API.');
                vscode.window.showErrorMessage(
                    'No response received from GPT API. Please check your network connection.'
                );
            } else {
                logger.log('Error setting up the request.');
                vscode.window.showErrorMessage(
                    'Error setting up the GPT API request: ' + axiosError.message
                );
            }
        } else {
            logger.log('--- Unexpected Error ---');
            logger.log(error.toString());
            vscode.window.showErrorMessage('An unexpected error occurred: ' + error.toString());
        }
        return '';
    }
}

/**
 * Sends a request to the GPT API to identify involved files based on the user's prompt.
 * @param prompt User's input prompt.
 * @param model Selected GPT model.
 * @param directoryStructure Project's directory structure.
 * @param projectFiles All project files.
 * @returns JSON string containing the list of involved files.
 */
export async function sendFilesRequestToGPT(
    prompt: string,
    model: SupportedModel,
    directoryStructure: any,
    projectFiles: any
): Promise<string> {
    const apiKey = getApiKey();
    if (!apiKey) {
        vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
        logger.log('GPT API key is missing.');
        return '';
    }

    const enhancedPrompt = `
You are an assistant that analyzes project directories. Based on the following project structure and user prompt, identify all files that may be involved in addressing the prompt, including those that are logically related through dependencies or interactions.

Project Structure:
${JSON.stringify(directoryStructure, null, 2)}

User Prompt:
${prompt}

Please return the list of involved files in the following JSON format:
{
    "involvedFiles": [
        "path/to/file1.js",
        "path/to/file2.py"
    ]
}
`;

    // Construct the messages array as per OpenAI's Chat Completions API
    const messages: ChatCompletionRequestMessage[] = [];

    if (supportsSystemMessage(model)) {
        messages.push({
            role: 'system',
            content: 'You are a helpful assistant specialized in project analysis.'
        });
    }

    messages.push({ role: 'user', content: enhancedPrompt });

    const modelConfig = MODEL_CONFIG[model];
    const maxParam = modelConfig.max_param;
    const maxValue = modelConfig.max_value;
    const maxParamObject = { [maxParam]: maxValue };
    const temperatureParam = getTemperatureParam(model, 0); // Temperature is fixed to default

    const requestData: any = {
        model: model,
        messages: messages,
        top_p: 1,
        n: 1,
        stream: false,
        presence_penalty: 0,
        frequency_penalty: 0,
        ...maxParamObject,
        ...temperatureParam
    };

    const cleanData = cleanRequestData(requestData);

    // Log the request payload
    logger.log('--- Sending Files Request to GPT API ---');
    logger.logJSON(cleanData);

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', cleanData, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Log the full response
        logger.log('--- Received GPT API Files Response ---');
        logger.logJSON(response.data);

        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const choice = response.data.choices[0];
            if (choice.message && choice.message.content) {
                return choice.message.content.trim();
            } else {
                vscode.window.showErrorMessage('GPT API response is empty.');
                logger.log('GPT API response is empty.');
                return '';
            }
        } else {
            vscode.window.showErrorMessage('Invalid response structure from GPT API.');
            logger.log('Invalid response structure from GPT API.');
            return '';
        }
    } catch (error: any) {
        // Log the error details
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<OpenAIErrorResponse>;
            logger.log('--- GPT API Files Request Error ---');
            if (axiosError.response) {
                logger.logJSON(axiosError.response.data);
                const errorMessage = axiosError.response.data?.error?.message || 'Unknown error';
                vscode.window.showErrorMessage('Error communicating with GPT API for files: ' + errorMessage);
            } else if (axiosError.request) {
                logger.log('No response received from GPT API for files.');
                vscode.window.showErrorMessage(
                    'No response received from GPT API for files. Please check your network connection.'
                );
            } else {
                logger.log('Error setting up the request for files.');
                vscode.window.showErrorMessage(
                    'Error setting up the GPT API request for files: ' + axiosError.message
                );
            }
        } else {
            logger.log('--- Unexpected Error ---');
            logger.log(error.toString());
            vscode.window.showErrorMessage('An unexpected error occurred: ' + error.toString());
        }
        return '';
    }
}

/** 
 * Finds all related files based on semantic similarity and dependency graph.
 * @param prompt The user's input prompt.
 * @param model The selected GPT model.
 * @returns A list of related file paths.
 */
export async function findAllRelatedFiles(prompt: string, model: SupportedModel): Promise<string[]> {
    const rootDir = getWorkspaceRoot();
    if (!rootDir) {
        return [];
    }

    // Step 1: Generate Dependency Graph
    vscode.window.showInformationMessage('Generating dependency graph...');
    logger.log('Generating dependency graph...');
    const dependencyGraph = await generateDependencyGraph();
    logger.log('Dependency Graph:');
    logger.logJSON(dependencyGraph);

    // Step 2: Load File Embeddings
    vscode.window.showInformationMessage('Loading file embeddings...');
    logger.log('Loading file embeddings...');
    const fileEmbeddings: FileEmbeddings = loadFileEmbeddings();
    logger.log('Loaded File Embeddings:');
    // logger.logJSON(fileEmbeddings);

    if (Object.keys(fileEmbeddings).length === 0) {
        vscode.window.showInformationMessage('No file embeddings found. Please preprocess embeddings.');
        logger.log('No file embeddings found. Please preprocess embeddings.');
        return [];
    }

    // Step 3: Generate Prompt Embedding
    vscode.window.showInformationMessage('Generating prompt embedding...');
    logger.log('Generating prompt embedding...');
    const promptEmbedding = await generateEmbedding(prompt);
    if (promptEmbedding.length === 0) {
        return [];
    }
    logger.log('Prompt Embedding:');
    // logger.logJSON(promptEmbedding);

    // Step 4: Perform Semantic Search
    vscode.window.showInformationMessage('Performing semantic search...');
    logger.log('Performing semantic search...');
    const similarFiles = findSimilarFiles(promptEmbedding, fileEmbeddings);
    logger.log('Similar Files:');
    logger.logJSON(similarFiles);

    if (similarFiles.length === 0) {
        logger.log('No similar files found based on embeddings.');
        return [];
    }

    // Step 5: Traverse Dependency Graph to Find Related Files
    const allRelatedFiles = new Set<string>();
    similarFiles.forEach(file => {
        allRelatedFiles.add(file);
        const dependencies = traverseDependencies(file, dependencyGraph);
        dependencies.forEach(dep => allRelatedFiles.add(dep));
    });

    logger.log('All Related Files:');
    logger.logJSON(Array.from(allRelatedFiles));

    return Array.from(allRelatedFiles);
}

/**
 * Traverses the dependency graph to find all dependencies of a given file.
 * @param file The file to traverse.
 * @param graph The dependency graph.
 * @param visited A set to keep track of visited files.
 * @returns A list of dependent file paths.
 */
function traverseDependencies(
    file: string,
    graph: DependencyGraph,
    visited: Set<string> = new Set()
): string[] {
    const dependencies = graph[file] || [];
    let result: string[] = [];
    dependencies.forEach((dep: string) => {
        if (!visited.has(dep)) {
            visited.add(dep);
            result.push(dep);
            result = result.concat(traverseDependencies(dep, graph, visited));
        }
    });
    return result;
}