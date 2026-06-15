class OpenAIProvider extends AIProvider {
    constructor(apiKey, modelName, baseUrl) {
        super(apiKey);
        this.model = modelName;
        this.baseUrl = baseUrl ? baseUrl.replace(/\/+$/, '') : 'https://api.openai.com/v1';

        if (this.baseUrl.endsWith('/chat/completions')) {
            this.apiUrl = this.baseUrl;
        } else {
            this.apiUrl = `${this.baseUrl}/chat/completions`;
        }
    }

    async summarizeText(text, systemPrompt) {
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text },
            ],
            temperature: 0.3,
        };

        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: headers,
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

            if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
                return data.choices[0].message.content;
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
