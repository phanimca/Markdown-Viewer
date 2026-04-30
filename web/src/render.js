import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';
import joypixels from 'emoji-toolkit';
import mermaid from 'mermaid';
import { state, RENDER_DELAY, SANITIZE_CONFIG } from './state.js';
import { dom } from './dom.js';
import { preprocessMarkdown } from './preprocessors.js';
import { enhanceMermaidDiagrams } from './mermaid-utils.js';
import { invalidateSyncAnchors } from './scroll-sync.js';

// Configure marked with custom renderer (marked v5+ token-based API)
const renderer = new Renderer();
renderer.code = function (token) {
  const code = token.text || token;
  const language = token.lang || '';

  if (language === 'mermaid') {
    const uniqueId = 'mermaid-diagram-' + Math.random().toString(36).substring(2, 11);
    return `<div class="mermaid-container"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
  }

  const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
  const highlightedCode = hljs.highlight(code, {
    language: validLanguage,
  }).value;
  return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
};

marked.setOptions({
  gfm: true,
  breaks: false,
  pedantic: false,
  smartypants: false,
  xhtml: false,
  renderer: renderer,
});

export function processEmojis(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    let parent = node.parentNode;
    let isInCode = false;
    while (parent && parent !== element) {
      if (parent.tagName === 'PRE' || parent.tagName === 'CODE') {
        isInCode = true;
        break;
      }
      parent = parent.parentNode;
    }

    if (!isInCode && node.nodeValue.includes(':')) {
      textNodes.push(node);
    }
  }

  textNodes.forEach(textNode => {
    const text = textNode.nodeValue;
    const emojiRegex = /:([\w+-]+):/g;

    let match;
    let lastIndex = 0;
    let result = '';
    let hasEmoji = false;

    while ((match = emojiRegex.exec(text)) !== null) {
      const shortcode = match[1];
      const emoji = joypixels.shortnameToUnicode(`:${shortcode}:`);

      if (emoji !== `:${shortcode}:`) {
        hasEmoji = true;
        result += text.substring(lastIndex, match.index) + emoji;
        lastIndex = emojiRegex.lastIndex;
      } else {
        result += text.substring(lastIndex, emojiRegex.lastIndex);
        lastIndex = emojiRegex.lastIndex;
      }
    }

    if (hasEmoji) {
      result += text.substring(lastIndex);
      const span = document.createElement('span');
      span.textContent = result;
      textNode.parentNode.replaceChild(span, textNode);
    }
  });
}

export function updateMobileStats() {
  dom.mobileCharCount.textContent = dom.charCountElement.textContent;
  dom.mobileWordCount.textContent = dom.wordCountElement.textContent;
  dom.mobileReadingTime.textContent = dom.readingTimeElement.textContent;
}

export function updateDocumentStats() {
  const text = dom.markdownEditor.value;

  const charCount = text.length;
  dom.charCountElement.textContent = charCount.toLocaleString();

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  dom.wordCountElement.textContent = wordCount.toLocaleString();

  const readingTimeMinutes = Math.ceil(wordCount / 200);
  dom.readingTimeElement.textContent = readingTimeMinutes;
  updateMobileStats();
}

export async function renderMarkdown() {
  try {
    const markdown = dom.markdownEditor.value;
    const html = marked.parse(preprocessMarkdown(markdown));
    const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG);
    dom.markdownPreview.innerHTML = sanitizedHtml;

    dom.markdownPreview.querySelectorAll("pre code").forEach((block) => {
      try {
        if (!block.classList.contains('mermaid')) {
          hljs.highlightElement(block);
        }
      } catch (e) {
        console.warn("Syntax highlighting failed for a code block:", e);
      }
    });

    processEmojis(dom.markdownPreview);

    try {
      const mermaidNodes = dom.markdownPreview.querySelectorAll('.mermaid');
      if (mermaidNodes.length > 0) {
        await mermaid.run({
          nodes: mermaidNodes,
          suppressErrors: true
        });
      }
    } catch (e) {
      console.warn("Mermaid rendering failed:", e);
    }

    enhanceMermaidDiagrams(dom.markdownPreview);
    invalidateSyncAnchors();

    if (window.MathJax) {
      try {
        MathJax.typesetPromise([dom.markdownPreview]).catch((err) => {
          console.warn('MathJax typesetting failed:', err);
        });
      } catch (e) {
        console.warn("MathJax rendering failed:", e);
      }
    }

    updateDocumentStats();
  } catch (e) {
    console.error("Markdown rendering failed:", e);
    dom.markdownPreview.innerHTML = "";

    const errorAlert = document.createElement('div');
    errorAlert.className = 'alert alert-danger';
    const errorTitle = document.createElement('strong');
    errorTitle.textContent = 'Error rendering markdown:';
    const errorText = document.createTextNode(` ${e.message}`);
    errorAlert.appendChild(errorTitle);
    errorAlert.appendChild(errorText);

    const markdownSource = document.createElement('pre');
    markdownSource.textContent = dom.markdownEditor.value;

    dom.markdownPreview.appendChild(errorAlert);
    dom.markdownPreview.appendChild(markdownSource);
  }
}

export function debouncedRender() {
  clearTimeout(state.markdownRenderTimeout);
  state.markdownRenderTimeout = setTimeout(renderMarkdown, RENDER_DELAY);
}
