# LLM Chat Mermaid Renderer

A Chrome extension that renders Mermaid diagrams in LLM chat interfaces while **preserving the original source code** for export compatibility.

## Features

- **Source Preservation**: Renders Mermaid diagrams while keeping the original code hidden in the DOM
- **LLM Chat Exporter Compatible**: Works seamlessly with [LLM Chat Exporter](https://github.com/dragon/llm-chat-exporter) - exported markdown will include the original mermaid code blocks
- **Multi-Platform Support**: Works on ChatGPT, Claude, Gemini, and Grok
- **Toggle View**: Switch between rendered diagram and source code with one click
- **Dark Mode**: Automatic dark mode support

## Supported Platforms

| Platform | Detection Method |
|----------|------------------|
| ChatGPT | `class="language-mermaid"` |
| Claude | `class="language-mermaid"` |
| Gemini | Content-based (detects mermaid keywords) |
| Grok | Language label span |

## How It Works

When a mermaid code block is detected, the extension transforms:

```html
<!-- Before -->
<pre><code class="language-mermaid">graph TD; A-->B;</code></pre>

<!-- After -->
<div class="mpr-container" data-mpr-processed="true">
  <pre class="mpr-source" style="display:none">
    <code class="language-mermaid">graph TD; A-->B;</code>
  </pre>
  <div class="mpr-rendered"><svg>...</svg></div>
  <button class="mpr-toggle">{ }</button>
</div>
```

The original `<pre><code class="language-mermaid">` structure is preserved (hidden), allowing tools like LLM Chat Exporter to extract the original mermaid code.

## Installation

### From Source

1. Clone this repository:
   ```bash
   git clone https://github.com/dragon/llm-chat-mermaid-renderer.git
   cd llm-chat-mermaid-renderer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load in Chrome:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the project folder

## Development

```bash
# Install dependencies
npm install

# Build once
npm run build

# Watch mode (auto-rebuild on changes)
npm run watch

# Run tests
npm test

# Run tests in watch mode
npm test:watch
```

## Project Structure

```
llm-chat-mermaid-renderer/
├── manifest.json           # Chrome Extension manifest (v3)
├── config/
│   └── selectors.json      # Platform-specific selectors
├── src/content/
│   ├── index.ts            # Entry point
│   ├── detector.ts         # Platform detection & mermaid block detection
│   ├── renderer.ts         # Core rendering logic with source preservation
│   ├── toggle.ts           # Toggle button component
│   └── mermaidLoader.ts    # CDN loader for Mermaid.js
├── styles/
│   └── mermaid-container.css
├── tests/unit/
│   ├── detector.test.ts
│   └── renderer.test.ts
└── dist/
    └── content.js          # Built bundle
```

## Configuration

Platform selectors are configured in `config/selectors.json`:

```json
{
  "platforms": {
    "chatgpt": {
      "hostname": "chatgpt.com",
      "selectors": {
        "codeBlock": "pre code.language-mermaid",
        "wrapper": "pre"
      },
      "detection": "className"
    },
    "gemini": {
      "hostname": "gemini.google.com",
      "selectors": {
        "codeBlock": "code[data-test-id='code-content']",
        "wrapper": "pre"
      },
      "detection": "contentBased"
    }
  }
}
```

### Detection Methods

- **className**: Detects `class="language-mermaid"` on code elements
- **contentBased**: Parses code content for mermaid keywords (graph, flowchart, sequenceDiagram, etc.)
- **languageLabel**: Looks for a separate language label element (used by Grok)

## Testing

The project uses Vitest with jsdom for testing:

```bash
npm test
```

**50 tests** covering:
- Platform detection
- Mermaid content detection
- DOM transformation
- LLM Chat Exporter compatibility

## License

MIT
