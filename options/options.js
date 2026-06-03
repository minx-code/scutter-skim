document.addEventListener('DOMContentLoaded', () => {
    // Translate HTML based on data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const msg = browser.i18n.getMessage(el.getAttribute('data-i18n'));
        if (msg) el.textContent = msg;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const msg = browser.i18n.getMessage(el.getAttribute('data-i18n-placeholder'));
        if (msg) el.placeholder = msg;
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        const msg = browser.i18n.getMessage(el.getAttribute('data-i18n-title'));
        if (msg) el.title = msg;
    });

    const t = (key, fallback) => browser.i18n.getMessage(key) || fallback;

    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const outputLangSelect = document.getElementById('outputLang');
    const showFabCheckbox = document.getElementById('showFab');
    const loadModelsBtn = document.getElementById('loadModels');
    const saveButton = document.getElementById('save');
    const statusEl = document.getElementById('status');

    // Load saved settings
    browser.storage.local.get(['aiProvider', 'apiKey', 'aiModel', 'outputLang', 'showFab']).then((res) => {
        if (res.aiProvider) providerSelect.value = res.aiProvider;
        if (res.apiKey) apiKeyInput.value = res.apiKey;
        if (res.outputLang) outputLangSelect.value = res.outputLang;
        if (res.showFab !== undefined) showFabCheckbox.checked = res.showFab;

        if (res.aiModel) {
            // If the saved model isn't in the list, add it
            let exists = false;
            for (let i = 0; i < modelSelect.options.length; i++) {
                if (modelSelect.options[i].value === res.aiModel) exists = true;
            }
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = res.aiModel;
                opt.textContent = res.aiModel;
                modelSelect.appendChild(opt);
            }
            modelSelect.value = res.aiModel;
        }
    });

    // Load models from API
    loadModelsBtn.addEventListener('click', async () => {
        const key = apiKeyInput.value.trim();
        if (!key) {
            showStatus(t('optionsLoadModelsErrorNoKey', 'Please enter an API key to load models.'), true);
            return;
        }

        loadModelsBtn.disabled = true;
        loadModelsBtn.textContent = t('optionsLoadModelsLoading', 'Loading...');

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error?.message || 'API communication error');
            }

            if (data.models && data.models.length > 0) {
                const currentVal = modelSelect.value;
                modelSelect.innerHTML = ''; // Clear current options

                // Filter for models that support text generation
                const generateModels = data.models.filter((m) => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));

                generateModels.forEach((m) => {
                    const opt = document.createElement('option');
                    // API returns names like "models/gemini-3.1-flash-lite", we just want the part after slash
                    const shortName = m.name.replace('models/', '');
                    opt.value = shortName;
                    opt.textContent = `${m.displayName} (${shortName})`;
                    modelSelect.appendChild(opt);
                });

                // Try to restore previous selection
                let exists = false;
                for (let i = 0; i < modelSelect.options.length; i++) {
                    if (modelSelect.options[i].value === currentVal) exists = true;
                }
                if (exists) {
                    modelSelect.value = currentVal;
                } else if (modelSelect.options.length > 0) {
                    modelSelect.value = modelSelect.options[0].value;
                }

                showStatus(t('optionsLoadModelsSuccess', 'Models loaded successfully.'));
            } else {
                throw new Error(t('optionsLoadModelsEmpty', 'API returned no models.'));
            }
        } catch (error) {
            showStatus(t('optionsLoadModelsFail', 'Failed to load models: ') + error.message, true);
        } finally {
            loadModelsBtn.disabled = false;
            loadModelsBtn.textContent = t('optionsLoadModels', 'Load from API');
        }
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const aiProvider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const aiModel = modelSelect.value;
        const outputLang = outputLangSelect.value;
        const showFab = showFabCheckbox.checked;

        browser.storage.local
            .set({
                aiProvider: aiProvider,
                apiKey: apiKey,
                aiModel: aiModel,
                outputLang: outputLang,
                showFab: showFab,
            })
            .then(() => {
                showStatus(t('optionsSaveSuccess', 'Settings saved successfully.'));
            })
            .catch((error) => {
                showStatus(t('optionsSaveFail', 'Error saving settings: ') + error.message, true);
            });
    });

    function showStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.className = 'status-message show' + (!isError ? ' success' : '');
        if (isError) {
            statusEl.style.color = '#ef4444';
        } else {
            statusEl.style.color = '';
        }

        setTimeout(() => {
            statusEl.className = 'status-message';
        }, 3000);
    }
});
