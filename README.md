# Navicode VSCode Extension

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Repository](https://img.shields.io/badge/repository-GitHub-blue.svg)](https://github.com/yourusername/navicode)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)
- [Repository](#repository)
- [Troubleshooting](#troubleshooting)

## Overview

Navicode is a powerful Visual Studio Code extension designed to enhance your development workflow by providing advanced dependency analysis and semantic search capabilities. Leveraging tools like Madge for dependency graph generation and OpenAI's Embedding API for semantic understanding, Navicode helps you navigate and manage your codebase more efficiently.

## Features

- **Dependency Analysis**: Generate detailed dependency graphs for your project to understand module interconnections.
- **Embedding Generation**: Create and manage embeddings for your project files to enable semantic search and related functionalities.
- **Webview Interface**: Interact with prompts, select files, and view chat history through an intuitive webview UI.
- **Error Handling & Logging**: Comprehensive logging and error handling to ensure smooth operation and easy debugging.
- **Chat History**: Maintain a history of your interactions for reference and continuity.

## Installation

1. **Prerequisites**:
   - Ensure you have [Node.js](https://nodejs.org/) installed.
   - Install [Visual Studio Code](https://code.visualstudio.com/).

2. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/navicode.git
3. **Navigate to the Project Directory**:
   ```bash
   cd navicode
4. **Install Dependencies**:
   ```bash
   npm install

5. **Build the Extension**:
   ```bash
   npm run build

Usage
Generate Dependency Graph:

The extension automatically analyzes your project's dependencies upon activation.
Check the Output panel in VSCode for the generated dependency graph logs.
Generate and Manage Embeddings:

Use the command palette (Ctrl+Shift+P or Cmd+Shift+P) and run the Preprocess Embeddings command.
This will generate embeddings for your project files and save them for semantic search.
Interact via Webview:

Open the Navicode webview panel from the sidebar.
Enter your prompt, select the desired GPT model, and interact with your codebase.
Select relevant files to include in your queries and view responses directly within VSCode.
View Chat History:

Access your interaction history within the webview to review past prompts and responses.
Configuration
API Key Setup:

Obtain an API key from OpenAI.
Set your API key in the extension's settings or through environment variables as per the utils module.
File Extensions:

Customize included or excluded file extensions in the utils module to tailor the dependency analysis and embedding generation to your project's needs.