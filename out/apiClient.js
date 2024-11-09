"use strict";
// src/apiClient.ts
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findAllRelatedFiles = exports.sendFilesRequestToGPT = exports.sendToGPTAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
const embeddingService_1 = require("./embeddingService");
const dependencyAnalyzer_1 = require("./dependencyAnalyzer");
const utils_1 = require("./utils");
const logger_1 = __importDefault(require("./logger"));
const historyService_1 = require("./historyService");
/**
 * Supported Models and their max_tokens or max_completion_tokens
 */
const MODEL_CONFIG = {
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
function cleanRequestData(data) {
    return Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== null && v !== undefined));
}
/**
 * Determines if the model supports system messages.
 * @param model The GPT model identifier.
 * @returns Boolean indicating support for system messages.
 */
function supportsSystemMessage(model) {
    const modelsSupportingSystem = ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o'];
    return modelsSupportingSystem.includes(model);
}
/**
 * Determines the appropriate temperature parameter based on the model.
 * @param model The GPT model identifier.
 * @param temperature The desired temperature value.
 * @returns An object with the correct temperature parameter.
 */
function getTemperatureParam(model, temperature) {
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
function sendToGPTAPI(prompt, model, directoryStructure, projectFiles, selectedFiles) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = (0, utils_1.getApiKey)();
        if (!apiKey) {
            vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
            logger_1.default.log('GPT API key is missing.');
            return '';
        }
        const filesContent = {};
        selectedFiles.forEach(filePath => {
            if (projectFiles[filePath]) {
                filesContent[filePath] = projectFiles[filePath];
            }
        });
        // Log the selected files
        logger_1.default.log('Selected Files for GPT API:');
        logger_1.default.logJSON(filesContent);
        // Construct the messages array as per OpenAI's Chat Completions API
        const messages = [];
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
        const requestData = Object.assign(Object.assign({ model: model, messages: messages, top_p: 1, n: 1, stream: false, presence_penalty: 0, frequency_penalty: 0 }, maxParamObject), temperatureParam);
        const cleanData = cleanRequestData(requestData);
        // Log the request payload
        logger_1.default.log('--- Sending GPT API Request ---');
        logger_1.default.logJSON(cleanData);
        try {
            const response = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', cleanData, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            // Log the full response
            logger_1.default.log('--- Received GPT API Response ---');
            logger_1.default.logJSON(response.data);
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const choice = response.data.choices[0];
                if (choice.message && choice.message.content) {
                    // Add to chat history
                    (0, historyService_1.addChatHistory)({
                        prompt: prompt,
                        model: model,
                        response: choice.message.content,
                        timestamp: new Date().toISOString()
                    });
                    return choice.message.content;
                }
                else {
                    vscode.window.showErrorMessage('GPT API response is empty.');
                    logger_1.default.log('GPT API response is empty.');
                    return '';
                }
            }
            else {
                vscode.window.showErrorMessage('Invalid response structure from GPT API.');
                logger_1.default.log('Invalid response structure from GPT API.');
                return '';
            }
        }
        catch (error) {
            // Log the error details
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                logger_1.default.log('--- GPT API Error ---');
                if (axiosError.response) {
                    logger_1.default.logJSON(axiosError.response.data);
                    const errorMessage = ((_b = (_a = axiosError.response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || 'Unknown error';
                    vscode.window.showErrorMessage('Error communicating with GPT API: ' + errorMessage);
                }
                else if (axiosError.request) {
                    logger_1.default.log('No response received from GPT API.');
                    vscode.window.showErrorMessage('No response received from GPT API. Please check your network connection.');
                }
                else {
                    logger_1.default.log('Error setting up the request.');
                    vscode.window.showErrorMessage('Error setting up the GPT API request: ' + axiosError.message);
                }
            }
            else {
                logger_1.default.log('--- Unexpected Error ---');
                logger_1.default.log(error.toString());
                vscode.window.showErrorMessage('An unexpected error occurred: ' + error.toString());
            }
            return '';
        }
    });
}
exports.sendToGPTAPI = sendToGPTAPI;
/**
 * Sends a request to the GPT API to identify involved files based on the user's prompt.
 * @param prompt User's input prompt.
 * @param model Selected GPT model.
 * @param directoryStructure Project's directory structure.
 * @param projectFiles All project files.
 * @returns JSON string containing the list of involved files.
 */
