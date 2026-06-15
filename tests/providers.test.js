const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert');

const vm = require('vm');

// Mock browser API
global.browser = {
    i18n: { getMessage: (msg) => msg },
};

// Use vm to share global context
const context = vm.createContext(global);

// Load classes directly since they are not modules
const loadClass = (filename) => {
    const code = fs.readFileSync(path.join(__dirname, '../services', filename), 'utf-8');
    vm.runInContext(code, context);
};

loadClass('ai-provider.js');
loadClass('openai-provider.js');
loadClass('anthropic-provider.js');
loadClass('gemini-provider.js');

vm.runInContext('global.OpenAIProvider = OpenAIProvider; global.AnthropicProvider = AnthropicProvider; global.GeminiProvider = GeminiProvider;', context);

const OpenAIProvider = context.OpenAIProvider;
const AnthropicProvider = context.AnthropicProvider;
const GeminiProvider = context.GeminiProvider;

test('OpenAIProvider standard request formatting', async () => {
    let fetchCalled = false;
    global.fetch = async (url, options) => {
        fetchCalled = true;
        assert.strictEqual(url, 'https://api.openai.com/v1/chat/completions');
        assert.strictEqual(options.headers['Authorization'], 'Bearer test-key');

        const body = JSON.parse(options.body);
        assert.strictEqual(body.model, 'gpt-4o');
        assert.strictEqual(body.messages[1].content, 'my text');

        return {
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Success summary' } }] }),
        };
    };

    const provider = new OpenAIProvider('test-key', 'gpt-4o');
    const result = await provider.summarizeText('my text', 'sys prompt');
    assert.strictEqual(result, 'Success summary');
    assert.ok(fetchCalled);
});

test('OpenAIProvider custom base URL (Ollama)', async () => {
    let fetchCalled = false;
    global.fetch = async (url, options) => {
        fetchCalled = true;
        assert.strictEqual(url, 'http://localhost:11434/v1/chat/completions');
        return {
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Local summary' } }] }),
        };
    };

    // Ollama does not need API key, but we pass "ollama" by default in background.js
    const provider = new OpenAIProvider('ollama', 'llama3', 'http://localhost:11434/v1');
    const result = await provider.summarizeText('my text', 'sys prompt');
    assert.strictEqual(result, 'Local summary');
    assert.ok(fetchCalled);
});

test('AnthropicProvider request formatting', async () => {
    let fetchCalled = false;
    global.fetch = async (url, options) => {
        fetchCalled = true;
        assert.strictEqual(url, 'https://api.anthropic.com/v1/messages');
        assert.strictEqual(options.headers['x-api-key'], 'anthropic-key');
        assert.strictEqual(options.headers['anthropic-version'], '2023-06-01');

        const body = JSON.parse(options.body);
        assert.strictEqual(body.model, 'claude-3-haiku');
        assert.strictEqual(body.system, 'sys prompt');
        assert.strictEqual(body.messages[0].content, 'my text');

        return {
            ok: true,
            json: async () => ({ content: [{ text: 'Anthropic summary' }] }),
        };
    };

    const provider = new AnthropicProvider('anthropic-key', 'claude-3-haiku');
    const result = await provider.summarizeText('my text', 'sys prompt');
    assert.strictEqual(result, 'Anthropic summary');
    assert.ok(fetchCalled);
});

test('GeminiProvider request formatting', async () => {
    let fetchCalled = false;
    global.fetch = async (url, options) => {
        fetchCalled = true;
        assert.strictEqual(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=gemini-key');

        const body = JSON.parse(options.body);
        assert.strictEqual(body.system_instruction.parts[0].text, 'sys prompt');
        assert.strictEqual(body.contents[0].parts[0].text, 'my text');

        return {
            ok: true,
            json: async () => ({ candidates: [{ content: { parts: [{ text: 'Gemini summary' }] } }] }),
        };
    };

    const provider = new GeminiProvider('gemini-key', 'gemini-1.5-flash');
    const result = await provider.summarizeText('my text', 'sys prompt');
    assert.strictEqual(result, 'Gemini summary');
    assert.ok(fetchCalled);
});

test('Provider error handling', async () => {
    global.fetch = async () => {
        return {
            ok: false,
            status: 401,
            json: async () => ({ error: { message: 'Invalid token' } }),
        };
    };

    const provider = new OpenAIProvider('bad-key', 'gpt-4o');
    await assert.rejects(
        async () => await provider.summarizeText('my text', 'sys prompt'),
        (err) => err.message.includes('bgErrorAuthUnauthorized') || err.message.includes('Authentication Error'),
    );
});
