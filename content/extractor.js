(function () {
    // We use an IIFE to keep the scope clean when injected multiple times
    function extractPageText() {
        const text = document.body.innerText || document.body.textContent;

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

        // Limit base text and append links
        const combined = text.substring(0, 45000) + urlList;
        return combined.substring(0, 60000);
    }

    // Return the result directly so executeScript can capture it
    return extractPageText();
})();
