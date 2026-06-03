const test = require('node:test');
const assert = require('node:assert');

// This is the exact regex used in content/ui.js
const regex = /^(.*?:\s*)(#[^\n]*)$/m;

const processTags = (markdownText) => {
    let replaced = false;
    let result = markdownText.replace(regex, (match, prefix, tagsPart) => {
        const tokens = tagsPart.split(/[\s,]+/);
        const onlyTags = tokens.every((token) => token === '' || token.startsWith('#'));
        if (onlyTags) {
            replaced = true;
            const htmlTags = tagsPart
                .split(/[\s,]+/)
                .map((t) => {
                    const cleanTag = t.replace(/^#/, '');
                    if (cleanTag) return `<span class="tag">${cleanTag}</span>`;
                    return '';
                })
                .join(' ')
                .trim();
            return prefix + htmlTags;
        }
        return match;
    });
    return { result, replaced };
};

test('Parses standard comma-separated tags', () => {
    const input = 'Tags: #GNOME, #Linux, #OpenSource\nBrief Summary';
    const out = processTags(input);
    assert.strictEqual(out.replaced, true);
    assert.ok(out.result.includes('<span class="tag">GNOME</span>'));
    assert.ok(out.result.includes('<span class="tag">Linux</span>'));
    assert.ok(out.result.includes('<span class="tag">OpenSource</span>'));
    assert.ok(out.result.includes('Brief Summary'));
});

test('Parses space-separated tags', () => {
    const input = 'Tags: #AI #ML #Tech';
    const out = processTags(input);
    assert.strictEqual(out.replaced, true);
    assert.ok(out.result.includes('<span class="tag">AI</span> <span class="tag">ML</span> <span class="tag">Tech</span>'));
});

test('Handles Windows CRLF line endings', () => {
    const input = 'Tags: #GNOME, #Linux\r\nBrief Summary';
    const out = processTags(input);
    assert.strictEqual(out.replaced, true);
    assert.ok(out.result.includes('<span class="tag">GNOME</span>'));
    assert.ok(out.result.includes('<span class="tag">Linux</span>'));
    assert.ok(out.result.includes('Brief Summary'));
});

test('Rejects lines that are not exclusively tags', () => {
    const input = 'Tags: #GNOME and some other text';
    const out = processTags(input);
    assert.strictEqual(out.replaced, false);
    assert.strictEqual(out.result, input);
});
