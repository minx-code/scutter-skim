class GeminiProvider extends AIProvider {
    constructor(apiKey, modelName = 'gemini-3.1-flash-lite') {
        super(apiKey);
        this.model = modelName;
        this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    }

    async summarizeText(text, systemPrompt) {
        const url = `${this.apiUrl}?key=${this.apiKey}`;

        const payload = {
            system_instruction: {
                parts: [{ text: systemPrompt }],
            },
            contents: [
                {
                    parts: [{ text: text }],
                },
            ],
            generationConfig: {
                temperature: 0.3,
            },
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 400 && data.error?.message?.includes('API key not valid')) {
                    throw new Error(
                        (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorAuthInvalid') : null) ||
                            'Authentication Error: Invalid API key. Check extension options.',
                    );
                } else if (response.status === 401 || response.status === 403) {
                    throw new Error(
                        (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorAuthUnauthorized') : null) ||
                            'Authentication Error: Unauthorized access (401/403). Check your settings.',
                    );
                } else if (response.status === 429) {
                    throw new Error(
                        (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorRateLimit') : null) ||
                            'Rate limit exceeded (429). Please try again later.',
                    );
                } else {
                    const aiServiceErr = (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorAIService') : null) || 'AI Service Error: ';
                    throw new Error(`${aiServiceErr}${data.error?.message || response.statusText}`);
                }
            }

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
                return data.candidates[0].content.parts[0].text;
            } else {
                throw new Error((typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorNoValidText') : null) || 'AI returned no valid text.');
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error(
                    (typeof browser !== 'undefined' ? browser.i18n.getMessage('bgErrorNetwork') : null) || 'Network Error: Cannot connect to AI service.',
                );
            }
            throw error; // Re-throw to be handled by the background script
        }
    }
}
