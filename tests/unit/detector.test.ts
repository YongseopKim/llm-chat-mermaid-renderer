import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectPlatform,
  getPlatformConfig,
  isMermaidCodeBlock,
  findUnprocessedMermaidBlocks,
  isMermaidContent,
  Platform,
} from '../../src/content/detector';

describe('detectPlatform', () => {
  it('should detect ChatGPT', () => {
    expect(detectPlatform('chatgpt.com')).toBe('chatgpt');
    expect(detectPlatform('www.chatgpt.com')).toBe('chatgpt');
  });

  it('should detect Claude', () => {
    expect(detectPlatform('claude.ai')).toBe('claude');
    expect(detectPlatform('www.claude.ai')).toBe('claude');
  });

  it('should detect Gemini', () => {
    expect(detectPlatform('gemini.google.com')).toBe('gemini');
  });

  it('should detect Grok', () => {
    expect(detectPlatform('grok.com')).toBe('grok');
    expect(detectPlatform('www.grok.com')).toBe('grok');
  });

  it('should return null for unknown platforms', () => {
    expect(detectPlatform('example.com')).toBeNull();
    expect(detectPlatform('google.com')).toBeNull();
  });
});

describe('getPlatformConfig', () => {
  it('should return className detection for ChatGPT', () => {
    const config = getPlatformConfig('chatgpt');
    expect(config.platform).toBe('chatgpt');
    expect(config.detection).toBe('className');
    expect(config.codeBlockSelector).toBe('pre code.language-mermaid');
    expect(config.wrapperSelector).toBe('pre');
  });

  it('should return className detection for Claude', () => {
    const config = getPlatformConfig('claude');
    expect(config.detection).toBe('className');
  });

  it('should return languageLabel detection for Grok', () => {
    const config = getPlatformConfig('grok');
    expect(config.platform).toBe('grok');
    expect(config.detection).toBe('languageLabel');
    expect(config.languageLabelSelector).toBe('.text-secondary');
    expect(config.wrapperSelector).toBe("[data-testid='code-block']");
  });

  it('should return contentBased detection for Gemini', () => {
    const config = getPlatformConfig('gemini');
    expect(config.platform).toBe('gemini');
    expect(config.detection).toBe('contentBased');
    expect(config.codeBlockSelector).toBe("code[data-test-id='code-content']");
  });
});

describe('isMermaidContent', () => {
  it('should detect graph keyword', () => {
    expect(isMermaidContent('graph TD; A-->B;')).toBe(true);
    expect(isMermaidContent('graph LR\n  A --> B')).toBe(true);
  });

  it('should detect flowchart keyword', () => {
    expect(isMermaidContent('flowchart TD\n  A --> B')).toBe(true);
  });

  it('should detect sequenceDiagram keyword', () => {
    expect(isMermaidContent('sequenceDiagram\n  Alice->>Bob: Hello')).toBe(true);
  });

  it('should detect other mermaid keywords', () => {
    expect(isMermaidContent('classDiagram\n  class Animal')).toBe(true);
    expect(isMermaidContent('stateDiagram-v2\n  [*] --> First')).toBe(true);
    expect(isMermaidContent('erDiagram\n  CUSTOMER')).toBe(true);
    expect(isMermaidContent('gantt\n  title Project')).toBe(true);
    expect(isMermaidContent('pie\n  title Pets')).toBe(true);
    expect(isMermaidContent('mindmap\n  root')).toBe(true);
  });

  it('should be case insensitive', () => {
    expect(isMermaidContent('GRAPH TD; A-->B;')).toBe(true);
    expect(isMermaidContent('FlowChart LR')).toBe(true);
  });

  it('should return false for non-mermaid content', () => {
    expect(isMermaidContent('console.log("hello")')).toBe(false);
    expect(isMermaidContent('function foo() {}')).toBe(false);
    expect(isMermaidContent('const x = 1;')).toBe(false);
  });

  it('should handle whitespace', () => {
    expect(isMermaidContent('  graph TD; A-->B;')).toBe(true);
    expect(isMermaidContent('\n\ngraph TD')).toBe(true);
  });
});

