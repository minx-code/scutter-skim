(function () {
    // We use an IIFE to keep the scope clean when injected multiple times
    function extractPageText() {
        let text = '';

        if (typeof Readability !== 'undefined') {
            try {
                // Readability mutates the document, so we clone it first
                const documentClone = document.cloneNode(true);
                const reader = new Readability(documentClone);
                const article = reader.parse();
                if (article && article.textContent) {
                    text = article.textContent;
                }
            } catch (e) {
                console.error('Readability error:', e);
            }
        }

        // Fallback to basic text extraction if Readability fails or is unavailable
        if (!text || text.trim().length === 0) {
            text = document.body.innerText || document.body.textContent;
        }

        // Clean up excessive newlines
        text = text.replace(/\n\s*\n/g, '\n\n').trim();

        // Extract unique valid links from the page
        const links = document.body.querySelectorAll('a[href]');
        const uniqueLinks = new Map();

        links.forEach((a) => {
            const linkText = a.textContent.trim().replace(/\n/g, ' ').substring(0, 80);
            const url = a.href;
            // Filter out javascript:, mailto:, anchors, etc.
            if (linkText && url.startsWith('http') && !uniqueLinks.has(url)) {
                uniqueLinks.set(url, linkText);
            }
        });

        let urlList = '\n\n--- List of all links on the page (if you cite sources in the text, use these URLs from the text->URL mapping) ---\n';
        let count = 0;
        for (const [url, linkText] of uniqueLinks.entries()) {
            if (count > 200) break; // Limit to first 200 unique links to save tokens
            urlList += `[${linkText}](${url})\n`;
            count++;
        }

        // Return full text without truncation
        return text + urlList;
    }

    // Return the result directly so executeScript can capture it
    return extractPageText();
})();
