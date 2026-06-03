// Prevent multiple injections
if (!window.scutterSkimUI) {
    window.scutterSkimUI = {
        container: null,
        shadow: null,

        init() {
            if (this.container) {
                // If already exists, just reset the content to loading state
                this.showLoading();
                return;
            }

            this.container = document.createElement('div');
            this.container.id = 'scutter-skim-root';
            // Basic styles for the root container so it doesn't affect the page flow
            this.container.style.position = 'fixed';
            this.container.style.top = '20px';
            this.container.style.right = '20px';
            this.container.style.zIndex = '2147483647'; // max z-index
            this.container.style.width = '450px'; // Set width here so shadow host is sized
            this.container.style.maxWidth = 'calc(100vw - 40px)'; // responsive

            // Using closed mode for maximum isolation
            this.shadow = this.container.attachShadow({ mode: 'closed' });

            const cssUrl = browser.runtime.getURL('content/ui.css') + '?v=' + Date.now();

            this.shadow.innerHTML = `
        <link rel="stylesheet" href="${cssUrl}">
        <div class="scutter-modal">
          <button class="scutter-close" title="${browser.i18n.getMessage('uiCloseTitle') || 'Close'}">&times;</button>
          <div class="scutter-content" id="scutter-body">
            <!-- Content will be injected here -->
          </div>
        </div>
      `;

            this.shadow.querySelector('.scutter-close').addEventListener('click', () => {
                this.close();
            });

            document.body.appendChild(this.container);
            this.showLoading();
        },

        showLoading() {
            if (!this.shadow) return;
            const bodyEl = this.shadow.getElementById('scutter-body');
            bodyEl.innerHTML = `
        <div class="scutter-loading">
          <div class="scutter-spinner"></div>
          <span>${browser.i18n.getMessage('uiLoadingText') || 'Generating summary... please wait.'}</span>
        </div>
      `;
        },

        updateContent(markdownText) {
            if (!this.shadow) return;
            const bodyEl = this.shadow.getElementById('scutter-body');

            // Check if libraries are loaded
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                try {
                    // Extract and format tags BEFORE markdown parsing to safely remove hashes and commas
                    let md = markdownText.replace(/^(.*?:\s*)(#[^\n]*)$/m, (match, prefix, tagsPart) => {
                        const tokens = tagsPart.split(/[\s,]+/);
                        const onlyTags = tokens.every((token) => token === '' || token.startsWith('#'));
                        if (onlyTags) {
                            const htmlTags = tagsPart
                                .split(/[\s,]+/)
                                .map((t) => {
                                    const cleanTag = t.replace(/^#/, '');
                                    if (cleanTag) return `<span class="scutter-tag">${cleanTag}</span>`;
                                    return '';
                                })
                                .join(' ');
                            return prefix + htmlTags;
                        }
                        return match;
                    });

                    let rawHtml = marked.parse(md);

                    const cleanHtml = DOMPurify.sanitize(rawHtml);
                    bodyEl.innerHTML = cleanHtml;

                    // Ensure all links open in a new tab
                    const links = bodyEl.querySelectorAll('a');
                    links.forEach((link) => {
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                    });
                } catch (e) {
                    this.showError(browser.i18n.getMessage('uiErrorMarkdown') || 'Error processing Markdown.');
                }
            } else {
                this.showError(browser.i18n.getMessage('uiErrorLibraries') || 'Error: Rendering libraries failed to load.');
            }
        },

        showError(errorMessage) {
            if (!this.shadow) return;
            const bodyEl = this.shadow.getElementById('scutter-body');
            bodyEl.innerHTML = ''; // Clear previous content

            const errorDiv = document.createElement('div');
            errorDiv.className = 'scutter-error';
            errorDiv.textContent = errorMessage; // Safe text injection (no XSS)

            bodyEl.appendChild(errorDiv);
        },

        close() {
            if (this.container && this.container.parentNode) {
                this.container.parentNode.removeChild(this.container);
            }
            this.container = null;
            this.shadow = null;
        },
    };
}

// Automatically initialize when injected
window.scutterSkimUI.init();
