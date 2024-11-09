"use strict";
// src/extension.ts
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
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const webview_1 = require("./webview");
const embeddingService_1 = require("./embeddingService");
const logger_1 = __importDefault(require("./logger"));
/**
 * Activates the Navicode extension.
 * @param context The extension context.
 */
function activate(context) {
    logger_1.default.log('Ok. Activating Navicode extension.');
    const openPromptDisposable = vscode.commands.registerCommand('navicode.openPrompt', () => {
        logger_1.default.log('Command "navicode.openPrompt" invoked.');
        (0, webview_1.showWebview)(context);
    });
    const preprocessEmbeddingsDisposable = vscode.commands.registerCommand('navicode.preprocessEmbeddings', () => __awaiter(this, void 0, void 0, function* () {
        logger_1.default.log('Command "navicode.preprocessEmbeddings" invoked.');
        yield (0, embeddingService_1.preprocessEmbeddings)();
        vscode.window.showInformationMessage('File embeddings have been preprocessed.');
        logger_1.default.log('File embeddings have been preprocessed.');
    }));
    context.subscriptions.push(openPromptDisposable);
    context.subscriptions.push(preprocessEmbeddingsDisposable);
    logger_1.default.log('Navicode extension activated successfully.');
}
exports.activate = activate;
/**
 * Deactivates the Navicode extension.
 */
function deactivate() {
    logger_1.default.log('Deactivating Navicode extension.');
    // Perform any necessary cleanup here
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map