"use strict";
// src/embeddingService.ts
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
exports.preprocessEmbeddings = exports.findSimilarFiles = exports.loadFileEmbeddings = exports.saveFileEmbeddings = exports.cosineSimilarity = exports.generateEmbedding = void 0;
const axios_1 = __importDefault(require("axios"));
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const logger_1 = __importDefault(require("./logger"));
/**
 * Generates an embedding for the given text using OpenAI's Embedding API.
 * @param text The input text to embed.
 * @returns The embedding vector as an array of numbers.
 */
function generateEmbedding(text) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = (0, utils_1.getApiKey)();
        if (!apiKey) {
            logger_1.default.log('GPT API key is missing.');
            return [];
        }
        try {
            vscode.window.showInformationMessage('Generating embedding...');
            logger_1.default.log('Generating embedding...');
            const response = yield axios_1.default.post('https://api.openai.com/v1/embeddings', {
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
                if (Array.isArray(embedding) && embedding.every((num) => typeof num === 'number')) {
                    vscode.window.showInformationMessage('Embedding generated successfully.');
                    logger_1.default.log('Embedding generated successfully.');
                    return embedding;
                }
                else {
                    vscode.window.showErrorMessage('Invalid embedding format received from Embedding API.');
                    console.error('Invalid embedding format:', embedding);
                    logger_1.default.log('Invalid embedding format received from Embedding API.');
                    return [];
                }
            }
            else {
                vscode.window.showErrorMessage('Invalid response from Embedding API.');
                console.error('Invalid response:', response.data);
                logger_1.default.log('Invalid response from Embedding API.');
                return [];
            }
        }
        catch (error) {
            // Log the error details
            if (axios_1.default.isAxiosError(error)) {
                const axiosError = error;
                vscode.window.showErrorMessage('Error generating embedding.');
                logger_1.default.log('--- Embedding API Error ---');
                if (axiosError.response) {
                    logger_1.default.logJSON(axiosError.response.data);
                    const errorMessage = ((_b = (_a = axiosError.response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || 'Unknown error';
                    vscode.window.showErrorMessage('Error generating embedding: ' + errorMessage);
                }
                else if (axiosError.request) {
                    logger_1.default.log('No response received from Embedding API.');
                    vscode.window.showErrorMessage('No response received from Embedding API. Please check your network connection.');
                }
                else {
                    logger_1.default.log('Error setting up the request.');
                    vscode.window.showErrorMessage('Error setting up the Embedding API request: ' + axiosError.message);
                }
            }
            else {
                vscode.window.showErrorMessage('An unexpected error occurred while generating embedding.');
                logger_1.default.log('--- Unexpected Error ---');
                logger_1.default.log(error.toString());
            }
            return [];
        }
    });
}
exports.generateEmbedding = generateEmbedding;
/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity as a number between -1 and 1.
 */
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
exports.cosineSimilarity = cosineSimilarity;
/**
 * Saves file embeddings to a JSON file.
 * @param embeddings The file embeddings to save.
 */
function saveFileEmbeddings(embeddings) {
    const rootDir = (0, utils_1.getWorkspaceRoot)();
    if (!rootDir) {
        logger_1.default.log('Cannot determine workspace root for saving embeddings.');
        return;
    }
    const navicodeDir = path.join(rootDir, '.navicode');
    const embeddingsPath = path.join(navicodeDir, 'file-embeddings.json');
    try {
        if (!fs.existsSync(navicodeDir)) {
            fs.mkdirSync(navicodeDir, { recursive: true });
            vscode.window.showInformationMessage(`Created directory: ${navicodeDir}`);
            logger_1.default.log(`Created directory: ${navicodeDir}`);
        }
        fs.writeFileSync(embeddingsPath, JSON.stringify(embeddings, null, 2), 'utf-8');
        vscode.window.showInformationMessage('File embeddings have been saved successfully.');
        logger_1.default.log('File embeddings have been saved successfully.');
        console.log(`File embeddings saved to ${embeddingsPath}`);
    }
    catch (error) {
        vscode.window.showErrorMessage('Error saving file embeddings.');
        console.error('Error saving embeddings:', error);
        logger_1.default.log('--- Error Saving Embeddings ---');
        logger_1.default.log(error.toString());
    }
}
exports.saveFileEmbeddings = saveFileEmbeddings;
/**
 * Loads file embeddings from the JSON file.
 * @returns The loaded file embeddings.
 */
function loadFileEmbeddings() {
    const rootDir = (0, utils_1.getWorkspaceRoot)();
    if (!rootDir) {
        logger_1.default.log('Cannot determine workspace root for loading embeddings.');
        return {};
    }
    const embeddingsPath = path.join(rootDir, '.navicode', 'file-embeddings.json');
    try {
        if (!fs.existsSync(embeddingsPath)) {
            logger_1.default.log(`Embeddings file not found at ${embeddingsPath}`);
            vscode.window.showInformationMessage(`Embeddings file not found at ${embeddingsPath}. Please run the preprocessing command.`);
            return {};
        }
        const data = fs.readFileSync(embeddingsPath, 'utf-8');
        const embeddings = JSON.parse(data);
        logger_1.default.log(`Loaded embeddings from ${embeddingsPath}`);
        logger_1.default.logJSON(embeddings);
        return embeddings;
    }
    catch (error) {
        vscode.window.showErrorMessage('Error loading file embeddings.');
        console.error('Error loading embeddings:', error);
        logger_1.default.log('--- Error Loading Embeddings ---');
        logger_1.default.log(error.toString());
        return {};
    }
}
exports.loadFileEmbeddings = loadFileEmbeddings;
/**
 * Finds similar files based on the prompt embedding.
 * @param promptEmbedding The embedding vector for the prompt.
 * @param fileEmbeddings The embeddings for all files.
 * @param threshold The similarity threshold.
 * @returns A list of similar file paths.
 */
function findSimilarFiles(promptEmbedding, fileEmbeddings, threshold = 0.7) {
    const similarFiles = [];
    for (const [file, embedding] of Object.entries(fileEmbeddings)) {
        const similarity = cosineSimilarity(promptEmbedding, embedding);
        if (similarity >= threshold) {
            similarFiles.push(file);
            logger_1.default.log(`File "${file}" has similarity ${similarity.toFixed(4)}`);
        }
    }
    return similarFiles;
}
exports.findSimilarFiles = findSimilarFiles;
/**
 * Preprocesses and generates embeddings for all project files.
 */
function preprocessEmbeddings() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = (0, utils_1.getWorkspaceRoot)();
        if (!rootDir) {
            vscode.window.showErrorMessage('Cannot determine workspace root.');
            logger_1.default.log('Cannot determine workspace root.');
            return;
        }
        const projectFiles = (0, utils_1.getProjectFiles)(rootDir, rootDir);
        const embeddings = {};
        const totalFiles = Object.keys(projectFiles).length;
        if (totalFiles === 0) {
            vscode.window.showErrorMessage('No project files found to preprocess.');
            logger_1.default.log('No project files found to preprocess.');
            return;
        }
        vscode.window.showInformationMessage(`Starting preprocessing of ${totalFiles} files...`);
        logger_1.default.log(`Starting preprocessing of ${totalFiles} files...`);
        console.log(`Starting preprocessing of ${totalFiles} files...`);
        let processedFiles = 0;
        for (const [filePath, content] of Object.entries(projectFiles)) {
            processedFiles++;
            yield vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Preprocessing embeddings (${processedFiles}/${totalFiles})`,
                cancellable: false
            }, (progress) => __awaiter(this, void 0, void 0, function* () {
                progress.report({ increment: (100 / totalFiles) });
                vscode.window.showInformationMessage(`Processing file (${processedFiles}/${totalFiles}): ${filePath}`);
                logger_1.default.log(`Processing file (${processedFiles}/${totalFiles}): ${filePath}`);
                console.log(`Processing file (${processedFiles}/${totalFiles}): ${filePath}`);
                const embedding = yield generateEmbedding(content);
                if (embedding.length > 0) {
                    embeddings[filePath] = embedding;
                    logger_1.default.log(`Embedding generated for ${filePath}`);
                }
                else {
                    logger_1.default.log(`Failed to generate embedding for ${filePath}`);
                }
            }));
        }
        if (Object.keys(embeddings).length > 0) {
            saveFileEmbeddings(embeddings);
        }
        else {
            vscode.window.showErrorMessage('No embeddings were generated. Please ensure your API key is correct and you have network connectivity.');
            logger_1.default.log('No embeddings were generated.');
        }
    });
}
exports.preprocessEmbeddings = preprocessEmbeddings;
//# sourceMappingURL=embeddingService.js.map