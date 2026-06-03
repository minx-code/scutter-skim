function getSystemPrompt(outputLangPreference, browserLang) {
    const tagsStr = browser.i18n.getMessage('promptTags') || 'Tags:';
    const sumStr = browser.i18n.getMessage('promptSummary') || '### Brief Summary';
    const keyStr = browser.i18n.getMessage('promptKeyPoints') || '### Key Points';
    const srcStr = browser.i18n.getMessage('promptSources') || '### Relevant Sources';
    const noSrcStr = browser.i18n.getMessage('promptNoSources') || 'No specific sources mentioned.';
    const warnStr = browser.i18n.getMessage('promptQualityWarning') || 'Quality Warning:';

    let prompt = `Generate an output exactly matching the following Markdown structure. Do not use any other sections, only these.
If the summary language is different from the headers below, you MUST TRANSLATE these headers into the summary language.

# [Article Title]
> ⚠️ **${warnStr}** [If the article is clickbait, shallow SEO spam, or fluffy based on the rules below, provide a 1-sentence warning here. If the article is high-quality, DO NOT output this line or any blockquote at all!]
${tagsStr} #tag1, #tag2, #tag3
${sumStr}
[One brief paragraph summarizing the main idea]
${keyStr}
- [Key point 1]
- [Key point 2]
- [Key point 3]
${srcStr}
[List of names, authors, and their corresponding hyperlinks as Markdown links e.g., [Author Name](https://example.com). You MUST extract and use the actual real URLs from the provided text. If none are present, output exactly the translated equivalent of: "${noSrcStr}"]

CRITICAL QUALITY EVALUATION RULES:
1. Anti-clickbait & sentiment: Identify emotional language, outrage-bait, and clickbait headlines.
2. Technical signal-to-noise: Identify shallow 'hello-world' tutorials and AI-generated SEO spam.
3. Paywall handling: If the original text is behind a hard paywall, note this.
4. Fluff reduction: Ignore journalistic fluff and long introductions, focus exclusively on extracting hard data, facts, and technical details for the summary.
If the article violates rules 1, 2, or 3, you MUST output the "> ⚠️ **${warnStr}**" blockquote at the top. Otherwise, omit it entirely.
`;
    if (outputLangPreference === 'browser') {
        prompt += `\n\nCRITICAL INSTRUCTION: You MUST generate the entire summary (including the translated section headers) in the following language (specified by ISO code): ${browserLang}`;
    } else {
        prompt += `\n\nCRITICAL INSTRUCTION: You MUST generate the entire summary (including the translated section headers) in the primary original language of the provided article text.`;
    }

    return prompt;
}

async function summarizeTab(tab) {
    if (
        !tab.url ||
        tab.url.startsWith('chrome://') ||
        tab.url.startsWith('about:') ||
        tab.url.startsWith('moz-extension://') ||
        tab.url.startsWith('view-source:')
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

        // 2. Inject UI and Extractor
        const injectionResults = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/ui.js', 'content/extractor.js'],
        });

        const pageText = injectionResults[0]?.result;

        if (!pageText || pageText.trim().length === 0) {
            throw new Error(browser.i18n.getMessage('bgErrorNoText') || 'The page does not contain any meaningful text to summarize.');
        }

        // 3. Load configuration
        const storage = await browser.storage.local.get(['aiProvider', 'apiKey', 'aiModel', 'outputLang']);

        if (!storage.apiKey) {
            throw new Error(browser.i18n.getMessage('bgErrorNoKey') || 'Missing API key.');
        }

        // 4. Initialize Provider
        let provider;
        const modelName = storage.aiModel || 'gemini-3.1-flash-lite';
        if (!storage.aiProvider || storage.aiProvider === 'gemini') {
            provider = new GeminiProvider(storage.apiKey, modelName);
        } else {
            throw new Error(browser.i18n.getMessage('bgErrorUnsupported') || 'Unsupported AI provider.');
        }

        // 5. Send to AI
        const outputLangPreference = storage.outputLang || 'article';
        const browserLang = browser.i18n.getUILanguage();
        const systemPrompt = getSystemPrompt(outputLangPreference, browserLang);

        const resultMarkdown = await provider.summarizeText(pageText, systemPrompt);

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

browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'trigger_summarize' && sender.tab) {
        summarizeTab(sender.tab);
    }
});

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
