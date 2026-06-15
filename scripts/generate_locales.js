const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiKey = process.argv[2];
if (!apiKey) {
    console.error('Usage: node generate_locales.js <GEMINI_API_KEY>');
    process.exit(1);
}

const sourceFile = path.join(__dirname, '../_locales/en/messages.json');
const localesDir = path.join(__dirname, '../_locales');
const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));

// Extract only the messages to translate
const stringsToTranslate = {};
for (const [key, val] of Object.entries(sourceData)) {
    stringsToTranslate[key] = val.message;
}

const languages = {
    bg: 'Bulgarian',
    cs: 'Czech',
    da: 'Danish',
    de: 'German',
    el: 'Greek',
    es: 'Spanish',
    et: 'Estonian',
    fi: 'Finnish',
    fr: 'French',
    ga: 'Irish',
    hr: 'Croatian',
    hu: 'Hungarian',
    it: 'Italian',
    lt: 'Lithuanian',
    lv: 'Latvian',
    mt: 'Maltese',
    nl: 'Dutch',
    pl: 'Polish',
    pt: 'Portuguese',
    ro: 'Romanian',
    sk: 'Slovak',
    sl: 'Slovenian',
    sv: 'Swedish',
    sq: 'Albanian',
    is: 'Icelandic',
    mk: 'Macedonian',
    cnr: 'Montenegrin',
    no: 'Norwegian',
    tr: 'Turkish',
    uk: 'Ukrainian',
};

async function translateTo(langCode, langName) {
    const targetDir = path.join(localesDir, langCode);
    const targetFile = path.join(targetDir, 'messages.json');

    let existingData = {};
    if (fs.existsSync(targetFile)) {
        existingData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    }

    // Find missing keys
    const missingStrings = {};
    let hasMissing = false;
    for (const [key, val] of Object.entries(stringsToTranslate)) {
        if (!existingData[key]) {
            missingStrings[key] = val;
            hasMissing = true;
        }
    }

    if (!hasMissing) {
        console.log(`Already fully translated to ${langName} (${langCode}), skipping...`);
        return;
    }

    console.log(`Found ${Object.keys(missingStrings).length} missing string(s) for ${langName} (${langCode}). Translating...`);

    const prompt = `You are a professional software localization translator. Translate the following JSON object values into ${langName}. 
Maintain the exact JSON structure. Return ONLY valid JSON, without markdown formatting or code blocks.
If you see any placeholders like __MSG_something__, keep them exactly as they are.

JSON to translate:
${JSON.stringify(missingStrings, null, 2)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error?.message || 'API Error');
    }

    let resultText = data.candidates[0].content.parts[0].text;

    // Clean markdown json blocks if present
    if (resultText.startsWith('\`\`\`')) {
        resultText = resultText.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '');
    }

    const translatedStrings = JSON.parse(resultText.trim());

    // Merge the new translations into the existing data
    const finalJson = { ...existingData };
    for (const [key, val] of Object.entries(translatedStrings)) {
        finalJson[key] = { message: val };
    }

    // Sort keys alphabetically
    const sortedJson = {};
    Object.keys(finalJson)
        .sort()
        .forEach((k) => {
            sortedJson[k] = finalJson[k];
        });

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetFile, JSON.stringify(sortedJson, null, 2));
    console.log(`Successfully updated translations for ${langName} (${langCode})`);
}

async function main() {
    console.log(`Starting translations for ${Object.keys(languages).length} languages...`);
    for (const [code, name] of Object.entries(languages)) {
        console.log(`Translating: ${name} (${code})...`);
        try {
            await translateTo(code, name);
            // Wait to avoid rate limits
            await new Promise((r) => setTimeout(r, 5000));
        } catch (e) {
            console.error(`Failed for ${name}:`, e.message);
        }
    }
    console.log('Running Prettier format on translations...');
    try {
        execSync('npm run format', { stdio: 'inherit' });
    } catch (e) {
        console.error('Formatting failed:', e.message);
    }
    console.log('Translation complete!');
}

main();
