// src/types.ts

/**
 * Represents the dependency graph where each key is a file and the value is an array of files it depends on.
 */
export interface DependencyGraph {
    [file: string]: string[];
}

/**
 * Represents the supported GPT models.
 */
export type SupportedModel =
    | 'gpt-4o'
    | 'o1-preview'
    | 'o1-mini'
    | 'gpt-3.5-turbo'
    | 'gpt-4';

/**
 * Represents the response from GPT API.
 */
export interface GPTResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
            refusal?: any;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
        prompt_tokens_details: {
            cached_tokens: number;
        };
        completion_tokens_details: {
            reasoning_tokens: number;
        };
    };
    system_fingerprint: string;
}

/**
 * Represents the embeddings for each file.
 */
export interface FileEmbeddings {
    [filePath: string]: number[];
}

/**
 * Represents the structure of an error response from OpenAI API.
 */
export interface OpenAIErrorResponse {
    error: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
}

/**
 * Represents a chat message in the format expected by the GPT API.
 */
export interface ChatCompletionRequestMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/**
 * Represents a single chat history entry.
 */
export interface ChatHistoryEntry {
    prompt: string;
    model: SupportedModel;
    response: string;
    timestamp: string;
}
