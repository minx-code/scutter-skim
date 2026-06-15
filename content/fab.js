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

        let isDragging = false;
        let hasDragged = false;
        let startX, startY, initialX, initialY;

        fabElement.addEventListener('mousedown', dragStart);
        fabElement.addEventListener('touchstart', dragStart, { passive: false });

        function dragStart(e) {
            isDragging = true;
            hasDragged = false;

            if (e.type === 'touchstart') {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else {
                startX = e.clientX;
                startY = e.clientY;
            }

            const rect = fabElement.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchend', dragEnd);
        }

        function drag(e) {
            if (!isDragging) return;

            let currentX, currentY;
            if (e.type === 'touchmove') {
                currentX = e.touches[0].clientX;
                currentY = e.touches[0].clientY;
            } else {
                currentX = e.clientX;
                currentY = e.clientY;
            }

            const dx = currentX - startX;
            const dy = currentY - startY;

            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                hasDragged = true;
            }

            if (hasDragged) {
                if (e.cancelable) e.preventDefault(); // prevent scrolling when dragging on touch

                // Calculate new position
                let newX = initialX + dx;
                let newY = initialY + dy;

                // Boundaries
                const maxX = window.innerWidth - fabElement.offsetWidth;
                const maxY = window.innerHeight - fabElement.offsetHeight;

                newX = Math.min(Math.max(0, newX), maxX);
                newY = Math.min(Math.max(0, newY), maxY);

                fabElement.style.left = newX + 'px';
                fabElement.style.top = newY + 'px';
                fabElement.style.right = 'auto'; // Disable default right/bottom
                fabElement.style.bottom = 'auto';
            }
        }

        function dragEnd(e) {
            isDragging = false;
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchend', dragEnd);
        }

        fabElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hasDragged) {
                return; // Prevent click action if user was dragging
            }
            // Send message to background to trigger summarize
            browser.runtime.sendMessage({ action: 'trigger_summarize' }).catch((err) => {
                console.error('Scutter Skim: Error sending message from FAB.', err);
                alert('Scutter Skim: Rozšíření bylo aktualizováno na pozadí. Pro správné fungování tohoto tlačítka musíte tuto stránku obnovit (klávesa F5).');
            });
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
