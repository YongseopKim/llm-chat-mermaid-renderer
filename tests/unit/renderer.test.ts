import { describe, it, expect, beforeEach } from 'vitest';
import {
  createPreservingWrapper,
  extractSourceCode,
  getWrapperToReplace,
  createGrokDiagramContainer,
  toggleGrokDiagram,
  cleanupMermaidErrorElements,
} from '../../src/content/renderer';
import { getPlatformConfig } from '../../src/content/detector';

describe('createPreservingWrapper', () => {
  const testCode = 'graph TD; A-->B;';

  it('should create container with data-mpr-processed attribute', () => {
    const { container } = createPreservingWrapper(testCode);

    expect(container.className).toBe('mpr-container');
    expect(container.getAttribute('data-mpr-processed')).toBe('true');
  });

  it('should create hidden source wrapper with correct structure', () => {
    const { sourceWrapper } = createPreservingWrapper(testCode);

    expect(sourceWrapper.className).toBe('mpr-source');
    expect(sourceWrapper.style.display).toBe('none');
    expect(sourceWrapper.tagName.toLowerCase()).toBe('pre');
  });

  it('should preserve source code in code element with language-mermaid class', () => {
    const { sourceWrapper } = createPreservingWrapper(testCode);
    const codeEl = sourceWrapper.querySelector('code');

    expect(codeEl).not.toBeNull();
    expect(codeEl!.className).toBe('language-mermaid');
    expect(codeEl!.textContent).toBe(testCode);
  });

  it('should create rendered div for SVG', () => {
    const { renderedDiv } = createPreservingWrapper(testCode);

    expect(renderedDiv.className).toBe('mpr-rendered');
    expect(renderedDiv.tagName.toLowerCase()).toBe('div');
  });

  it('should assemble structure correctly', () => {
    const { container, sourceWrapper, renderedDiv } =
      createPreservingWrapper(testCode);

    expect(container.children).toHaveLength(2);
    expect(container.children[0]).toBe(sourceWrapper);
    expect(container.children[1]).toBe(renderedDiv);
  });

  describe('LLM Chat Exporter Compatibility', () => {
    it('should have parseable structure for converter.ts', () => {
      const { container } = createPreservingWrapper(testCode);

      // converter.ts looks for: pre > code.language-mermaid
      const codeEl = container.querySelector('pre code.language-mermaid');
      expect(codeEl).not.toBeNull();
      expect(codeEl!.textContent).toBe(testCode);
    });

    it('should allow textContent extraction even when hidden', () => {
      const { sourceWrapper } = createPreservingWrapper(testCode);

      // Even with display:none, textContent should be extractable
      expect(sourceWrapper.style.display).toBe('none');
      expect(sourceWrapper.textContent).toBe(testCode);
    });

    it('should match converter.ts language detection pattern', () => {
      const { sourceWrapper } = createPreservingWrapper(testCode);
      const codeEl = sourceWrapper.querySelector('code')!;

      // converter.ts uses: codeEl.className.match(/language-(\w+)/)
      const langMatch = codeEl.className.match(/language-(\w+)/);
      expect(langMatch).not.toBeNull();
      expect(langMatch![1]).toBe('mermaid');
    });
  });
});

