(function () {
    let fabElement = null;

    function createFab() {
        if (fabElement || document.getElementById('scutter-skim-fab')) return;

        fabElement = document.createElement('button');
        fabElement.id = 'scutter-skim-fab';
        fabElement.className = 'scutter-skim-fab';
        fabElement.title = 'Summarize with Scutter Skim';

        const iconUrl = browser.runtime.getURL('icons/icon.svg');
        const img = document.createElement('img');
        img.src = iconUrl;
        img.alt = 'Scutter Skim';

        fabElement.appendChild(img);

        fabElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Send message to background to trigger summarize
            browser.runtime.sendMessage({ action: 'trigger_summarize' });
        });

        document.body.appendChild(fabElement);
    }

    function removeFab() {
        if (fabElement) {
            fabElement.remove();
            fabElement = null;
        } else {
            const existing = document.getElementById('scutter-skim-fab');
            if (existing) existing.remove();
        }
    }

    // Initialize
    browser.storage.local.get(['showFab']).then((result) => {
        // Default to false.
        if (result.showFab === true) {
            createFab();
        }
    });

    // Listen for options changes
    browser.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.showFab !== undefined) {
            if (changes.showFab.newValue === true) {
                createFab();
            } else {
                removeFab();
            }
        }
    });
})();
