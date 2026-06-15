function getSystemPrompt(outputLangPreference, browserLang) {
    const headerTags = browser.i18n.getMessage('promptTags') || 'Tags:';
    const headerSummary = browser.i18n.getMessage('promptSummary') || '### Brief Summary';
    const headerKeyPoints = browser.i18n.getMessage('promptKeyPoints') || '### Key Points';
    const headerSources = browser.i18n.getMessage('promptSources') || '### Relevant Sources';
    const headerWarning = browser.i18n.getMessage('promptQualityWarning') || 'Quality Warning:';
    const noSources = browser.i18n.getMessage('promptNoSources') || 'No specific sources mentioned.';

    const prompt = `Generate an output exactly matching the following Markdown structure. Do not use any other sections, only these.

# [Article Title]
> ⚠️ **${headerWarning}** [If the article is clickbait, shallow SEO spam, or fluffy based on the rules below, provide a 1-sentence warning here. If the article is high-quality, DO NOT output this line or any blockquote at all!]
${headerTags} #tag1, #tag2, #tag3
${headerSummary}
[One brief paragraph summarizing the main idea]
${headerKeyPoints}
- [Key point 1]
- [Key point 2]
- [Key point 3]
${headerSources}
[List of names, authors, and their corresponding hyperlinks as Markdown links e.g., [Author Name](https://example.com). You MUST extract and use the actual real URLs from the provided text. If none are present, output exactly: "${noSources}"]

CRITICAL QUALITY EVALUATION RULES:
1. Anti-clickbait & sentiment: Identify emotional language, outrage-bait, and clickbait headlines.
2. Technical signal-to-noise: Identify shallow 'hello-world' tutorials and AI-generated SEO spam.
3. Paywall handling: If the original text is behind a hard paywall, note this.
4. Fluff reduction: Ignore journalistic fluff and long introductions, focus exclusively on extracting hard data, facts, and technical details for the summary.
If the article violates rules 1, 2, or 3, you MUST output the "> ⚠️ **${headerWarning}**" blockquote at the top. Otherwise, omit it entirely.

CRITICAL FINAL INSTRUCTION:
${
    outputLangPreference === 'browser'
        ? `You MUST generate the ENTIRE output in the following language (specified by ISO code): ${browserLang}`
        : `You MUST generate the ENTIRE output in the PRIMARY ORIGINAL LANGUAGE of the provided article text.`
}
`;

    return prompt;
}

async function summarizeTab(tab) {
    if (!tab || !tab.id) return;

    if (
        tab.url &&
        (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://') || tab.url.startsWith('view-source:'))
    ) {
        const msg = browser.i18n.getMessage('bgSystemPageWarning') || 'Scutter Skim: Cannot run on system pages.';
        console.warn(msg);
        return;
    }

    try {
        // 1. Inject libraries for UI rendering safely
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['lib/marked.min.js', 'lib/purify.min.js'],
        });

        // 2. Inject UI and Extractor (with Readability)
        const injectionResults = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/ui.js', 'lib/Readability.js', 'content/extractor.js'],
        });

        const pageText = injectionResults[0]?.result;

        if (!pageText || pageText.trim().length === 0) {
            throw new Error(browser.i18n.getMessage('bgErrorNoText') || 'The page does not contain any meaningful text to summarize.');
        }

        // 3. Load configuration
        const aiProviderStr = (await browser.storage.local.get(['aiProvider'])).aiProvider || 'gemini';
        const apiKeyKey = `${aiProviderStr}ApiKey`;
        const modelKey = `${aiProviderStr}Model`;
        const baseUrlKey = `${aiProviderStr}BaseUrl`;

        const keysToLoad = [apiKeyKey, modelKey, baseUrlKey, 'outputLang'];
        if (aiProviderStr === 'gemini') keysToLoad.push('apiKey', 'aiModel');

        const storage = await browser.storage.local.get(keysToLoad);

        let apiKey = storage[apiKeyKey];
        let modelName = storage[modelKey];
        let baseUrl = storage[baseUrlKey];

        if (aiProviderStr === 'gemini') {
            if (!apiKey && storage.apiKey) apiKey = storage.apiKey;
            if (!modelName && storage.aiModel) modelName = storage.aiModel;
        }

        if (!apiKey && aiProviderStr !== 'ollama') {
            throw new Error(browser.i18n.getMessage('bgErrorNoKey') || 'Missing API key.');
        }

        // 4. Initialize Provider
        let provider;
        if (aiProviderStr === 'gemini') {
            provider = new GeminiProvider(apiKey, modelName || 'gemini-3.1-flash-lite');
        } else if (aiProviderStr === 'anthropic') {
            provider = new AnthropicProvider(apiKey, modelName || 'claude-3-haiku-20240307');
        } else if (aiProviderStr === 'openai') {
            provider = new OpenAIProvider(apiKey, modelName || 'gpt-4o-mini', baseUrl || 'https://api.openai.com/v1');
        } else if (aiProviderStr === 'groq') {
            provider = new OpenAIProvider(apiKey, modelName || 'llama3-8b-8192', baseUrl || 'https://api.groq.com/openai/v1');
        } else if (aiProviderStr === 'deepseek') {
            provider = new OpenAIProvider(apiKey, modelName || 'deepseek-chat', baseUrl || 'https://api.deepseek.com');
        } else if (aiProviderStr === 'together') {
            provider = new OpenAIProvider(apiKey, modelName || 'meta-llama/Llama-3-8b-chat-hf', baseUrl || 'https://api.together.xyz/v1');
        } else if (aiProviderStr === 'ollama') {
            provider = new OpenAIProvider(apiKey || 'ollama', modelName || 'llama3', baseUrl || 'http://localhost:11434/v1');
        } else {
            throw new Error(browser.i18n.getMessage('bgErrorUnsupported') || 'Unsupported AI provider.');
        }

        // 5. Send to AI
        const outputLangPreference = storage.outputLang || 'article';
        const browserLang = browser.i18n.getUILanguage();
        const systemPrompt = getSystemPrompt(outputLangPreference, browserLang);

        let resultMarkdown;
        try {
            resultMarkdown = await provider.summarizeText(pageText, systemPrompt);
        } catch (error) {
            const errMsg = error.message.toLowerCase();
            if (errMsg.includes('429') && !errMsg.includes('quota') && !errMsg.includes('billing')) {
                console.warn('Scutter Skim: 429 error encountered. Truncating text and retrying...');
                // Fallback to truncated text (about 45k chars for base text + links up to 60k)
                const truncatedText = pageText.substring(0, 60000);
                if (truncatedText.length < pageText.length) {
                    resultMarkdown = await provider.summarizeText(truncatedText, systemPrompt);
                } else {
                    throw error;
                }
            } else {
                throw error;
            }
        }

        // 6. Send the result back to the UI script
        await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: (markdown) => {
                if (window.scutterSkimUI) {
                    window.scutterSkimUI.updateContent(markdown);
                }
            },
            args: [resultMarkdown],
        });
    } catch (error) {
        console.error('Scutter Skim Error:', error);

        // Attempt to show error message in the injected UI
        try {
            await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: (errorMessage) => {
                    if (window.scutterSkimUI) {
                        window.scutterSkimUI.showError(errorMessage);
                    }
                },
                args: [error.message],
            });
        } catch (injectError) {
            console.error(browser.i18n.getMessage('bgErrorUIShow') || 'Scutter Skim: Cannot display error in UI.', injectError);
        }
    }
}

