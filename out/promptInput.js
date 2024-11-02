"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showPromptInput = void 0;
const vscode = require("vscode");
const utils_1 = require("./utils");
const apiClient_1 = require("./apiClient");
function showPromptInput() {
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = yield vscode.window.showInputBox({ prompt: 'Enter your prompt' });
        if (!prompt) {
            return;
        }
        const model = yield vscode.window.showQuickPick(['gpt-3.5-turbo', 'gpt-4'], { placeHolder: 'Select a model' });
        if (!model) {
            return;
        }
        const directoryStructure = (0, utils_1.getProjectStructure)();
        const projectFiles = (0, utils_1.getProjectFiles)();
        // Step 3: Ask GPT API for the files that may be involved and output them in JSON format
        const filesResponse = yield (0, apiClient_1.sendFilesRequestToGPT)(prompt, model, directoryStructure, projectFiles);
        if (!filesResponse) {
            return;
        }
        let involvedFiles;
        try {
            involvedFiles = JSON.parse(filesResponse);
        }
        catch (error) {
            vscode.window.showErrorMessage('Failed to parse JSON from GPT response.');
            return;
        }
        // Combine user prompt with involved files for the main request
        const combinedPrompt = `${prompt}\n\nInvolved Files:\n${JSON.stringify(involvedFiles, null, 2)}`;
        const response = yield (0, apiClient_1.sendToGPTAPI)(combinedPrompt, model, directoryStructure, projectFiles);
        if (response) {
            const formattedOutput = formatGPTOutput(response);
            displayOutput(formattedOutput);
        }
    });
}
exports.showPromptInput = showPromptInput;
function formatGPTOutput(response) {
    // Simple implementation to highlight code sections
    // Assumes that code sections are enclosed in triple backticks
    const html = response.split('```').map((part, index) => {
        if (index % 2 === 1) {
            // Code section
            return `<pre style="background-color:#f0f0f0; padding:10px; border-radius:5px;">${part}</pre>`;
        }
        else {
            // Regular text
            return `<p>${part}</p>`;
        }
    }).join('');
    return html;
}
function displayOutput(formattedOutput) {
    const panel = vscode.window.createWebviewPanel('gptOutput', 'GPT Output', vscode.ViewColumn.One, {});
    panel.webview.html = `
        <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; }
                    pre { background-color: #f0f0f0; padding: 10px; border-radius: 5px; }
                    p { margin: 10px 0; }
                </style>
            </head>
            <body>
                ${formattedOutput}
            </body>
        </html>
    `;
}
//# sourceMappingURL=promptInput.js.map