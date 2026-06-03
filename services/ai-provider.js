class AIProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Summarizes the given text based on the provided prompt.
     * @param {string} text - The text to summarize.
     * @param {string} systemPrompt - The strict structure requirement.
     * @returns {Promise<string>} The Markdown response.
     */
    async summarizeText(text, systemPrompt) {
        throw new Error("Method 'summarizeText()' must be implemented.");
    }
}
