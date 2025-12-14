# Mermaid Preserving Renderer Chrome Extension 개발 계획

> 상세 계획은 `~/.claude/plans/sequential-puzzling-twilight.md`에도 저장되어 있음

## 개요
LLM Chat Exporter와 호환되는 원본 보존형 Mermaid 렌더링 Chrome 확장 프로그램 개발

## 핵심 요구사항
1. **원본 코드 보존**: 렌더링 후에도 원본 mermaid 코드가 DOM에 존재해야 함
2. **LLM Chat Exporter 호환**: hidden된 원본을 쉽게 파싱 가능해야 함
3. **4개 플랫폼 지원**: ChatGPT, Claude, Gemini, Grok
4. **렌더러 ON 상태 유지**: 사용자가 끄지 않아도 됨

## 프로젝트 위치
`/Users/dragon/github/llm-chat-mermaid-renderer/` (별도 레포지토리)

---

## 파일 구조

```
llm-chat-mermaid-renderer/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── config/
│   └── selectors.json
├── src/
│   └── content/
│       ├── index.ts
│       ├── detector.ts
│       ├── renderer.ts
│       └── toggle.ts
├── styles/
│   └── mermaid-container.css
└── tests/
    └── unit/
```

---

## 원본 보존 DOM 구조

**변환 전:**
```html
<pre><code class="language-mermaid">graph TD; A-->B;</code></pre>
```

**변환 후:**
```html
<div class="mpr-container" data-mpr-processed="true">
  <!-- 원본 보존 (hidden) - LLM Chat Exporter가 이걸 파싱 -->
  <pre class="mpr-source" style="display:none">
    <code class="language-mermaid">graph TD; A-->B;</code>
  </pre>
  <!-- 렌더링된 SVG (visible) -->
  <div class="mpr-rendered"><svg>...</svg></div>
  <!-- 토글 버튼 -->
  <button class="mpr-toggle">{ }</button>
</div>
```

---

## 플랫폼별 셀렉터

| 플랫폼 | hostname | codeBlock 셀렉터 | 특이사항 |
|--------|----------|------------------|----------|
| ChatGPT | chatgpt.com | `pre code.language-mermaid` | - |
| Claude | claude.ai | `pre code.language-mermaid` | - |
| Gemini | gemini.google.com | `pre code.language-mermaid` | - |
| Grok | grok.com | `[data-testid='code-block'] pre code` | 언어 라벨이 별도 span |

### Grok 특수 처리
- **비활성화**: Grok은 자체 mermaid 렌더러가 있으므로 우리 확장 프로그램에서 처리하지 않음
- Grok 감지 시 `index.ts`에서 early return

---

## 구현 순서

1. **프로젝트 설정** - package.json, tsconfig, esbuild, manifest.json
2. **기본 구조** - content script 진입점, 플랫폼 감지
3. **셀렉터 설정** - config/selectors.json 작성
4. **Detector 구현** - MutationObserver, 코드 블록 감지
5. **Renderer 구현** - Mermaid.js 연동, Wrapper 구조 생성
6. **Toggle UI** - 버튼 컴포넌트, CSS
7. **테스트** - 각 플랫폼별 수동 테스트
8. **LLM Chat Exporter 호환 확인** - 통합 테스트

---

## 참조 파일

- `/Users/dragon/github/llm-chat-exporter/src/content/converter.ts` - LLM Chat Exporter HTML→Markdown 변환기
- `/Users/dragon/github/llm-chat-exporter/config/selectors.json` - 셀렉터 설정 패턴 참고
- `/Users/dragon/github/llm-chat-exporter/esbuild.config.mjs` - 빌드 설정 참고
- `./grok_mermaid_example.html` - Grok DOM 구조 참고
