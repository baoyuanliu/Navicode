"use strict";
// src/historyService.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearChatHistory = exports.getChatHistory = exports.addChatHistory = exports.initializeHistory = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const utils_1 = require("./utils");
const logger_1 = __importDefault(require("./logger"));
/**
 * Manages chat history for the Navicode extension.
 */
const HISTORY_FILE_NAME = 'chat-history.json';
const MAX_HISTORY_ENTRIES = 10;
let history = [];
let historyFilePath = '';
/**
 * Initializes the history service by loading existing history or creating a new history file.
 * @param context The extension context.
 */
function initializeHistory(context) {
    const rootDir = (0, utils_1.getWorkspaceRoot)();
    if (!rootDir) {
        logger_1.default.log('Workspace root not found. History will not be initialized.');
        return;
    }
    const navicodeDir = path.join(rootDir, '.navicode');
    if (!fs.existsSync(navicodeDir)) {
        fs.mkdirSync(navicodeDir, { recursive: true });
        logger_1.default.log(`Created directory for history: ${navicodeDir}`);
    }
    historyFilePath = path.join(navicodeDir, HISTORY_FILE_NAME);
    if (fs.existsSync(historyFilePath)) {
        try {
            const data = fs.readFileSync(historyFilePath, 'utf-8');
            history = JSON.parse(data);
            logger_1.default.log(`Loaded existing chat history from ${historyFilePath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage('Error loading chat history.');
            logger_1.default.log('--- Error Loading Chat History ---');
            logger_1.default.log(error.toString());
            history = [];
        }
    }
    else {
        history = [];
        saveHistory();
        logger_1.default.log('Initialized new chat history.');
    }
}
exports.initializeHistory = initializeHistory;
/**
 * Adds a new entry to the chat history and saves it.
 * @param entry The chat history entry to add.
 */
function addChatHistory(entry) {
    history.unshift(entry);
    if (history.length > MAX_HISTORY_ENTRIES) {
        history.pop();
    }
    saveHistory();
}
exports.addChatHistory = addChatHistory;
/**
 * Retrieves the current chat history.
 * @returns An array of chat history entries.
 */
function getChatHistory() {
    return history;
}
exports.getChatHistory = getChatHistory;
/**
 * Saves the chat history to the history file.
 */
function saveHistory() {
    try {
        fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2), 'utf-8');
        logger_1.default.log('Chat history saved successfully.');
    }
    catch (error) {
        vscode.window.showErrorMessage('Error saving chat history.');
        logger_1.default.log('--- Error Saving Chat History ---');
        logger_1.default.log(error.toString());
    }
}
/**
 * Clears the chat history.
 */
function clearChatHistory() {
    history = [];
    saveHistory();
    logger_1.default.log('Chat history cleared.');
}
exports.clearChatHistory = clearChatHistory;
//# sourceMappingURL=historyService.js.map