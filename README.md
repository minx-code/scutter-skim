# Scutter Skim

**Scutter Skim** is a Manifest V3 Firefox extension designed to instantly summarize the current web page you are reading using an AI model. With a single click, it extracts the page content, sends it to the AI, and displays a cleanly formatted Markdown summary in an isolated, non-intrusive modal window over the page.

Currently, the extension uses Google's **Gemini 3.1 Flash Lite** model, but it features an AI-agnostic architecture allowing easy integration of other providers in the future.

## Features

- **One-Click Summarization**: Click the extension icon to instantly generate a summary of the active page.
- **Content Quality Warnings**: Automatically detects clickbait, SEO spam, and fluffy content, visually warning you right below the article title.
- **Global Localization**: Supports 31 languages for the UI and summary output, adapting automatically to your browser or article language.
- **Isolated UI**: The results modal is rendered inside a closed Shadow DOM, ensuring the host page's CSS never conflicts with the extension's sleek, modern design.
- **AI Agnostic Design**: Simple, interchangeable class structure for adding new AI providers.
- **Privacy Focused**: Requires your personal API Key, stored locally in your browser (`browser.storage.local`). The key is only sent directly to the AI provider.

## Installation (Development / Local)

1. Open Mozilla Firefox and navigate to `about:debugging`.
2. Click on **This Firefox** in the left sidebar.
3. Click the **Load Temporary Add-on...** button.
4. Select the `manifest.json` file from this project directory.
5. The extension should now be loaded. Note that since it's a temporary add-on, it will be removed when you restart Firefox.

## Configuration

Before using the extension, you must provide your AI API key:

1. Right-click the **Scutter Skim** icon in the Firefox toolbar.
2. Select **Manage Extension** and go to **Preferences** (or **Options**).
3. Select your AI Provider (Google Gemini) and paste your API Key.
4. Click **Save Settings**.

## Debugging in Firefox

When developing or troubleshooting the extension, follow these steps to access logs and inspect the UI:

### Debugging the Background Script & Network Requests

The background script handles orchestration and API calls.

1. Go to `about:debugging` -> **This Firefox**.
2. Find **Scutter Skim** in the list of Temporary Extensions.
3. Click the **Inspect** button next to it.
4. This opens a separate Developer Tools window dedicated to the extension's background context.
5. Go to the **Console** tab to view `console.log()` statements or errors regarding the AI connection.
6. Go to the **Network** tab to inspect the exact payloads being sent to the AI API.

### Debugging the Content Script & UI

The visual modal and text extraction run in the context of the page you are viewing.

1. Open the Developer Tools (F12) on the webpage where you triggered the extension.
2. Under the **Console** tab, you will see errors if the script failed to inject or extract text.
3. Under the **Inspector** tab, scroll to the bottom of the `<body>` to find the `<div id="scutter-skim-root">`.
4. Expand this `div` to inspect the closed `#shadow-root`. Because it is a _closed_ Shadow DOM, you cannot easily manipulate its contents via JS from the page console, but the Firefox DOM Inspector still allows you to view and tweak the HTML/CSS inside it for styling purposes.

### Reloading After Code Changes

- If you modify the UI (`options.html`, `options.css`) or Content Scripts (`ui.js`, `extractor.js`), just **refresh the target webpage** or reopen the options page to see the changes.
- If you modify the Background Script (`background.js`) or `manifest.json`, you **must click the "Reload" button** next to the extension in `about:debugging`.

## Building for Production

To create a clean `.zip` archive ready for upload to Mozilla Add-ons (AMO):

```bash
./scripts/build.sh
```

This script will bundle only the necessary production files into `dist/extension.zip`.

## Running Unit Tests

The project uses Node.js native testing (requires Node 18+). To run the test suite:

```bash
npm test
```

Or directly:

```bash
node --test tests/
```
