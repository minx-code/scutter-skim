class AnthropicProvider extends AIProvider {
    constructor(apiKey, modelName) {
        super(apiKey);
        this.model = modelName;
        this.apiUrl = `https://api.anthropic.com/v1/messages`;
    }

    async summarizeText(text, systemPrompt) {
        const payload = {
            model: this.model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: text }],
            temperature: 0.3,
        };

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerously-allow-browser': 'true',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorAuthUnauthorized') : null) ||
                            'Authentication Error: Unauthorized access. Check your API key.',
                    );
                } else if (response.status === 429) {
                    const localMsg =
                        (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorRateLimit') : null) ||
                        'Rate limit exceeded (429). Please try again later.';
                    const apiMsg = data.error?.message || '';
                    throw new Error(apiMsg ? `${localMsg}\nAPI Details: ${apiMsg}` : localMsg);
                } else {
                    const aiServiceErr = (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorAIService') : null) || 'AI Service Error: ';
                    throw new Error(`${aiServiceErr}${data.error?.message || response.statusText}`);
                }
            }

            if (data.content && data.content.length > 0 && data.content[0].text) {
                return data.content[0].text;
            } else {
                throw new Error((typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorNoValidText') : null) || 'AI returned no valid text.');
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error(
                    (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorNetwork') : null) || 'Network Error: Cannot connect to AI service.',
                );
            }
            throw error;
        }
    }
}
