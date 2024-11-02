"use strict";
// src/dependencyAnalyzer.ts
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
exports.generateDependencyGraph = void 0;
const madge_1 = __importDefault(require("madge"));
const vscode = __importStar(require("vscode"));
const utils_1 = require("./utils"); // Added import for getIncludedFileExtensions
const logger_1 = __importDefault(require("./logger"));
/**
 * Generates a dependency graph for the project using Madge.
 * @returns The dependency graph as an object.
 */
function generateDependencyGraph() {
    return __awaiter(this, void 0, void 0, function* () {
        const rootDir = (0, utils_1.getWorkspaceRoot)();
        if (!rootDir) {
            vscode.window.showErrorMessage('Cannot determine workspace root for dependency analysis.');
            logger_1.default.log('Cannot determine workspace root for dependency analysis.');
            return {};
        }
        try {
            vscode.window.showInformationMessage('Analyzing project dependencies...');
            logger_1.default.log('Analyzing project dependencies...');
            const result = yield (0, madge_1.default)(rootDir, {
                fileExtensions: (0, utils_1.getIncludedFileExtensions)(),
                excludeRegExp: [/node_modules/, /\.test\./, /\.spec\./],
            });
            const dependencyGraph = result.obj();
            logger_1.default.log('Dependency Graph:');
            logger_1.default.logJSON(dependencyGraph);
            vscode.window.showInformationMessage('Dependency analysis completed.');
            return dependencyGraph;
        }
        catch (error) {
            vscode.window.showErrorMessage('Error generating dependency graph.');
            console.error('Dependency Analysis Error:', error);
            logger_1.default.log('--- Dependency Analysis Error ---');
            logger_1.default.log(error.toString());
            return {};
        }
    });
}
exports.generateDependencyGraph = generateDependencyGraph;
//# sourceMappingURL=dependencyAnalyzer.js.map