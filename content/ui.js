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

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssUrl;

            const modal = document.createElement('div');
            modal.className = 'scutter-modal';

            const closeBtn = document.createElement('button');
            closeBtn.className = 'scutter-close';
            closeBtn.title = browser.i18n.getMessage('uiCloseTitle') || 'Close';
            closeBtn.textContent = '×';

            const bodyEl = document.createElement('div');
            bodyEl.className = 'scutter-content';
            bodyEl.id = 'scutter-body';

            modal.appendChild(closeBtn);
            modal.appendChild(bodyEl);

            this.shadow.appendChild(link);
            this.shadow.appendChild(modal);

            closeBtn.addEventListener('click', () => {
                this.close();
            });

            document.body.appendChild(this.container);
            this.showLoading();
        },

        showLoading() {
            if (!this.shadow) return;
            const bodyEl = this.shadow.getElementById('scutter-body');
            bodyEl.replaceChildren(); // clear existing

            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'scutter-loading';

            const spinner = document.createElement('div');
            spinner.className = 'scutter-spinner';

            const span = document.createElement('span');
            span.textContent = browser.i18n.getMessage('uiLoadingText') || 'Generating summary... please wait.';

            loadingDiv.appendChild(spinner);
            loadingDiv.appendChild(span);
            bodyEl.appendChild(loadingDiv);
        },

        updateContent(markdownText) {
            if (!this.shadow) return;
            const bodyEl = this.shadow.getElementById('scutter-body');

            // Check if libraries are loaded
            if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
                try {
                    // Extract and format tags BEFORE markdown parsing to safely remove hashes and commas
                    let md = markdownText.replace(/^(.*?:\s*)(#[^\n]*)$/m, (match, prefix, tagsPart) => {
                        // Split by # to handle both comma and space separated tags, including tags with spaces
                        const rawTags = tagsPart.split(/(?=#)/).map(t => t.trim()).filter(t => t !== '');
                        const onlyTags = rawTags.every((token) => token.startsWith('#'));
                        if (onlyTags) {
                            const htmlTags = rawTags
                                .map((t) => {
                                    const cleanTag = t.replace(/^#/, '').replace(/,+$/, '').trim();
                                    if (cleanTag) return `<span class="scutter-tag">${cleanTag}</span>`;
                                    return '';
                                })
                                .join(' ');
                            return prefix + htmlTags;
                        }
                        return match;
                    });

                    let rawHtml = marked.parse(md);

                    const cleanNode = DOMPurify.sanitize(rawHtml, { RETURN_DOM_FRAGMENT: true });
                    bodyEl.replaceChildren(cleanNode);

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
            bodyEl.replaceChildren(); // Clear previous content

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