describe('isMermaidCodeBlock', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('className detection (ChatGPT/Claude)', () => {
    const config = getPlatformConfig('chatgpt');

    it('should return true for language-mermaid class', () => {
      document.body.innerHTML = `
        <pre><code class="language-mermaid">graph TD; A-->B;</code></pre>
      `;
      const codeEl = document.querySelector('code')!;
      expect(isMermaidCodeBlock(codeEl, config)).toBe(true);
    });

    it('should return false for other language classes', () => {
      document.body.innerHTML = `
        <pre><code class="language-javascript">console.log("hi")</code></pre>
      `;
      const codeEl = document.querySelector('code')!;
      expect(isMermaidCodeBlock(codeEl, config)).toBe(false);
    });

    it('should return false for already processed blocks', () => {
      document.body.innerHTML = `
        <div data-mpr-processed="true">
          <pre><code class="language-mermaid">graph TD; A-->B;</code></pre>
        </div>
      `;
      const codeEl = document.querySelector('code')!;
      expect(isMermaidCodeBlock(codeEl, config)).toBe(false);
    });
  });

  describe('languageLabel detection (Grok)', () => {
    const config = getPlatformConfig('grok');

    it('should return true for Grok mermaid blocks', () => {
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">mermaid</span>
          <pre><code>graph TD; A-->B;</code></pre>
        </div>
      `;
      const wrapper = document.querySelector('[data-testid="code-block"]')!;
      expect(isMermaidCodeBlock(wrapper, config)).toBe(true);
    });

    it('should return true for Grok mermaid blocks (case insensitive)', () => {
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">Mermaid</span>
          <pre><code>graph TD; A-->B;</code></pre>
        </div>
      `;
      const wrapper = document.querySelector('[data-testid="code-block"]')!;
      expect(isMermaidCodeBlock(wrapper, config)).toBe(true);
    });

    it('should return false for other languages in Grok', () => {
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">javascript</span>
          <pre><code>console.log("hi")</code></pre>
        </div>
      `;
      const wrapper = document.querySelector('[data-testid="code-block"]')!;
      expect(isMermaidCodeBlock(wrapper, config)).toBe(false);
    });

    it('should return false for already processed Grok blocks', () => {
      document.body.innerHTML = `
        <div data-mpr-processed="true">
          <div data-testid="code-block">
            <span class="text-secondary">mermaid</span>
            <pre><code>graph TD; A-->B;</code></pre>
          </div>
        </div>
      `;
      const wrapper = document.querySelector('[data-testid="code-block"]')!;
      expect(isMermaidCodeBlock(wrapper, config)).toBe(false);
    });
  });

  describe('contentBased detection (Gemini)', () => {
    const config = getPlatformConfig('gemini');

    it('should return true for mermaid content', () => {
      document.body.innerHTML = `
        <code data-test-id="code-content" class="code-container ng-tns-c123">flowchart TD
          A --> B</code>
      `;
      const codeEl = document.querySelector('code')!;
      expect(isMermaidCodeBlock(codeEl, config)).toBe(true);
    });

    it('should return false for non-mermaid content', () => {
      document.body.innerHTML = `
        <code data-test-id="code-content" class="code-container">console.log("hi")</code>
      `;
      const codeEl = document.querySelector('code')!;
      expect(isMermaidCodeBlock(codeEl, config)).toBe(false);
    });

    it('should return false for already processed blocks', () => {
      document.body.innerHTML = `
        <div data-mpr-processed="true">
          <code data-test-id="code-content">graph TD; A-->B;</code>
        </div>
      `;
      const codeEl = document.querySelector('code')!;
      expect(isMermaidCodeBlock(codeEl, config)).toBe(false);
    });
  });
});

describe('findUnprocessedMermaidBlocks', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('className detection', () => {
    const config = getPlatformConfig('chatgpt');

    it('should find all unprocessed mermaid blocks', () => {
      document.body.innerHTML = `
        <pre><code class="language-mermaid">graph TD; A-->B;</code></pre>
        <pre><code class="language-mermaid">graph LR; X-->Y;</code></pre>
        <pre><code class="language-javascript">console.log("hi")</code></pre>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(2);
    });

    it('should exclude processed blocks', () => {
      document.body.innerHTML = `
        <pre><code class="language-mermaid">graph TD; A-->B;</code></pre>
        <div data-mpr-processed="true">
          <pre><code class="language-mermaid">graph LR; X-->Y;</code></pre>
        </div>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(1);
    });

    it('should return empty array when no mermaid blocks', () => {
      document.body.innerHTML = `
        <pre><code class="language-javascript">console.log("hi")</code></pre>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(0);
    });
  });

  describe('languageLabel detection (Grok)', () => {
    const config = getPlatformConfig('grok');

    it('should find Grok mermaid blocks', () => {
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">mermaid</span>
          <pre><code>graph TD; A-->B;</code></pre>
        </div>
        <div data-testid="code-block">
          <span class="text-secondary">javascript</span>
          <pre><code>console.log("hi")</code></pre>
        </div>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(1);
    });

    it('should exclude processed Grok blocks', () => {
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">mermaid</span>
          <pre><code>graph TD; A-->B;</code></pre>
        </div>
        <div data-testid="code-block" data-mpr-processed="true">
          <span class="text-secondary">mermaid</span>
          <pre><code>graph LR; X-->Y;</code></pre>
        </div>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(1);
    });
  });

  describe('contentBased detection (Gemini)', () => {
    const config = getPlatformConfig('gemini');

    it('should find Gemini mermaid blocks by content', () => {
      document.body.innerHTML = `
        <code data-test-id="code-content">flowchart TD
          A --> B</code>
        <code data-test-id="code-content">console.log("hi")</code>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(1);
    });

    it('should exclude processed Gemini blocks', () => {
      document.body.innerHTML = `
        <code data-test-id="code-content">graph TD; A-->B;</code>
        <div data-mpr-processed="true">
          <code data-test-id="code-content">graph LR; X-->Y;</code>
        </div>
      `;
      const blocks = findUnprocessedMermaidBlocks(config);
      expect(blocks).toHaveLength(1);
    });
  });
});
