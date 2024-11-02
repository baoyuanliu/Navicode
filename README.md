# Navicode

Navicode is a VS Code extension that integrates GPT API, enabling developers to navigate projects with AI-assisted insights. The extension can suggest relevant files, provide code samples, and help with project understanding.

## Features

- Input a prompt to query GPT.
- Browse the relevant project files GPT identifies.
- Select which files to include in the prompt for analysis.
- Outputs formatted responses with syntax-highlighted code snippets.

## Configuration

Navicode has the following setting:

- `navicode.apiKey`: Your GPT API key.

## Usage

1. **Open Command Palette**: Press `Ctrl+Shift+P` or `Cmd+Shift+P` (Mac).
2. **Run Navicode Command**: Type `Navicode: Open Navicode Prompt`.
3. **Enter Prompt and Select Model**: Follow the prompts to input your query and choose a model.
4. **Browse Suggested Files**: Select which files you want to include in the analysis.
5. **View GPT Output**: View formatted responses, including syntax-highlighted code snippets.

## Installation

To install Navicode locally:
1. Run `vsce package` to package the extension into a `.vsix` file.
2. In VS Code, go to Extensions view > `...` > Install from VSIX.
3. Select the `.vsix` file to install.

For more information, see the [documentation](https://code.visualstudio.com/api).