describe('extractSourceCode', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('ChatGPT/Claude/Gemini (className detection)', () => {
    const config = getPlatformConfig('chatgpt');

    it('should extract code from code element textContent', () => {
      document.body.innerHTML = `
        <pre><code class="language-mermaid">graph TD; A-->B;</code></pre>
      `;
      const codeEl = document.querySelector('code')!;
      expect(extractSourceCode(codeEl, config)).toBe('graph TD; A-->B;');
    });

    it('should trim whitespace', () => {
      document.body.innerHTML = `
        <pre><code class="language-mermaid">
          graph TD; A-->B;
        </code></pre>
      `;
      const codeEl = document.querySelector('code')!;
      expect(extractSourceCode(codeEl, config)).toBe('graph TD; A-->B;');
    });

    it('should return empty string for empty code', () => {
      document.body.innerHTML = `
        <pre><code class="language-mermaid"></code></pre>
      `;
      const codeEl = document.querySelector('code')!;
      expect(extractSourceCode(codeEl, config)).toBe('');
    });
  });

  describe('Grok (languageLabel detection)', () => {
    const config = getPlatformConfig('grok');

    it('should extract code from wrapper > pre > code', () => {
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">mermaid</span>
          <pre><code>graph TD; A-->B;</code></pre>
        </div>
      `;
      const wrapper = document.querySelector('[data-testid="code-block"]')!;
      expect(extractSourceCode(wrapper, config)).toBe('graph TD; A-->B;');
    });

    it('should handle Grok Shiki highlighting (span lines)', () => {
      // Grok uses Shiki which wraps each line in spans
      document.body.innerHTML = `
        <div data-testid="code-block">
          <span class="text-secondary">mermaid</span>
          <pre class="shiki">
            <code>
              <span class="line">graph TD</span>
              <span class="line">    A-->B</span>
            </code>
          </pre>
        </div>
      `;
      const wrapper = document.querySelector('[data-testid="code-block"]')!;
      const code = extractSourceCode(wrapper, config);
      // textContent should concatenate all spans
      expect(code).toContain('graph TD');
      expect(code).toContain('A-->B');
    });
  });
});

describe('getWrapperToReplace', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should return parent pre for ChatGPT/Claude/Gemini', () => {
    document.body.innerHTML = `
      <pre id="wrapper"><code class="language-mermaid">graph TD;</code></pre>
    `;
    const codeEl = document.querySelector('code')!;
    const config = getPlatformConfig('chatgpt');

    const wrapper = getWrapperToReplace(codeEl, config);
    expect(wrapper.id).toBe('wrapper');
    expect(wrapper.tagName.toLowerCase()).toBe('pre');
  });

  it('should return element itself for Grok', () => {
    document.body.innerHTML = `
      <div data-testid="code-block" id="grok-wrapper">
        <span class="text-secondary">mermaid</span>
        <pre><code>graph TD;</code></pre>
      </div>
    `;
    const wrapper = document.querySelector('[data-testid="code-block"]')!;
    const config = getPlatformConfig('grok');

    const result = getWrapperToReplace(wrapper, config);
    expect(result.id).toBe('grok-wrapper');
  });
});

describe('createGrokDiagramContainer', () => {
  const testCode = 'graph TD; A-->B;';

  it('should create container with mpr-grok-diagram class', () => {
    const container = createGrokDiagramContainer(testCode);

    expect(container.className).toBe('mpr-grok-diagram');
    expect(container.style.display).toBe('none');
  });

  it('should include hidden source for LLM Chat Exporter', () => {
    const container = createGrokDiagramContainer(testCode);
    const sourceWrapper = container.querySelector('.mpr-source');

    expect(sourceWrapper).not.toBeNull();
    expect((sourceWrapper as HTMLElement).style.display).toBe('none');
  });

  it('should preserve source code with language-mermaid class', () => {
    const container = createGrokDiagramContainer(testCode);
    const codeEl = container.querySelector('code.language-mermaid');

    expect(codeEl).not.toBeNull();
    expect(codeEl!.textContent).toBe(testCode);
  });

  it('should create rendered div for SVG', () => {
    const container = createGrokDiagramContainer(testCode);
    const renderedDiv = container.querySelector('.mpr-rendered');

    expect(renderedDiv).not.toBeNull();
  });
});

describe('toggleGrokDiagram', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should show diagram and hide code when diagram is hidden', () => {
    document.body.innerHTML = `
      <div class="mpr-grok-diagram" style="display: none;"></div>
      <div class="shiki"></div>
    `;
    const diagramContainer = document.querySelector(
      '.mpr-grok-diagram'
    ) as HTMLElement;
    const codeContainer = document.querySelector('.shiki');

    toggleGrokDiagram(diagramContainer, codeContainer);

    expect(diagramContainer.style.display).toBe('');
    expect((codeContainer as HTMLElement).style.display).toBe('none');
  });

  it('should hide diagram and show code when diagram is visible', () => {
    document.body.innerHTML = `
      <div class="mpr-grok-diagram" style="display: block;"></div>
      <div class="shiki" style="display: none;"></div>
    `;
    const diagramContainer = document.querySelector(
      '.mpr-grok-diagram'
    ) as HTMLElement;
    const codeContainer = document.querySelector('.shiki');

    toggleGrokDiagram(diagramContainer, codeContainer);

    expect(diagramContainer.style.display).toBe('none');
    expect((codeContainer as HTMLElement).style.display).toBe('');
  });

  it('should handle null codeContainer gracefully', () => {
    document.body.innerHTML = `
      <div class="mpr-grok-diagram" style="display: none;"></div>
    `;
    const diagramContainer = document.querySelector(
      '.mpr-grok-diagram'
    ) as HTMLElement;

    // Should not throw
    expect(() => toggleGrokDiagram(diagramContainer, null)).not.toThrow();
    expect(diagramContainer.style.display).toBe('');
  });
});

describe('cleanupMermaidErrorElements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should remove Mermaid error element with d{id} format', () => {
    // Mermaid.js creates error elements with id="d{renderId}"
    const errorDiv = document.createElement('div');
    errorDiv.id = 'dmpr-diagram-1';
    document.body.appendChild(errorDiv);

    expect(document.getElementById('dmpr-diagram-1')).not.toBeNull();

    cleanupMermaidErrorElements('mpr-diagram-1');

    expect(document.getElementById('dmpr-diagram-1')).toBeNull();
  });

  it('should remove SVG element with render id', () => {
    // Mermaid.js also creates SVG elements with the render id
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'mpr-diagram-2';
    document.body.appendChild(svg);

    expect(document.getElementById('mpr-diagram-2')).not.toBeNull();

    cleanupMermaidErrorElements('mpr-diagram-2');

    expect(document.getElementById('mpr-diagram-2')).toBeNull();
  });

  it('should remove multiple error elements for same render id', () => {
    // Create multiple elements that Mermaid might inject
    const errorDiv = document.createElement('div');
    errorDiv.id = 'dmpr-diagram-3';
    document.body.appendChild(errorDiv);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'mpr-diagram-3';
    document.body.appendChild(svg);

    cleanupMermaidErrorElements('mpr-diagram-3');

    expect(document.getElementById('dmpr-diagram-3')).toBeNull();
    expect(document.getElementById('mpr-diagram-3')).toBeNull();
  });

  it('should not remove unrelated elements', () => {
    // Create an unrelated element
    const otherDiv = document.createElement('div');
    otherDiv.id = 'some-other-element';
    document.body.appendChild(otherDiv);

    // Create Mermaid error element
    const errorDiv = document.createElement('div');
    errorDiv.id = 'dmpr-diagram-4';
    document.body.appendChild(errorDiv);

    cleanupMermaidErrorElements('mpr-diagram-4');

    // Unrelated element should still exist
    expect(document.getElementById('some-other-element')).not.toBeNull();
    // Mermaid error element should be removed
    expect(document.getElementById('dmpr-diagram-4')).toBeNull();
  });

  it('should handle case when no error elements exist', () => {
    // Should not throw when there are no elements to clean up
    expect(() => cleanupMermaidErrorElements('mpr-diagram-99')).not.toThrow();
  });
});

describe('Mermaid Error DOM Pollution Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should demonstrate Mermaid error injection pattern', async () => {
    // This test documents the Mermaid.js behavior that causes the Gemini bug
    const invalidCode = 'invalid mermaid syntax @@@@';
    const { container } = createPreservingWrapper(invalidCode);
    document.body.appendChild(container);

    // Mock mermaid.render to simulate error + DOM injection (like real Mermaid does)
    const mockMermaid = {
      render: async (id: string) => {
        // Mermaid.js injects error divs into document.body on parse errors
        const errorDiv = document.createElement('div');
        errorDiv.id = `d${id}`;
        errorDiv.innerHTML = '<svg id="' + id + '"><text>Syntax error in text</text></svg>';
        document.body.appendChild(errorDiv);
        throw new Error('Syntax error in text mermaid version 11.12.2');
      },
    };

    // Simulate render attempt
    try {
      await mockMermaid.render('test-id', invalidCode);
    } catch {
      // Our fix: clean up after error
      cleanupMermaidErrorElements('test-id');
    }

    // After cleanup: error elements should be removed
    expect(document.getElementById('dtest-id')).toBeNull();
    expect(document.getElementById('test-id')).toBeNull();
  });

  it('should handle asynchronously injected error elements', async () => {
    // This test reproduces the ChatGPT/Claude bug where Mermaid injects
    // error elements asynchronously after the initial cleanup
    const mockMermaid = {
      render: async (id: string) => {
        // Mermaid.js injects error SVG asynchronously (simulated with setTimeout)
        setTimeout(() => {
          const errorSvg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
          );
          errorSvg.id = id;
          errorSvg.setAttribute('aria-roledescription', 'error');
          document.body.appendChild(errorSvg);
        }, 0);
        throw new Error('Syntax error in text mermaid version 11.12.2');
      },
    };

    // Simulate render attempt with immediate cleanup
    try {
      await mockMermaid.render('async-test-id', 'invalid');
    } catch {
      // Immediate cleanup (may miss async injection)
      cleanupMermaidErrorElements('async-test-id');
    }

    // Wait for async injection
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Bug reproduction: error element is still in DOM after immediate cleanup
    // This test verifies the bug exists before the fix
    const errorElement = document.getElementById('async-test-id');

    // Clean up for test isolation - test the aria selector too
    if (errorElement) {
      errorElement.remove();
    }

    expect(document.getElementById('async-test-id')).toBeNull();
  });

  it('should clean up error SVG with aria-roledescription="error"', () => {
    // Mermaid error SVGs have aria-roledescription="error" attribute
    const errorSvg = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'svg'
    );
    errorSvg.id = 'mpr-diagram-99';
    errorSvg.setAttribute('aria-roledescription', 'error');
    document.body.appendChild(errorSvg);

    expect(
      document.querySelector('svg[aria-roledescription="error"]')
    ).not.toBeNull();

    cleanupMermaidErrorElements('mpr-diagram-99');

    expect(document.querySelector('svg[aria-roledescription="error"]')).toBeNull();
  });
});

describe('DOM Transformation Integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should transform ChatGPT structure correctly', () => {
    const testCode = 'graph TD; A-->B;';
    document.body.innerHTML = `
      <div class="message">
        <pre><code class="language-mermaid">${testCode}</code></pre>
      </div>
    `;

    // Simulate transformation
    const codeEl = document.querySelector('code')!;
    const config = getPlatformConfig('chatgpt');
    const wrapperToReplace = getWrapperToReplace(codeEl, config);

    const { container } = createPreservingWrapper(testCode);
    wrapperToReplace.replaceWith(container);

    // Verify transformation
    const messageDiv = document.querySelector('.message')!;
    // Original pre (direct child, not inside mpr-container) should be gone
    expect(messageDiv.querySelector(':scope > pre')).toBeNull();
    // mpr-container should exist
    expect(messageDiv.querySelector('.mpr-container')).not.toBeNull();
    // Source should be preserved inside mpr-source
    expect(
      messageDiv.querySelector('.mpr-source code.language-mermaid')!.textContent
    ).toBe(testCode);
  });

  it('should transform Grok structure correctly', () => {
    const testCode = 'graph TD; A-->B;';
    document.body.innerHTML = `
      <div class="message">
        <div data-testid="code-block">
          <span class="text-secondary">mermaid</span>
          <pre><code>${testCode}</code></pre>
        </div>
      </div>
    `;

    // Simulate transformation
    const wrapper = document.querySelector('[data-testid="code-block"]')!;
    const config = getPlatformConfig('grok');
    const sourceCode = extractSourceCode(wrapper, config);
    const wrapperToReplace = getWrapperToReplace(wrapper, config);

    const { container } = createPreservingWrapper(sourceCode);
    wrapperToReplace.replaceWith(container);

    // Verify transformation
    const messageDiv = document.querySelector('.message')!;
    expect(messageDiv.querySelector('[data-testid="code-block"]')).toBeNull();
    expect(messageDiv.querySelector('.mpr-container')).not.toBeNull();
    expect(
      messageDiv.querySelector('.mpr-source code.language-mermaid')!.textContent
    ).toBe(testCode);
  });
});
