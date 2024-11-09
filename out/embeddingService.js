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
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const apiKey = (0, utils_1.getApiKey)();
        logger_1.default.log(`Using API Key: ${apiKey ? '****' : 'None provided'}`);
        if (!apiKey) {
            logger_1.default.log('GPT API key is missing.');
            return [];
        }
        try {
            vscode.window.showInformationMessage('Generating embedding...');
            logger_1.default.log('Generating embedding...');
            const response = yield axios_1.default.post('https://api.openai.com/v1/embeddings', {
                model: 'text-embedding-3-large',
                input: text,
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            logger_1.default.log('Received response from Embedding API.');
            const embedding = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.embedding;
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
        catch (error) {
            handleEmbeddingError(error);
            return [];
        }
    });
}
exports.generateEmbedding = generateEmbedding;
/**
 * Handles errors during embedding generation.
 * @param error The error object.
 */
function handleEmbeddingError(error) {
    var _a, _b;
    logger_1.default.log('Error occurred while generating embedding.');
    if (axios_1.default.isAxiosError(error)) {
        const axiosError = error;
        vscode.window.showErrorMessage('Error generating embedding.');
        logger_1.default.log('--- Embedding API Error ---');
        if (axiosError.response) {
            logger_1.default.logJSON(axiosError.response.data);
            const errorMessage = ((_b = (_a = axiosError.response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || 'Unknown error';
            vscode.window.showErrorMessage(`Error generating embedding: ${errorMessage}`);
        }
        else if (axiosError.request) {
            logger_1.default.log('No response received from Embedding API.');
            vscode.window.showErrorMessage('No response received from Embedding API. Please check your network connection.');
        }
        else {
            logger_1.default.log('Error setting up the request.');
            vscode.window.showErrorMessage(`Error setting up the Embedding API request: ${axiosError.message}`);
        }
    }
    else {
        vscode.window.showErrorMessage('An unexpected error occurred while generating embedding.');
        logger_1.default.log('--- Unexpected Error ---');
        logger_1.default.log(error.toString());
    }
}
/**
 * Calculates the cosine similarity between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @returns The cosine similarity as a number between -1 and 1.
 */
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const magnitudeA = Math.hypot(...vecA);
    const magnitudeB = Math.hypot(...vecB);
    const similarity = dotProduct / (magnitudeA * magnitudeB);
    logger_1.default.log(`Calculated cosine similarity: ${similarity}`);
    return similarity;
}
exports.cosineSimilarity = cosineSimilarity;
/**
 * Saves file embeddings to a JSON file.
 * @param embeddings The file embeddings to save.
 */
function saveFileEmbeddings(embeddings) {
    const rootDir = (0, utils_1.getWorkspaceRoot)();
    logger_1.default.log(`Saving embeddings to workspace root: ${rootDir}`);
    if (!rootDir) {
        logger_1.default.log('Cannot determine workspace root for saving embeddings.');
        return;
    }
    const navicodeDir = path.join(rootDir, '.navicode');
    const embeddingsPath = path.join(navicodeDir, 'file-embeddings.json');
    logger_1.default.log(`Embeddings path: ${embeddingsPath}`);
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
    logger_1.default.log(`Loading embeddings from workspace root: ${rootDir}`);
    if (!rootDir) {
        logger_1.default.log('Cannot determine workspace root for loading embeddings.');
        return {};
    }
    const embeddingsPath = path.join(rootDir, '.navicode', 'file-embeddings.json');
    logger_1.default.log(`Embeddings path: ${embeddingsPath}`);
    try {
        if (!fs.existsSync(embeddingsPath)) {
            logger_1.default.log(`Embeddings file not found at ${embeddingsPath}. Creating a new one.`);
            const navicodeDir = path.dirname(embeddingsPath);
            if (!fs.existsSync(navicodeDir)) {
                fs.mkdirSync(navicodeDir, { recursive: true });
                logger_1.default.log(`Created directory: ${navicodeDir}`);
            }
            fs.writeFileSync(embeddingsPath, JSON.stringify({}, null, 2), 'utf-8');
            vscode.window.showInformationMessage(`Created new embeddings file at ${embeddingsPath}.`);
            return {};
        }
        const data = fs.readFileSync(embeddingsPath, 'utf-8');
        const embeddings = JSON.parse(data);
        logger_1.default.log(`Loaded embeddings from ${embeddingsPath}`);
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
 * @returns A list of similar file paths.
 */
function findSimilarFiles(promptEmbedding, fileEmbeddings) {
    logger_1.default.log('Starting semantic search for similar files.');
    logger_1.default.log(`Prompt Embedding Length: ${promptEmbedding.length}`);
    logger_1.default.log(`Number of file embeddings: ${Object.keys(fileEmbeddings).length}`);
    const similarityScores = [];
    for (const [file, embedding] of Object.entries(fileEmbeddings)) {
        logger_1.default.log(`Processing file: ${file}`);
        logger_1.default.log(`Embedding Length for ${file}: ${embedding.length}`);
        if (promptEmbedding.length !== embedding.length) {
            logger_1.default.log(`Skipping file ${file} due to embedding length mismatch.`);
            continue;
        }
        const similarity = cosineSimilarity(promptEmbedding, embedding);
        logger_1.default.log(`Similarity for ${file}: ${similarity}`);
        similarityScores.push({ file, similarity });
    }
    // Sort files by similarity in descending order
    similarityScores.sort((a, b) => b.similarity - a.similarity);
    // Compute mean and standard deviation of similarity scores
    const similarities = similarityScores.map((item) => item.similarity);
    const meanSimilarity = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;
    const stdDevSimilarity = Math.sqrt(similarities.reduce((sum, val) => sum + Math.pow((val - meanSimilarity), 2), 0) /
        similarities.length);
    logger_1.default.log(`Mean Similarity: ${meanSimilarity}`);
    logger_1.default.log(`Standard Deviation of Similarity: ${stdDevSimilarity}`);
    // Set threshold as mean + k * stdDev
    const k = 0.5; // Adjust this value to include more or fewer files
    const dynamicThreshold = meanSimilarity + k * stdDevSimilarity;
    logger_1.default.log(`Dynamic Threshold (Mean + ${k} * StdDev): ${dynamicThreshold}`);
    // Include all files with similarity above the dynamic threshold
    const similarFiles = similarityScores
        .filter((item) => item.similarity >= dynamicThreshold)
        .map((item) => item.file);
    logger_1.default.log(`Files selected based on dynamic threshold:`);
    logger_1.default.logJSON(similarFiles);
    return similarFiles;
}
exports.findSimilarFiles = findSimilarFiles;
/**
 * Preprocesses and generates embeddings for all project files.
 * Implements caching to avoid regenerating embeddings for unchanged files.
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
        logger_1.default.log(`Number of project files to preprocess: ${Object.keys(projectFiles).length}`);
        const embeddings = loadFileEmbeddings();
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
        let embeddingsUpdated = false;
        for (const [filePath, content] of Object.entries(projectFiles)) {
            processedFiles++;
            logger_1.default.log(`Processing file ${processedFiles}/${totalFiles}: ${filePath}`);
            // Check if embedding already exists to avoid redundant API calls
            if (embeddings[filePath]) {
                // Optionally, implement a file hash check to ensure the file hasn't changed
                logger_1.default.log(`Skipping embedding for ${filePath} as it already exists.`);
                continue;
            }
            const embedding = yield generateEmbedding(content);
            if (embedding.length > 0) {
                embeddings[filePath] = embedding;
                embeddingsUpdated = true;
                logger_1.default.log(`Embedding generated for ${filePath}`);
            }
            else {
                logger_1.default.log(`Failed to generate embedding for ${filePath}`);
            }
            vscode.window.showInformationMessage(`Processed file (${processedFiles}/${totalFiles}): ${filePath}`);
        }
        if (embeddingsUpdated) {
            logger_1.default.log('Saving generated embeddings.');
            saveFileEmbeddings(embeddings);
        }
        else {
            vscode.window.showInformationMessage('No new embeddings were generated.');
            logger_1.default.log('No new embeddings were generated.');
        }
    });
}
exports.preprocessEmbeddings = preprocessEmbeddings;
//# sourceMappingURL=embeddingService.js.map