"use strict";
// src/webview.ts
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
exports.showWebview = void 0;
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils");
const apiClient_1 = require("./apiClient");
const logger_1 = __importDefault(require("./logger"));
const historyService_1 = require("./historyService");
/**
 * Displays the webview UI.
 * @param context The extension context.
 */
function showWebview(context) {
    const panel = vscode.window.createWebviewPanel('navicodePrompt', 'Navicode Prompt', vscode.ViewColumn.One, {
        enableScripts: true,
        retainContextWhenHidden: true
    });
    panel.webview.html = getWebviewContent();
    panel.webview.onDidReceiveMessage((message) => __awaiter(this, void 0, void 0, function* () {
        switch (message.command) {
            case 'sendPrompt':
                yield handleSendPrompt(message.prompt, message.model, panel);
                break;
            case 'sendSelectedFiles':
                yield handleSendSelectedFiles(message.prompt, message.model, message.files, panel);
                break;
            case 'requestHistory':
                yield handleRequestHistory(panel);
                break;
            default:
                break;
        }
    }), undefined, context.subscriptions);
}
exports.showWebview = showWebview;
/**
 * Returns the HTML content for the webview.
 * @returns The HTML string.
 */
function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Navicode Prompt</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    padding: 20px; 
                    background-color: #f0f2f5;
                    color: #333;
                }
                h2, h3 {
                    color: #007acc;
                }
                textarea { 
                    width: 100%; 
                    height: 100px; 
                    padding: 10px; 
                    border: 1px solid #ccc; 
                    border-radius: 4px; 
                    resize: vertical;
                    font-size: 14px;
                }
                select {
                    width: 100%;
                    padding: 10px;
                    margin-top: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .output { 
                    margin-top: 20px; 
                    background-color: #fff; 
                    padding: 15px; 
                    border-radius: 4px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    overflow-y: auto;
                }
                .files { 
                    margin-top: 20px; 
                    background-color: #fff; 
                    padding: 15px; 
                    border-radius: 4px; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                #jstree {
                    max-height: 300px;
                    overflow-y: auto;
                }
                button { 
                    margin-top: 10px; 
                    padding: 10px 20px; 
                    background-color: #007acc; 
                    color: #fff; 
                    border: none; 
                    border-radius: 4px; 
                    cursor: pointer; 
                    font-size: 14px; 
                    position: relative;
                }
                button:hover { 
                    background-color: #005fa3; 
                }
                .loading {
                    display: none;
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    border: 8px solid #f3f3f3;
                    border-top: 8px solid #007acc;
                    border-radius: 50%;
                    width: 60px;
                    height: 60px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                /* Prism.js styling */
                /* Minimal styling; for full themes, link to a Prism CSS file */
                .token.comment,
                .token.prolog,
                .token.doctype,
                .token.cdata {
                    color: slategray;
                }

                .token.punctuation {
                    color: #999;
                }

                .token.property,
                .token.tag,
                .token.boolean,
                .token.number,
                .token.constant,
                .token.symbol,
                .token.deleted {
                    color: #905;
                }

                .token.selector,
                .token.attr-name,
                .token.string,
                .token.char,
                .token.builtin,
                .token.inserted {
                    color: #690;
                }

                .token.operator,
                .token.entity,
                .token.url,
                .language-css .token.string,
                .style .token.string {
                    color: #9a6e3a;
                }

                .token.atrule,
                .token.attr-value,
                .token.function,
                .token.class-name {
                    color: #07a;
                }

                .token.keyword {
                    color: #07a;
                }

                .token.regex,
                .token.important {
                    color: #e90;
                }

                .token.important,
                .token.bold {
                    font-weight: bold;
                }
                .token.italic {
                    font-style: italic;
                }

                .token.entity {
                    cursor: help;
                }

                /* Copy Button Styling */
                .copy-button {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background-color: #007acc;
                    color: white;
                    border: none;
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                }
                .copy-button:hover {
                    background-color: #005fa3;
                }

                pre {
                    position: relative;
                }

                /* Markdown Styling */
                .markdown-body {
                    line-height: 1.6;
                }
                .markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4, .markdown-body h5, .markdown-body h6 {
                    margin-top: 1em;
                    margin-bottom: 0.5em;
                }
                .markdown-body p {
                    margin-bottom: 1em;
                }
                .markdown-body code {
                    background-color: #f5f5f5;
                    padding: 2px 4px;
                    border-radius: 4px;
                }
                .markdown-body pre {
                    background-color: #f5f5f5;
                    padding: 10px;
                    border-radius: 4px;
                    overflow-x: auto;
                }
                .markdown-body a {
                    color: #007acc;
                }

                /* History Section Styling */
                .history-section {
                    margin-top: 20px;
                    background-color: #fff;
                    padding: 15px;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .history-entry {
                    border-bottom: 1px solid #ccc;
                    padding: 10px 0;
                    cursor: pointer;
                }
                .history-entry:last-child {
                    border-bottom: none;
                }
                .history-entry:hover {
                    background-color: #f9f9f9;
                }
                .history-title {
                    font-weight: bold;
                    color: #007acc;
                }
                .history-date {
                    font-size: 12px;
                    color: #666;
                }
            </style>
            <link href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css" rel="stylesheet" />
            <!-- jsTree CSS -->
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/themes/default/style.min.css" />
        </head>
        <body>
            <h2>Enter your prompt:</h2>
            <textarea id="promptInput" placeholder="Type your prompt here..."></textarea>
            <h3>Select GPT Model:</h3>
            <select id="modelSelect">
                <option value="o1-mini">o1-mini</option>
                <option value="o1-preview">o1-preview</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
            </select>
            <div style="margin-top: 10px;">
                <button onclick="sendPrompt()">Send Prompt</button>
                <button onclick="startNewChat()" style="margin-left: 10px; background-color: #28a745;">Start New Chat</button>
            </div>
            <div class="loading" id="loading"></div>
            <div class="output markdown-body" id="output"></div>
            <div class="files" id="filesSection" style="display:none;">
                <h3>Select Files:</h3>
                <!-- jsTree container -->
                <div id="jstree"></div>
                <button onclick="sendSelectedFiles()">Send Selected Files</button>
            </div>
            <div class="history-section" id="historySection">
                <h3>Chat History:</h3>
                <div id="historyContainer"></div>
            </div>
            <!-- Load jQuery first -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
            <!-- Load jsTree after jQuery -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/jstree.min.js"></script>
            <!-- Load Prism.js -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
            <!-- Load Marked.js for Markdown Parsing -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/marked/4.3.0/marked.min.js"></script>
            <script>
                const vscode = acquireVsCodeApi();

                function showLoading() {
                    document.getElementById('loading').style.display = 'block';
                }

                function hideLoading() {
                    document.getElementById('loading').style.display = 'none';
                }

                async function sendPrompt() {
                    const prompt = document.getElementById('promptInput').value.trim();
                    const model = document.getElementById('modelSelect').value;
                    if (!prompt) {
                        alert('Please enter a prompt.');
                        return;
                    }
                    showLoading();
                    vscode.postMessage({ command: 'sendPrompt', prompt: prompt, model: model });
                }

                function startNewChat() {
                    if (confirm('Are you sure you want to start a new chat? This will clear the current prompt and output.')) {
                        document.getElementById('promptInput').value = '';
                        document.getElementById('output').innerHTML = '';
                        document.getElementById('filesSection').style.display = 'none';
                        // Optionally, you can also clear history or reset other UI elements here
                    }
                }

                function displayFiles(files) {
                    const filesSection = document.getElementById('filesSection');
                    const jstree = $('#jstree');
                    jstree.jstree('destroy'); // Destroy any existing tree
                    jstree.empty();

                    // Log the received files structure
                    console.log('Received files structure:', files);
                    vscode.postMessage({ command: 'logInWebview', message: 'Received files structure.' });

                    // Initialize jsTree with the hierarchical data
                    jstree.jstree({
                        'core': {
                            'data': transformToJsTreeData(files)
                        },
                        "plugins": ["checkbox"],
                        "checkbox": {
                            "keep_selected_style": false,
                            "three_state": false, // Prevent checking/unchecking children automatically
                            "cascade": 'undetermined'
                        }
                    });

                    filesSection.style.display = 'block';
                }

                /**
                 * Transforms the project structure into jsTree compatible format.
                 * @param data The hierarchical project structure data.
                 * @returns The transformed data.
                 */
                function transformToJsTreeData(data) {
                    if (!data) return [];
                    const result = [];

                    function traverse(node) {
                        if (node.type === 'folder') {
                            return {
                                "text": node.name,
                                "children": node.children ? node.children.map(child => traverse(child)).filter(child => child !== null) : [],
                                "state": { "opened": true }
                            };
                        } else {
                            return {
                                "text": node.name,
                                "icon": "jstree-file",
                                "li_attr": { "data-path": node.path },
                                "state": { "selected": node.isRelated || false }
                            };
                        }
                    }

                    if (data.type === 'folder') {
                        result.push(traverse(data));
                    }

                    return result;
                }

                async function sendSelectedFiles() {
                    const selectedNodes = $('#jstree').jstree("get_checked", true);
                    const selectedFiles = selectedNodes
                        .filter(node => node.icon === "jstree-file")
                        .map(node => node.li_attr['data-path']);
                    const prompt = document.getElementById('promptInput').value.trim();
                    const model = document.getElementById('modelSelect').value;
                    if (selectedFiles.length === 0) {
                        alert('Please select at least one file.');
                        return;
                    }
                    showLoading();
                    vscode.postMessage({ command: 'sendSelectedFiles', prompt: prompt, model: model, files: selectedFiles });
                }

                function displayOutput(output) {
                    const outputDiv = document.getElementById('output');
                    // Parse markdown to HTML
                    const html = marked.parse(output);
                    outputDiv.innerHTML = html;
                    Prism.highlightAll();

                    // Add copy buttons to each <pre> block
                    const preBlocks = outputDiv.querySelectorAll('pre');
                    preBlocks.forEach(pre => {
                        if (!pre.querySelector('.copy-button')) {
                            const copyButton = document.createElement('button');
                            copyButton.innerText = 'Copy';
                            copyButton.className = 'copy-button';
                            copyButton.onclick = () => {
                                const code = pre.querySelector('code');
                                if (code) {
                                    navigator.clipboard.writeText(code.innerText).then(() => {
                                        copyButton.innerText = 'Copied!';
                                        setTimeout(() => {
                                            copyButton.innerText = 'Copy';
                                        }, 2000);
                                    }).catch(err => {
                                        alert('Failed to copy: ' + err);
                                    });
                                }
                            };
                            pre.appendChild(copyButton);
                        }
                    });
                }

                function displayHistory(history) {
                    const historyContainer = document.getElementById('historyContainer');
                    historyContainer.innerHTML = ''; // Clear existing history

                    if (history.length === 0) {
                        historyContainer.innerHTML = '<p>No chat history available.</p>';
                        return;
                    }

                    history.forEach((entry, index) => {
                        const entryDiv = document.createElement('div');
                        entryDiv.className = 'history-entry';
                        entryDiv.dataset.index = index;

                        const titleDiv = document.createElement('div');
                        titleDiv.className = 'history-title';
                        titleDiv.innerText = entry.prompt.length > 50 ? entry.prompt.substring(0, 50) + '...' : entry.prompt;

                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'history-date';
                        dateDiv.innerText = new Date(entry.timestamp).toLocaleString();

                        entryDiv.appendChild(titleDiv);
                        entryDiv.appendChild(dateDiv);

                        entryDiv.onclick = () => {
                            loadHistoryEntry(entry);
                        };

                        historyContainer.appendChild(entryDiv);
                    });
                }

                function loadHistoryEntry(entry) {
                    document.getElementById('promptInput').value = entry.prompt;
                    document.getElementById('output').innerHTML = marked.parse(entry.response);
                    Prism.highlightAll();
                    document.getElementById('filesSection').style.display = 'none';
                }

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'displayFiles':
                            hideLoading();
                            displayFiles(message.files);
                            break;
                        case 'displayOutput':
                            hideLoading();
                            displayOutput(message.output);
                            break;
                        case 'displayError':
                            hideLoading();
                            alert(message.error);
                            break;
                        case 'displayHistory':
                            displayHistory(message.history);
                            break;
                        case 'logInWebview':
                            console.log(message.message);
                            break;
                    }
                });

                // Request history on load
                window.onload = () => {
                    vscode.postMessage({ command: 'requestHistory' });
                };
            </script>
            <!-- Load Prism.js and jQuery dependencies -->
        </body>
        </html>
    `;
}
/**
 * Handles the 'sendPrompt' message from the webview.
 * @param prompt The user's input prompt.
 * @param model The selected GPT model.
 * @param panel The webview panel.
 */
function handleSendPrompt(prompt, model, panel) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Attempt to find related files based on embeddings
            const relatedFiles = yield (0, apiClient_1.findAllRelatedFiles)(prompt, model);
            // Log the related files found
            logger_1.default.log('Related Files Found:');
            logger_1.default.logJSON(relatedFiles);
            const rootDir = (0, utils_1.getWorkspaceRoot)();
            if (!rootDir) {
                panel.webview.postMessage({ command: 'displayError', error: 'Workspace root not found.' });
                logger_1.default.log('Workspace root not found.');
                return;
            }
            const allProjectFiles = (0, utils_1.getProjectFiles)(rootDir, rootDir);
            const allFilesList = Object.keys(allProjectFiles);
            // Prepare a set for quick lookup
            const relatedFilesSet = new Set(relatedFiles);
            // Convert flat list to hierarchical structure with related files marked
            const projectStructure = (0, utils_1.getProjectStructure)(rootDir, rootDir);
            const hierarchicalData = markRelatedFiles(projectStructure, relatedFilesSet);
            // Log the hierarchical data being sent
            logger_1.default.log('Hierarchical Data to be Sent to Webview:');
            logger_1.default.logJSON(hierarchicalData);
            panel.webview.postMessage({ command: 'displayFiles', files: hierarchicalData });
            logger_1.default.log('Files sent to webview with related files pre-selected.');
        }
        catch (error) {
            vscode.window.showErrorMessage('An unexpected error occurred: ' + error.message);
            logger_1.default.log('An unexpected error occurred in handleSendPrompt: ' + error.message);
            panel.webview.postMessage({ command: 'displayError', error: 'An unexpected error occurred. Please check the logs.' });
        }
    });
}
/**
 * Marks related files in the project structure.
 * @param structure The complete project structure.
 * @param relatedFilesSet A set of related file paths.
 * @returns The project structure with related files marked.
 */
function markRelatedFiles(structure, relatedFilesSet) {
    if (!structure)
        return null;
    if (structure.type === 'file') {
        structure.isRelated = relatedFilesSet.has(structure.path);
        return structure;
    }
    if (structure.type === 'folder') {
        const children = structure.children
            .map((child) => markRelatedFiles(child, relatedFilesSet))
            .filter((child) => child !== null);
        if (children.length > 0) {
            return Object.assign(Object.assign({}, structure), { children: children });
        }
        else {
            return null;
        }
    }
    return null;
}
/**
 * Lists all files in the workspace excluding specified directories and binary files.
 * @returns A list of file paths.
 */
function listAllFiles() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = (0, utils_1.getWorkspaceRoot)();
        if (!rootDir) {
            logger_1.default.log('Workspace root not found.');
            return [];
        }
        const projectFiles = (0, utils_1.getProjectFiles)(rootDir, rootDir);
        const allFiles = Object.keys(projectFiles);
        // Log the number of files found
        logger_1.default.log(`Total Files Found: ${allFiles.length}`);
        return allFiles;
    });
}
/**
 * Handles the 'sendSelectedFiles' message from the webview.
 * @param prompt The user's input prompt.
 * @param model The selected GPT model.
 * @param selectedFiles The files selected by the user.
 * @param panel The webview panel.
 */
function handleSendSelectedFiles(prompt, model, selectedFiles, panel) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!selectedFiles || selectedFiles.length === 0) {
                panel.webview.postMessage({ command: 'displayError', error: 'No files selected.' });
                logger_1.default.log('No files selected by the user.');
                return;
            }
            const rootDir = (0, utils_1.getWorkspaceRoot)();
            if (!rootDir) {
                panel.webview.postMessage({ command: 'displayError', error: 'Workspace root not found.' });
                logger_1.default.log('Workspace root not found.');
                return;
            }
            const projectFiles = (0, utils_1.getProjectFiles)(rootDir, rootDir);
            const directoryStructure = (0, utils_1.getProjectStructure)(rootDir, rootDir);
            // Log the selected files before sending to GPT
            logger_1.default.log('Selected Files Before Sending to GPT:');
            logger_1.default.logJSON(selectedFiles);
            // Send the selected files along with the prompt to GPT
            const response = yield (0, apiClient_1.sendToGPTAPI)(prompt, model, directoryStructure, projectFiles, selectedFiles);
            if (response) {
                panel.webview.postMessage({ command: 'displayOutput', output: response });
                logger_1.default.log('Displayed GPT API response to the user.');
            }
            else {
                panel.webview.postMessage({ command: 'displayError', error: 'Failed to retrieve response from GPT.' });
                logger_1.default.log('Failed to retrieve response from GPT API.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage('An unexpected error occurred: ' + error.message);
            logger_1.default.log('An unexpected error occurred in handleSendSelectedFiles: ' + error.message);
            panel.webview.postMessage({ command: 'displayError', error: 'An unexpected error occurred. Please check the logs.' });
        }
    });
}
/**
 * Handles the 'requestHistory' message from the webview.
 * @param panel The webview panel.
 */
function handleRequestHistory(panel) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const history = (0, historyService_1.getChatHistory)();
            panel.webview.postMessage({ command: 'displayHistory', history: history });
            logger_1.default.log('Chat history sent to webview.');
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to retrieve chat history.');
            logger_1.default.log('Failed to retrieve chat history: ' + error.message);
            panel.webview.postMessage({ command: 'displayError', error: 'Failed to retrieve chat history. Please check the logs.' });
        }
    });
}
//# sourceMappingURL=webview.js.map