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
    const baseUrlInput = document.getElementById('baseUrl');
    const baseUrlContainer = document.getElementById('baseUrlContainer');
    const apiKeyContainer = document.getElementById('apiKeyContainer');
    const modelSelect = document.getElementById('model');
    const outputLangSelect = document.getElementById('outputLang');
    const showFabCheckbox = document.getElementById('showFab');
    const loadModelsBtn = document.getElementById('loadModels');
    const shortcutInput = document.getElementById('shortcut');
    const resetShortcutBtn = document.getElementById('resetShortcut');
    const saveButton = document.getElementById('save');
    const statusEl = document.getElementById('status');
    const apiKeyHelpText = document.getElementById('apiKeyHelpText');
    const apiKeyLink = document.getElementById('apiKeyLink');

    const providerInfo = {
        anthropic: { link: 'https://console.anthropic.com/settings/keys', name: 'Anthropic', defaultModel: 'claude-3-haiku-20240307', showBaseUrl: false },
        deepseek: { link: 'https://platform.deepseek.com/api_keys', name: 'DeepSeek', defaultModel: 'deepseek-chat', showBaseUrl: true },
        gemini: { link: 'https://aistudio.google.com/app/apikey', name: 'Google AI Studio', defaultModel: 'gemini-3.1-flash-lite', showBaseUrl: false },
        groq: { link: 'https://console.groq.com/keys', name: 'Groq', defaultModel: 'llama3-8b-8192', showBaseUrl: true },
        ollama: { link: '', name: 'Ollama', defaultModel: 'llama3', showBaseUrl: true, noKey: true },
        openai: { link: 'https://platform.openai.com/api-keys', name: 'OpenAI', defaultModel: 'gpt-4o-mini', showBaseUrl: true },
        together: { link: 'https://api.together.ai/settings/api-keys', name: 'Together AI', defaultModel: 'meta-llama/Llama-3-8b-chat-hf', showBaseUrl: true },
    };

    function updateProviderUI() {
        const provider = providerSelect.value;
        const info = providerInfo[provider];

        if (info.noKey) {
            apiKeyContainer.style.display = 'none';
        } else {
            apiKeyContainer.style.display = 'block';
            apiKeyLink.href = info.link;
            apiKeyLink.textContent = info.name;
        }

        if (info.showBaseUrl) {
            baseUrlContainer.style.display = 'block';
        } else {
            baseUrlContainer.style.display = 'none';
        }
    }

    async function loadProviderSettings() {
        const provider = providerSelect.value;
        const apiKeyKey = `${provider}ApiKey`;
        const modelKey = `${provider}Model`;
        const baseUrlKey = `${provider}BaseUrl`;

        // Also check legacy keys if gemini is selected
        const keysToGet = [apiKeyKey, modelKey, baseUrlKey];
        if (provider === 'gemini') keysToGet.push('apiKey', 'aiModel');

        const res = await browser.storage.local.get(keysToGet);

        let apiKey = res[apiKeyKey];
        let model = res[modelKey];
        let baseUrl = res[baseUrlKey] || '';

        // Legacy migration for UI
        if (provider === 'gemini') {
            if (!apiKey && res.apiKey) apiKey = res.apiKey;
            if (!model && res.aiModel) model = res.aiModel;
        }

        apiKeyInput.value = apiKey || '';
        baseUrlInput.value = baseUrl;

        if (model) {
            let exists = false;
            for (let i = 0; i < modelSelect.options.length; i++) {
                if (modelSelect.options[i].value === model) exists = true;
            }
            if (!exists) {
                const opt = document.createElement('option');
                opt.value = model;
                opt.textContent = model;
                modelSelect.appendChild(opt);
            }
            modelSelect.value = model;
        }
    }

    // Initialize UI on load
    browser.storage.local.get(['aiProvider', 'outputLang', 'showFab']).then((res) => {
        if (res.aiProvider) providerSelect.value = res.aiProvider;
        if (res.outputLang) outputLangSelect.value = res.outputLang;
        if (res.showFab !== undefined) showFabCheckbox.checked = res.showFab;

        updateProviderUI();
        loadProviderSettings();
    });

    providerSelect.addEventListener('change', () => {
        updateProviderUI();
        modelSelect.innerHTML = ''; // Clear models when switching
        loadProviderSettings();
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const provider = providerSelect.value;
        const apiKeyKey = `${provider}ApiKey`;
        const modelKey = `${provider}Model`;
        const baseUrlKey = `${provider}BaseUrl`;

        const dataToSave = {
            aiProvider: provider,
            outputLang: outputLangSelect.value,
            showFab: showFabCheckbox.checked,
            [apiKeyKey]: apiKeyInput.value.trim(),
            [modelKey]: modelSelect.value,
            [baseUrlKey]: baseUrlInput.value.trim(),
        };

        browser.storage.local
            .set(dataToSave)
            .then(() => {
                showStatus(t('optionsSaveSuccess', 'Settings saved successfully.'));
            })
            .catch((error) => {
                showStatus(t('optionsSaveFail', 'Error saving settings: ') + error.message, true);
            });
    });

    // Load models from API via background script
    loadModelsBtn.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const baseUrl = baseUrlInput.value.trim();

        if (!apiKey && !providerInfo[provider].noKey) {
            showStatus(t('optionsLoadModelsErrorNoKey', 'Please enter an API key to load models.'), true);
            return;
        }

        loadModelsBtn.disabled = true;
        loadModelsBtn.textContent = t('optionsLoadModelsLoading', 'Loading...');

        try {
            const response = await browser.runtime.sendMessage({
                action: 'load_models',
                provider: provider,
                apiKey: apiKey,
                baseUrl: baseUrl,
            });

            if (response.error) {
                throw new Error(response.error);
            }

            if (response.models && response.models.length > 0) {
                const currentVal = modelSelect.value;
                modelSelect.innerHTML = '';

                response.models.forEach((m) => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = m.name;
                    modelSelect.appendChild(opt);
                });

                let exists = Array.from(modelSelect.options).some((opt) => opt.value === currentVal);
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

    function showStatus(message, isError = false) {
        statusEl.textContent = message;
        statusEl.className = 'status-message show' + (!isError ? ' success' : '');
        if (isError) statusEl.style.color = '#ef4444';
        else statusEl.style.color = '';

        setTimeout(() => {
            statusEl.className = 'status-message';
        }, 3000);
    }

    // Keyboard Shortcut Management
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const shortcutContainer = document.getElementById('shortcutContainer');
    
    if (isMobile && shortcutContainer) {
        shortcutContainer.style.display = 'none';
    } else {
        if (browser.commands && browser.commands.getAll) {
            browser.commands.getAll().then((commands) => {
                const cmd = commands.find((c) => c.name === '_execute_action');
                if (cmd && cmd.shortcut) shortcutInput.value = cmd.shortcut;
            });
        }
    }

    shortcutInput.addEventListener('keydown', (e) => {
        e.preventDefault();
        const keys = [];
        if (e.ctrlKey) keys.push('Ctrl');
        if (e.altKey) keys.push('Alt');
        if (e.metaKey) keys.push('Command');
        if (e.shiftKey) keys.push('Shift');

        const key = e.key.toUpperCase();
        if (['CONTROL', 'ALT', 'META', 'SHIFT'].includes(key)) {
            shortcutInput.value = keys.join('+') + '+...';
            return;
        }

        if (keys.length > 0 && /^[A-Z0-9]$/.test(key)) {
            keys.push(key);
            const newShortcut = keys.join('+');
            shortcutInput.value = newShortcut;

            if (browser.commands && browser.commands.update) {
                browser.commands
                    .update({ name: '_execute_action', shortcut: newShortcut })
                    .then(() => showStatus(t('optionsShortcutSuccess', 'Shortcut updated successfully.')))
                    .catch((err) => showStatus(t('optionsShortcutFail', 'Failed to update shortcut: ') + err.message, true));
            } else {
                showStatus(t('optionsShortcutNotSupported', 'Shortcut update not supported in this browser.'), true);
            }
        }
    });

    resetShortcutBtn.addEventListener('click', () => {
        const defaultShortcut = 'Alt+Shift+U';
        if (browser.commands && browser.commands.update) {
            browser.commands
                .update({ name: '_execute_action', shortcut: defaultShortcut })
                .then(() => {
                    shortcutInput.value = defaultShortcut;
                    showStatus(t('optionsShortcutResetSuccess', 'Shortcut reset to default.'));
                })
                .catch((err) => showStatus(t('optionsShortcutResetFail', 'Failed to reset shortcut: ') + err.message, true));
        }
    });
});