browser.action.onClicked.addListener(summarizeTab);

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'trigger_summarize' && sender.tab) {
        summarizeTab(sender.tab)
            .then(() => sendResponse({ status: 'started' }))
            .catch((e) => sendResponse({ error: e.message }));
        return true; // indicates asynchronous response
    } else if (message.action === 'load_models') {
        loadModelsFromAPI(message).then(sendResponse);
        return true; // indicates asynchronous response
    }
});

async function loadModelsFromAPI({ provider, apiKey, baseUrl }) {
    try {
        let url = '';
        let headers = {};

        if (provider === 'gemini') {
            url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'API error');
            const generateModels = (data.models || []).filter((m) => m.supportedGenerationMethods?.includes('generateContent'));
            return {
                models: generateModels.map((m) => {
                    const shortName = m.name.replace('models/', '');
                    return { id: shortName, name: `${m.displayName} (${shortName})` };
                }),
            };
        } else if (['openai', 'groq', 'deepseek', 'together', 'ollama'].includes(provider)) {
            const base = baseUrl
                ? baseUrl.replace(/\/+$/, '')
                : provider === 'openai'
                  ? 'https://api.openai.com/v1'
                  : provider === 'groq'
                    ? 'https://api.groq.com/openai/v1'
                    : provider === 'deepseek'
                      ? 'https://api.deepseek.com'
                      : provider === 'together'
                        ? 'https://api.together.xyz/v1'
                        : 'http://localhost:11434/v1';
            url = `${base}/models`;
            if (apiKey && provider !== 'ollama') headers['Authorization'] = `Bearer ${apiKey}`;
            const res = await fetch(url, { headers });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error?.message || 'API error');
            return { models: (data.data || []).map((m) => ({ id: m.id, name: m.id })) };
        } else if (provider === 'anthropic') {
            // Anthropic doesn't have a models endpoint, provide static list
            return {
                models: [
                    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
                    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
                ],
            };
        }
        throw new Error('Unsupported provider for loading models');
    } catch (e) {
        return { error: e.message };
    }
}

// Automatically open the options page on first install if not configured
browser.runtime.onInstalled.addListener(async (details) => {
    browser.contextMenus.create({
        id: 'scutter-skim-summarize',
        title: browser.i18n.getMessage('contextMenuSummarize') || 'Summarize with Scutter Skim',
        contexts: ['all'],
    });

    if (details.reason === 'install') {
        const storage = await browser.storage.local.get(['apiKey']);
        if (!storage.apiKey) {
            browser.runtime.openOptionsPage();
        }
    }
});