function sendFilesRequestToGPT(prompt, model, directoryStructure, projectFiles) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = (0, utils_1.getApiKey)();
        if (!apiKey) {
            vscode.window.showErrorMessage('GPT API key is not set in the Navicode settings.');
            logger_1.default.log('GPT API key is missing.');
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
        const messages = [];
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
        const requestData = Object.assign(Object.assign({ model: model, messages: messages, top_p: 1, n: 1, stream: false, presence_penalty: 0, frequency_penalty: 0 }, maxParamObject), temperatureParam);
        const cleanData = cleanRequestData(requestData);
        // Log the request payload
        logger_1.default.log('--- Sending Files Request to GPT API ---');
        logger_1.default.logJSON(cleanData);
        try {
            const response = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', cleanData, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            // Log the full response
            logger_1.default.log('--- Received GPT API Files Response ---');
            logger_1.default.logJSON(response.data);
            if (response.data && response.data.choices && response.data.choices.length > 0) {
                const choice = response.data.choices[0];
                if (choice.message && choice.message.content) {
                    return choice.message.content.trim();
                }
                else {
                    vscode.window.showErrorMessage('GPT API response is empty.');
                    logger_1.default.log('GPT API response is empty.');
                    return '';
                }
            }
            else {
                vscode.window.showErrorMessage('Invalid response structure from GPT API.');
                logger_1.default.log('Invalid response structure from GPT API.');
                return '';
            }
        }
        catch (error) {
            // Log the error details
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                logger_1.default.log('--- GPT API Files Request Error ---');
                if (axiosError.response) {
                    logger_1.default.logJSON(axiosError.response.data);
                    const errorMessage = ((_b = (_a = axiosError.response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || 'Unknown error';
                    vscode.window.showErrorMessage('Error communicating with GPT API for files: ' + errorMessage);
                }
                else if (axiosError.request) {
                    logger_1.default.log('No response received from GPT API for files.');
                    vscode.window.showErrorMessage('No response received from GPT API for files. Please check your network connection.');
                }
                else {
                    logger_1.default.log('Error setting up the request for files.');
                    vscode.window.showErrorMessage('Error setting up the GPT API request for files: ' + axiosError.message);
                }
            }
            else {
                logger_1.default.log('--- Unexpected Error ---');
                logger_1.default.log(error.toString());
                vscode.window.showErrorMessage('An unexpected error occurred: ' + error.toString());
            }
            return '';
        }
    });
}
exports.sendFilesRequestToGPT = sendFilesRequestToGPT;
/**
 * Finds all related files based on semantic similarity and dependency graph.
 * @param prompt The user's input prompt.
 * @param model The selected GPT model.
 * @returns A list of related file paths.
 */
function findAllRelatedFiles(prompt, model) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = (0, utils_1.getWorkspaceRoot)();
        if (!rootDir) {
            return [];
        }
        // Step 1: Generate Dependency Graph
        vscode.window.showInformationMessage('Generating dependency graph...');
        logger_1.default.log('Generating dependency graph...');
        const dependencyGraph = yield (0, dependencyAnalyzer_1.generateDependencyGraph)();
        logger_1.default.log('Dependency Graph:');
        logger_1.default.logJSON(dependencyGraph);
        // Step 2: Load File Embeddings
        vscode.window.showInformationMessage('Loading file embeddings...');
        logger_1.default.log('Loading file embeddings...');
        const fileEmbeddings = (0, embeddingService_1.loadFileEmbeddings)();
        logger_1.default.log('Loaded File Embeddings:');
        // logger.logJSON(fileEmbeddings);
        if (Object.keys(fileEmbeddings).length === 0) {
            vscode.window.showInformationMessage('No file embeddings found. Please preprocess embeddings.');
            logger_1.default.log('No file embeddings found. Please preprocess embeddings.');
            return [];
        }
        // Step 3: Generate Prompt Embedding
        vscode.window.showInformationMessage('Generating prompt embedding...');
        logger_1.default.log('Generating prompt embedding...');
        const promptEmbedding = yield (0, embeddingService_1.generateEmbedding)(prompt);
        if (promptEmbedding.length === 0) {
            return [];
        }
        logger_1.default.log('Prompt Embedding:');
        // logger.logJSON(promptEmbedding);
        // Step 4: Perform Semantic Search
        vscode.window.showInformationMessage('Performing semantic search...');
        logger_1.default.log('Performing semantic search...');
        const similarFiles = (0, embeddingService_1.findSimilarFiles)(promptEmbedding, fileEmbeddings);
        logger_1.default.log('Similar Files:');
        logger_1.default.logJSON(similarFiles);
        if (similarFiles.length === 0) {
            logger_1.default.log('No similar files found based on embeddings.');
            return [];
        }
        // Step 5: Traverse Dependency Graph to Find Related Files
        const allRelatedFiles = new Set();
        similarFiles.forEach(file => {
            allRelatedFiles.add(file);
            const dependencies = traverseDependencies(file, dependencyGraph);
            dependencies.forEach(dep => allRelatedFiles.add(dep));
        });
        logger_1.default.log('All Related Files:');
        logger_1.default.logJSON(Array.from(allRelatedFiles));
        return Array.from(allRelatedFiles);
    });
}
exports.findAllRelatedFiles = findAllRelatedFiles;
/**
 * Traverses the dependency graph to find all dependencies of a given file.
 * @param file The file to traverse.
 * @param graph The dependency graph.
 * @param visited A set to keep track of visited files.
 * @returns A list of dependent file paths.
 */
function traverseDependencies(file, graph, visited = new Set()) {
    const dependencies = graph[file] || [];
    let result = [];
    dependencies.forEach((dep) => {
        if (!visited.has(dep)) {
            visited.add(dep);
            result.push(dep);
            result = result.concat(traverseDependencies(dep, graph, visited));
        }
    });
    return result;
}
//# sourceMappingURL=apiClient.js.map