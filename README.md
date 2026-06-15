# Scutter Skim

**Scutter Skim** is a Manifest V3 Firefox extension designed to instantly summarize the current web page you are reading using an AI model. With a single click, it extracts the page content, sends it to the AI, and displays a cleanly formatted Markdown summary in an isolated, non-intrusive modal window over the page.

Currently, the extension defaults to Google's **Gemini** model, but its AI-agnostic architecture supports multiple major providers including Anthropic (Claude), OpenAI (GPT), and local/custom endpoints like Ollama and Together AI.

### Core Features

- **Multi-Provider AI Summarization**: Choose from Google (Gemini), OpenAI (GPT), Anthropic (Claude), Groq, DeepSeek, Together AI, or run local models completely free and private via Ollama/LM Studio.
- **Strict Anti-Clickbait Filters**: Warns you if the article is clickbait, shallow SEO spam, or hides behind a paywall.
- **Smart Translation**: Automatically translates the summary to your browser's language or keeps it in the article's original language.
- **Floating Action Button**: A quick-access floating button, ideal for responsive layouts or mobile reading.
- **Keyboard Shortcuts**: Quickly summarize any page using `Alt+Shift+U` (customizable).
- **Global Localization**: Supports 30+ languages for the UI and summary output, adapting automatically to your browser or article language.
- **Isolated UI & Markdown**: The results modal is rendered inside a closed Shadow DOM, ensuring the host page's CSS never conflicts with the extension's sleek, modern design. It includes a lightweight Markdown parser to cleanly format headers, lists, and links.
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
4. (Optional) Toggle **Show floating summarize button** to easily use the extension on mobile devices.
5. Click **Save Settings**.

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

## Building and Releasing

**Local Build Requirements:**

- **OS**: Linux, macOS, or Windows with WSL/Git Bash.
- **Dependencies**: `bash` and the `zip` utility.
- Node.js is optional, used only for running unit tests and formatting code.

To create a clean `.zip` archive for local testing:

```bash
./scripts/build.sh
```

### CI/CD and Versioning

The project uses GitHub Actions (`.github/workflows/ci-cd.yml`) to automatically build and release the extension.

- **Development Version**: In the repository, `manifest.json` and `package.json` always use a placeholder version `"0.0.0"`.
- **Releasing**: To create a new release, simply create and push a new Git tag starting with `v` (e.g., `v1.2.3`). The CI pipeline will automatically extract the version number from the tag and inject it into the `manifest.json` and `package.json` before building the `extension.zip`.
- **Mozilla AMO**: When uploading a new version to Mozilla Add-ons (AMO), you must provide the original source code. You can download the automatically generated **Source code (zip)** directly from your GitHub Release page. Mozilla reviewers expect the code exactly as it is in the repository (including the `"0.0.0"` placeholder), and they will see from the workflow file how the actual version is injected.

## Running Unit Tests

The project uses Node.js native testing (requires Node 18+). To run the test suite:

```bash
npm test
```

Or directly:

```bash
node --test tests/
```
