document.addEventListener("DOMContentLoaded", function () {
  let markdownRenderTimeout = null;
  const RENDER_DELAY = 100;
  let syncScrollingEnabled = true;
  let isEditorScrolling = false;
  let isPreviewScrolling = false;
  let scrollSyncTimeout = null;
  const SCROLL_SYNC_DELAY = 10;

  // View Mode State - Story 1.1
  let currentViewMode = 'split'; // 'editor', 'split', or 'preview'

  const markdownEditor = document.getElementById("markdown-editor");
  const markdownPreview = document.getElementById("markdown-preview");
  const themeToggle = document.getElementById("theme-toggle");
  const openButton = document.getElementById("open-button");
  const openLocalBtn = document.getElementById("open-local");
  const openSharepointBtn = document.getElementById("open-sharepoint");
  const openAdoBtn = document.getElementById("open-ado");
  const saveButton = document.getElementById("save-button");
  const insertAdoTocButton = document.getElementById("insert-ado-toc");
  const insertAdoNoteButton = document.getElementById("insert-ado-note");
  const fileInput = document.getElementById("file-input");
  const exportMd = document.getElementById("export-md");
  const exportHtml = document.getElementById("export-html");
  const exportPdf = document.getElementById("export-pdf");
  const copyMarkdownButton = document.getElementById("copy-markdown-button");
  const dropzone = document.getElementById("dropzone");
  const closeDropzoneBtn = document.getElementById("close-dropzone");
  const toggleSyncButton = document.getElementById("toggle-sync");
  const editorPane = document.getElementById("markdown-editor");
  const previewPane = document.querySelector(".preview-pane");
  const readingTimeElement = document.getElementById("reading-time");
  const wordCountElement = document.getElementById("word-count");
  const charCountElement = document.getElementById("char-count");

  // View Mode Elements - Story 1.1
  const contentContainer = document.querySelector(".content-container");
  const viewModeButtons = document.querySelectorAll(".view-mode-btn");

  // Mobile View Mode Elements - Story 1.4
  const mobileViewModeButtons = document.querySelectorAll(".mobile-view-mode-btn");

  // Resize Divider Elements - Story 1.3
  const resizeDivider = document.querySelector(".resize-divider");
  const editorPaneElement = document.querySelector(".editor-pane");
  const previewPaneElement = document.querySelector(".preview-pane");
  let isResizing = false;
  let editorWidthPercent = 50; // Default 50%
  const MIN_PANE_PERCENT = 20; // Minimum 20% width

  const mobileMenuToggle    = document.getElementById("mobile-menu-toggle");
  const mobileMenuPanel     = document.getElementById("mobile-menu-panel");
  const mobileMenuOverlay   = document.getElementById("mobile-menu-overlay");
  const mobileCloseMenu     = document.getElementById("close-mobile-menu");
  const mobileReadingTime   = document.getElementById("mobile-reading-time");
  const mobileWordCount     = document.getElementById("mobile-word-count");
  const mobileCharCount     = document.getElementById("mobile-char-count");
  const mobileToggleSync    = document.getElementById("mobile-toggle-sync");
  const mobileOpenLocalBtn        = document.getElementById("mobile-open-local");
  const mobileOpenSharepointBtn   = document.getElementById("mobile-open-sharepoint");
  const mobileOpenAdoBtn          = document.getElementById("mobile-open-ado");
  const mobileSaveBtn       = document.getElementById("mobile-save-button");
  const mobileInsertAdoTocBtn = document.getElementById("mobile-insert-ado-toc");
  const mobileInsertAdoNoteBtn = document.getElementById("mobile-insert-ado-note");
  const mobileExportMd      = document.getElementById("mobile-export-md");
  const mobileExportHtml    = document.getElementById("mobile-export-html");
  const mobileExportPdf     = document.getElementById("mobile-export-pdf");
  const mobileCopyMarkdown  = document.getElementById("mobile-copy-markdown");
  const mobileThemeToggle   = document.getElementById("mobile-theme-toggle");

  // Check dark mode preference first for proper initialization
  const prefersDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  document.documentElement.setAttribute(
    "data-theme",
    prefersDarkMode ? "dark" : "light"
  );
  
  themeToggle.innerHTML = prefersDarkMode
    ? '<i class="bi bi-sun"></i>'
    : '<i class="bi bi-moon"></i>';

  const initMermaid = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const mermaidTheme = currentTheme === "dark" ? "dark" : "default";
    
    mermaid.initialize({
      startOnLoad: false,
      theme: mermaidTheme,
      securityLevel: 'strict',
      flowchart: { useMaxWidth: true, htmlLabels: false },
      fontSize: 16
    });
  };

  try {
    initMermaid();
  } catch (e) {
    console.warn("Mermaid initialization failed:", e);
  }

  let currentFileName = "document.md";
  let currentFileHandle = null;

  const markedOptions = {
    gfm: true,
    breaks: false,
    pedantic: false,
    smartypants: false,
    xhtml: false,
  };

  const renderer = new marked.Renderer();
  renderer.code = function (code, language) {
    if (language === 'mermaid') {
      const uniqueId = 'mermaid-diagram-' + Math.random().toString(36).substr(2, 9);
      return `<div class="mermaid-container"><div class="mermaid" id="${uniqueId}">${code}</div></div>`;
    }
    
    const validLanguage = hljs.getLanguage(language) ? language : "plaintext";
    const highlightedCode = hljs.highlight(code, {
      language: validLanguage,
    }).value;
    return `<pre><code class="hljs ${validLanguage}">${highlightedCode}</code></pre>`;
  };

  marked.setOptions({
    ...markedOptions,
    renderer: renderer,
  });

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slugifyHeading(text) {
    return String(text)
      .toLowerCase()
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  function buildAdoTocHtml(markdown) {
    const sourceWithoutCode = markdown.replace(/```[\s\S]*?```/g, '');
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items = [];
    let match;

    while ((match = headingRegex.exec(sourceWithoutCode)) !== null) {
      const level = match[1].length;
      const rawText = match[2].replace(/\s+#+\s*$/, '').trim();
      const anchor = slugifyHeading(rawText);
      if (!anchor) continue;

      items.push(`<li class="ado-toc-level-${level}"><a href="#${anchor}">${escapeHtml(rawText)}</a></li>`);
    }

    if (items.length === 0) {
      return '<div class="ado-toc"><div class="ado-toc-title">Table of contents</div><div class="ado-toc-empty">No headings found.</div></div>';
    }

    return `<nav class="ado-toc"><div class="ado-toc-title">Table of contents</div><ul>${items.join('')}</ul></nav>`;
  }

  function transformAdoWikiLinks(markdown) {
    return markdown.replace(/\[\[([^\]]+)\]\]/g, (fullMatch, content) => {
      const trimmed = content.trim();
      if (!trimmed) return fullMatch;
      if (trimmed.toUpperCase() === '_TOC_') return fullMatch;

      const pipeIndex = trimmed.indexOf('|');
      const targetPart = pipeIndex >= 0 ? trimmed.slice(0, pipeIndex).trim() : trimmed;
      const labelPart = pipeIndex >= 0 ? trimmed.slice(pipeIndex + 1).trim() : '';

      if (!targetPart) return fullMatch;

      const hashIndex = targetPart.indexOf('#');
      const pagePart = hashIndex >= 0 ? targetPart.slice(0, hashIndex).trim() : targetPart;
      const sectionPart = hashIndex >= 0 ? targetPart.slice(hashIndex + 1).trim() : '';
      const label = labelPart || targetPart;

      if (/^https?:\/\//i.test(targetPart)) {
        return `[${label}](${targetPart})`;
      }

      if (targetPart.startsWith('#')) {
        const anchorOnly = slugifyHeading(targetPart.slice(1));
        return `[${label}](#${anchorOnly})`;
      }

      const encodedPage = encodeURIComponent(pagePart).replace(/%2F/g, '/');
      const anchor = sectionPart ? `#${slugifyHeading(sectionPart)}` : '';
      const href = `${encodedPage}${anchor}`;
      return `[${label}](${href})`;
    });
  }

  function transformAdoCallouts(markdown) {
    const lines = markdown.split('\n');
    const output = [];
    let i = 0;

    while (i < lines.length) {
      const startMatch = lines[i].match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i);
      if (!startMatch) {
        output.push(lines[i]);
        i++;
        continue;
      }

      const kind = startMatch[1].toLowerCase();
      const title = startMatch[1].toUpperCase();
      i++;

      const bodyLines = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        bodyLines.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }

      const bodyHtml = escapeHtml(bodyLines.join('\n').trim()).replace(/\n/g, '<br>');
      output.push(`<div class="ado-callout ado-callout-${kind}"><div class="ado-callout-title">${title}</div><div class="ado-callout-body">${bodyHtml}</div></div>`);
    }

    return output.join('\n');
  }

  function preprocessMarkdown(markdown) {
    if (!markdown) return markdown;

    let result = markdown;

    // ADO wiki TOC token support.
    result = result.replace(/\[\[_TOC_\]\]/gi, () => buildAdoTocHtml(markdown));

    // ADO wiki alerts and wiki links support.
    result = transformAdoCallouts(result);
    result = transformAdoWikiLinks(result);

    // Support ::: mermaid containers by converting them to fenced code blocks.
    result = result.replace(
      /(^|\n)([ \t]{0,3}):::\s*mermaid\s*\n([\s\S]*?)\n\2:::(?=\n|$)/g,
      (match, prefix, indent, diagramBody) => {
        const normalizedBody = diagramBody.replace(/\n+$/, '');
        return `${prefix}${indent}\`\`\`mermaid\n${normalizedBody}\n${indent}\`\`\``;
      }
    );

    return result;
  }

  function applyMermaidZoom(container) {
    const svg = container.querySelector('.mermaid svg');
    if (!svg) return;

    const zoom = parseFloat(container.dataset.zoom || '1');

    const baseWidth = parseFloat(container.dataset.baseWidth || '0');
    const baseHeight = parseFloat(container.dataset.baseHeight || '0');
    if (!baseWidth || !baseHeight) return;

    svg.style.transform = '';
    svg.style.maxWidth = 'none';
    svg.style.height = 'auto';
    svg.setAttribute('width', String(Math.max(1, Math.round(baseWidth * zoom))));
    svg.setAttribute('height', String(Math.max(1, Math.round(baseHeight * zoom))));

    if (zoom > 1) {
      container.classList.add('mermaid-zoomed');
    } else {
      container.classList.remove('mermaid-zoomed');
    }
  }

  function fitMermaidToContainer(container) {
    const baseWidth = parseFloat(container.dataset.baseWidth || '0');
    if (!baseWidth) return;

    // Reserve a small gutter for borders/scrollbars so fit does not immediately overflow.
    const availableWidth = Math.max(1, container.clientWidth - 24);
    const fitZoom = Math.max(0.4, Math.min(3, availableWidth / baseWidth));
    container.dataset.zoom = String(fitZoom);
    container.dataset.zoomMode = 'fit';
    applyMermaidZoom(container);
  }

  async function saveMermaidAsPng(container, index) {
    const svg = container.querySelector('.mermaid svg');
    if (!svg) {
      alert('Mermaid diagram is not ready yet.');
      return;
    }

    try {
      const svgClone = svg.cloneNode(true);
      svgClone.removeAttribute('style');
      svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      const rect = svg.getBoundingClientRect();
      const viewBox = svg.viewBox && svg.viewBox.baseVal;
      const width = Math.max(1, Math.ceil((viewBox && viewBox.width) || rect.width));
      const height = Math.max(1, Math.ceil((viewBox && viewBox.height) || rect.height));

      if (!svgClone.getAttribute('viewBox')) {
        svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
      }
      svgClone.setAttribute('width', String(width));
      svgClone.setAttribute('height', String(height));

      const svgString = new XMLSerializer().serializeToString(svgClone);
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = svgDataUrl;
      });

      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;

      const context = canvas.getContext('2d');
      const theme = document.documentElement.getAttribute('data-theme');
      context.fillStyle = theme === 'dark' ? '#0d1117' : '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Prefer toDataURL + anchor download for better compatibility with file:// origins.
      const pngDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = pngDataUrl;
      link.download = `mermaid-diagram-${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export Mermaid PNG:', error);
      alert('Failed to export Mermaid as PNG.');
    }
  }

  function enhanceMermaidDiagrams(rootElement) {
    const containers = rootElement.querySelectorAll('.mermaid-container');

    containers.forEach((container, index) => {
      const mermaidNode = container.querySelector('.mermaid');
      const svg = container.querySelector('.mermaid svg');
      if (!mermaidNode || !svg) return;

      if (!container.dataset.zoom) {
        container.dataset.zoom = '1';
      }

      if (!container.dataset.baseWidth || !container.dataset.baseHeight) {
        const viewBox = svg.viewBox && svg.viewBox.baseVal;
        const rect = svg.getBoundingClientRect();
        const baseWidth = (viewBox && viewBox.width) || rect.width || 1;
        const baseHeight = (viewBox && viewBox.height) || rect.height || 1;

        container.dataset.baseWidth = String(baseWidth);
        container.dataset.baseHeight = String(baseHeight);
      }

      if (!container.classList.contains('mermaid-enhanced')) {
        container.classList.add('mermaid-enhanced');

        const controls = document.createElement('div');
        controls.className = 'mermaid-controls';
        controls.innerHTML = `
          <button type="button" class="mermaid-control-btn" data-action="zoom-out" title="Zoom Out">
            <i class="bi bi-zoom-out"></i>
          </button>
          <button type="button" class="mermaid-control-btn" data-action="zoom-in" title="Zoom In">
            <i class="bi bi-zoom-in"></i>
          </button>
          <button type="button" class="mermaid-control-btn" data-action="fit" title="Fit To Screen">
            <i class="bi bi-arrows-angle-contract"></i>
          </button>
          <button type="button" class="mermaid-control-btn" data-action="zoom-reset" title="Reset Zoom">
            <i class="bi bi-aspect-ratio"></i>
          </button>
          <button type="button" class="mermaid-control-btn" data-action="fullscreen" title="Fullscreen">
            <i class="bi bi-arrows-fullscreen"></i>
          </button>
          <button type="button" class="mermaid-control-btn" data-action="save-png" title="Save as PNG">
            <i class="bi bi-filetype-png"></i>
          </button>
        `;

        controls.addEventListener('click', async function (event) {
          const button = event.target.closest('button[data-action]');
          if (!button) return;

          const action = button.getAttribute('data-action');
          const currentZoom = parseFloat(container.dataset.zoom || '1');

          if (action === 'zoom-in') {
            container.dataset.zoom = String(Math.min(3, currentZoom + 0.2));
            container.dataset.zoomMode = 'manual';
            applyMermaidZoom(container);
          } else if (action === 'zoom-out') {
            container.dataset.zoom = String(Math.max(0.4, currentZoom - 0.2));
            container.dataset.zoomMode = 'manual';
            applyMermaidZoom(container);
          } else if (action === 'fit') {
            fitMermaidToContainer(container);
          } else if (action === 'zoom-reset') {
            container.dataset.zoom = '1';
            container.dataset.zoomMode = 'manual';
            applyMermaidZoom(container);
          } else if (action === 'fullscreen') {
            try {
              if (document.fullscreenElement === container) {
                await document.exitFullscreen();
              } else {
                await container.requestFullscreen();
              }
            } catch (error) {
              console.warn('Fullscreen not available:', error);
            }
          } else if (action === 'save-png') {
            saveMermaidAsPng(container, index);
          }
        });

        const adjustZoom = (delta) => {
          const currentZoom = parseFloat(container.dataset.zoom || '1');
          const nextZoom = Math.max(0.4, Math.min(3, currentZoom + delta));
          container.dataset.zoom = String(nextZoom);
          container.dataset.zoomMode = 'manual';
          applyMermaidZoom(container);
        };

        container.addEventListener('wheel', function (event) {
          // Use Ctrl/Cmd + wheel to zoom diagram without changing normal scroll behavior.
          if (!(event.ctrlKey || event.metaKey)) return;

          event.preventDefault();
          const delta = event.deltaY < 0 ? 0.1 : -0.1;
          adjustZoom(delta);
        }, { passive: false });

        // Extra mouse-button controls:
        // - Side mouse buttons: back(3)=zoom out, forward(4)=zoom in
        // - Middle click: zoom in
        // - Shift + right click: zoom out
        container.addEventListener('mousedown', function (event) {
          if (event.button === 3) {
            event.preventDefault();
            adjustZoom(-0.2);
          } else if (event.button === 4) {
            event.preventDefault();
            adjustZoom(0.2);
          }
        });

        container.addEventListener('auxclick', function (event) {
          if (event.button === 1) {
            event.preventDefault();
            adjustZoom(0.2);
          }
        });

        container.addEventListener('contextmenu', function (event) {
          if (event.shiftKey) {
            event.preventDefault();
            adjustZoom(-0.2);
          }
        });

        container.addEventListener('pointerdown', function (event) {
          if (event.button !== 0) return;

          container.dataset.dragging = 'true';
          container.dataset.dragStartX = String(event.clientX);
          container.dataset.dragStartY = String(event.clientY);
          container.dataset.dragScrollLeft = String(container.scrollLeft);
          container.dataset.dragScrollTop = String(container.scrollTop);
          container.classList.add('mermaid-dragging');
          event.preventDefault();
        });

        container.addEventListener('pointermove', function (event) {
          if (container.dataset.dragging !== 'true') return;

          const startX = parseFloat(container.dataset.dragStartX || '0');
          const startY = parseFloat(container.dataset.dragStartY || '0');
          const startLeft = parseFloat(container.dataset.dragScrollLeft || '0');
          const startTop = parseFloat(container.dataset.dragScrollTop || '0');

          container.scrollLeft = startLeft - (event.clientX - startX);
          container.scrollTop = startTop - (event.clientY - startY);
        });

        const stopDragging = () => {
          if (container.dataset.dragging !== 'true') return;
          container.dataset.dragging = 'false';
          container.classList.remove('mermaid-dragging');
        };

        container.addEventListener('pointerup', stopDragging);
        container.addEventListener('pointerleave', stopDragging);
        container.addEventListener('pointercancel', stopDragging);

        container.insertBefore(controls, mermaidNode);
      }

      applyMermaidZoom(container);
    });
  }

  const SANITIZE_CONFIG = {
    ADD_TAGS: ['mjx-container'],
    ADD_ATTR: ['id', 'class', 'style']
  };

  const SANITIZE_CONFIG_PDF = {
    ADD_TAGS: ['mjx-container', 'svg', 'path', 'g', 'marker', 'defs', 'pattern', 'clipPath'],
    ADD_ATTR: ['id', 'class', 'style', 'viewBox', 'd', 'fill', 'stroke', 'transform', 'marker-end', 'marker-start']
  };

  const DEBUG_PDF_EXPORT = false;
  function debugPdfExport(...args) {
    if (DEBUG_PDF_EXPORT) {
      console.log(...args);
    }
  }

  const sampleMarkdown = `# Welcome to Markdown Viewer

## ✨ Key Features
- **Live Preview** with GitHub styling
- **Smart Import/Export** (MD, HTML, PDF)
- **Mermaid Diagrams** for visual documentation
- **LaTeX Math Support** for scientific notation
- **Emoji Support** 😄 👍 🎉

## 💻 Code with Syntax Highlighting
\`\`\`javascript
  async function renderMarkdown() {
    const markdown = markdownEditor.value;
    const html = marked.parse(markdown);
    const sanitizedHtml = DOMPurify.sanitize(html);
    markdownPreview.innerHTML = sanitizedHtml;
    
    // Apply syntax highlighting to code blocks
    markdownPreview.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
  }
\`\`\`

## 🧮 Mathematical Expressions
Write complex formulas with LaTeX syntax:

Inline equation: $$E = mc^2$$

Display equations:
$$\\frac{\\partial f}{\\partial x} = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

$$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$$

## 📊 Mermaid Diagrams
Create powerful visualizations directly in markdown:

\`\`\`mermaid
flowchart LR
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    C --> E[Deploy]
    D --> B
\`\`\`

### Sequence Diagram Example
\`\`\`mermaid
sequenceDiagram
    User->>Editor: Type markdown
    Editor->>Preview: Render content
    User->>Editor: Make changes
    Editor->>Preview: Update rendering
    User->>Export: Save as PDF
\`\`\`

## 📋 Task Management
- [x] Create responsive layout
- [x] Implement live preview with GitHub styling
- [x] Add syntax highlighting for code blocks
- [x] Support math expressions with LaTeX
- [x] Enable mermaid diagrams

## 🆚 Feature Comparison

| Feature                  | Markdown Viewer (Ours) | Other Markdown Editors  |
|:-------------------------|:----------------------:|:-----------------------:|
| Live Preview             | ✅ GitHub-Styled       | ✅                     |
| Sync Scrolling           | ✅ Two-way             | 🔄 Partial/None        |
| Mermaid Support          | ✅                     | ❌/Limited             |
| LaTeX Math Rendering     | ✅                     | ❌/Limited             |

### 📝 Multi-row Headers Support

<table>
  <thead>
    <tr>
      <th rowspan="2">Document Type</th>
      <th colspan="2">Support</th>
    </tr>
    <tr>
      <th>Markdown Viewer (Ours)</th>
      <th>Other Markdown Editors</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Technical Docs</td>
      <td>Full + Diagrams</td>
      <td>Limited/Basic</td>
    </tr>
    <tr>
      <td>Research Notes</td>
      <td>Full + Math</td>
      <td>Partial</td>
    </tr>
    <tr>
      <td>Developer Guides</td>
      <td>Full + Export Options</td>
      <td>Basic</td>
    </tr>
  </tbody>
</table>

## 📝 Text Formatting Examples

### Text Formatting

Text can be formatted in various ways for ~~strikethrough~~, **bold**, *italic*, or ***bold italic***.

For highlighting important information, use <mark>highlighted text</mark> or add <u>underlines</u> where appropriate.

### Superscript and Subscript

Chemical formulas: H<sub>2</sub>O, CO<sub>2</sub>  
Mathematical notation: x<sup>2</sup>, e<sup>iπ</sup>

### Keyboard Keys

Press <kbd>Ctrl</kbd> + <kbd>B</kbd> for bold text.

### Abbreviations

<abbr title="Graphical User Interface">GUI</abbr>  
<abbr title="Application Programming Interface">API</abbr>

### Text Alignment

<div style="text-align: center">
Centered text for headings or important notices
</div>

<div style="text-align: right">
Right-aligned text (for dates, signatures, etc.)
</div>

### **Lists**

Create bullet points:
* Item 1
* Item 2
  * Nested item
    * Nested further

### **Links and Images**

Add a [link](https://github.com/ThisIs-Developer/Markdown-Viewer) to important resources.

Embed an image:
![Markdown Logo](https://example.com/logo.png)

### **Blockquotes**

Quote someone famous:
> "The best way to predict the future is to invent it." - Alan Kay

---

## 🛡️ Security Note

This is a fully client-side application. Your content never leaves your browser and stays secure on your device.`;

  markdownEditor.value = sampleMarkdown;

  async function renderMarkdown() {
    try {
      const markdown = markdownEditor.value;
      const html = marked.parse(preprocessMarkdown(markdown));
      const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG);
      markdownPreview.innerHTML = sanitizedHtml;

      markdownPreview.querySelectorAll("pre code").forEach((block) => {
        try {
          if (!block.classList.contains('mermaid')) {
            hljs.highlightElement(block);
          }
        } catch (e) {
          console.warn("Syntax highlighting failed for a code block:", e);
        }
      });

      processEmojis(markdownPreview);
      
      // Reinitialize mermaid with current theme before rendering diagrams
      initMermaid();
      
      try {
        const mermaidNodes = markdownPreview.querySelectorAll('.mermaid');
        if (mermaidNodes.length > 0) {
          await mermaid.run({
            nodes: mermaidNodes,
            suppressErrors: true
          });
        }
      } catch (e) {
        console.warn("Mermaid rendering failed:", e);
      }

      enhanceMermaidDiagrams(markdownPreview);
      invalidateSyncAnchors();
      
      if (window.MathJax) {
        try {
          MathJax.typesetPromise([markdownPreview]).catch((err) => {
            console.warn('MathJax typesetting failed:', err);
          });
        } catch (e) {
          console.warn("MathJax rendering failed:", e);
        }
      }

      updateDocumentStats();
    } catch (e) {
      console.error("Markdown rendering failed:", e);
      markdownPreview.innerHTML = "";

      const errorAlert = document.createElement('div');
      errorAlert.className = 'alert alert-danger';
      const errorTitle = document.createElement('strong');
      errorTitle.textContent = 'Error rendering markdown:';
      const errorText = document.createTextNode(` ${e.message}`);
      errorAlert.appendChild(errorTitle);
      errorAlert.appendChild(errorText);

      const markdownSource = document.createElement('pre');
      markdownSource.textContent = markdownEditor.value;

      markdownPreview.appendChild(errorAlert);
      markdownPreview.appendChild(markdownSource);
    }
  }

  function importMarkdownFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      markdownEditor.value = e.target.result;
      currentFileName = file.name || "document.md";
      currentFileHandle = null;
      renderMarkdown();
      dropzone.style.display = "none";
    };
    reader.readAsText(file);
  }

  async function openMarkdownFile() {
    // Use the File System Access API when available for a native open dialog.
    if (window.showOpenFilePicker) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [{
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md', '.markdown'],
              'text/plain': ['.txt']
            }
          }],
          excludeAcceptAllOption: false,
          multiple: false
        });

        if (!fileHandle) return;

        const file = await fileHandle.getFile();
        const content = await file.text();
        markdownEditor.value = content;
        currentFileName = file.name || "document.md";
        currentFileHandle = fileHandle;
        renderMarkdown();
        return;
      } catch (e) {
        // AbortError means the user closed the picker intentionally.
        if (e && e.name !== 'AbortError') {
          console.warn("Native open dialog failed, using fallback:", e);
        }
      }
    }

    fileInput.click();
  }

  async function saveMarkdownFile() {
      async function importFromSharePoint(url) {
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch {
          throw new Error("Invalid URL format. Please provide a full SharePoint HTTPS URL.");
        }

        if (parsedUrl.protocol !== "https:") {
          throw new Error("Only HTTPS SharePoint URLs are allowed.");
        }

        let resp;
        try {
          resp = await fetch(url);
        } catch (e) {
          throw new Error(
            "Failed to fetch the file. This is often a CORS restriction. " +
            "Ensure the SharePoint file is shared with \u2018Anyone with the link\u2019 and the URL is a direct download link."
          );
        }
        if (!resp.ok) {
          throw new Error(
            "SharePoint returned HTTP " + resp.status + ": " + resp.statusText +
            ". Check that the URL is correct and the file is publicly accessible."
          );
        }
        const text = await resp.text();
        const fileName = parsedUrl.pathname.split("/").pop() || "sharepoint.md";
        markdownEditor.value = text;
        currentFileName = fileName;
        currentFileHandle = null;
        renderMarkdown();
      }

      async function importFromAdo(org, project, repo, branch, filePath, pat) {
        if (!filePath.startsWith("/")) filePath = "/" + filePath;
        const url = new URL(
          "https://dev.azure.com/" +
          encodeURIComponent(org) + "/" +
          encodeURIComponent(project) +
          "/_apis/git/repositories/" +
          encodeURIComponent(repo) + "/items"
        );
        url.searchParams.set("path", filePath);
        url.searchParams.set("versionDescriptor.version", branch);
        url.searchParams.set("versionDescriptor.versionType", "branch");
        url.searchParams.set("$format", "text");
        url.searchParams.set("api-version", "7.1");
        const headers = { "Accept": "text/plain" };
        if (pat) {
          headers["Authorization"] = "Basic " + btoa(":" + pat);
        }
        let resp;
        try {
          resp = await fetch(url.toString(), { headers });
        } catch (e) {
          throw new Error(
            "Network error contacting Azure DevOps. " +
            "Check your connection or that the organization name is correct."
          );
        }
        if (resp.status === 401 || resp.status === 403) {
          throw new Error(
            "Authentication failed (HTTP " + resp.status + "). " +
            "Provide a valid PAT with Code (Read) scope for private repositories."
          );
        }
        if (!resp.ok) {
          throw new Error("Azure DevOps returned HTTP " + resp.status + ": " + resp.statusText);
        }
        const text = await resp.text();
        const fileName = filePath.split("/").pop() || "ado.md";
        markdownEditor.value = text;
        currentFileName = fileName;
        currentFileHandle = null;
        renderMarkdown();
      }

    const markdownText = markdownEditor.value;

    if (window.showSaveFilePicker) {
      try {
        const fileHandle = currentFileHandle || await window.showSaveFilePicker({
          suggestedName: currentFileName,
          types: [{
            description: 'Markdown Files',
            accept: {
              'text/markdown': ['.md'],
              'text/plain': ['.txt']
            }
          }]
        });

        const writable = await fileHandle.createWritable();
        await writable.write(markdownText);
        await writable.close();

        currentFileHandle = fileHandle;
        return;
      } catch (e) {
        if (e && e.name !== 'AbortError') {
          console.warn("Native save dialog failed, using fallback:", e);
        } else {
          return;
        }
      }
    }

    const blob = new Blob([markdownText], {
      type: "text/markdown;charset=utf-8",
    });
    saveAs(blob, currentFileName || "document.md");
  }

  function exportMarkdownFile() {
    const blob = new Blob([markdownEditor.value], {
      type: "text/markdown;charset=utf-8",
    });
    saveAs(blob, "document.md");
  }

  function insertTextAtCursor(text, selectStartOffset = null, selectEndOffset = null) {
    const start = markdownEditor.selectionStart;
    const end = markdownEditor.selectionEnd;
    const currentValue = markdownEditor.value;

    markdownEditor.value = currentValue.substring(0, start) + text + currentValue.substring(end);

    if (selectStartOffset !== null && selectEndOffset !== null) {
      markdownEditor.selectionStart = start + selectStartOffset;
      markdownEditor.selectionEnd = start + selectEndOffset;
    } else {
      const caret = start + text.length;
      markdownEditor.selectionStart = caret;
      markdownEditor.selectionEnd = caret;
    }

    markdownEditor.focus();
    markdownEditor.dispatchEvent(new Event('input'));
  }

  function insertAdoTocSnippet() {
    insertTextAtCursor('[[_TOC_]]\n\n');
  }

  function insertAdoNoteSnippet() {
    const snippet = '> [!NOTE]\n> Add your note here.\n\n';
    const placeholder = 'Add your note here.';
    const startOffset = snippet.indexOf(placeholder);
    insertTextAtCursor(snippet, startOffset, startOffset + placeholder.length);
  }

  function processEmojis(element) {
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
        
        if (emoji !== `:${shortcode}:`) { // If conversion was successful
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

  function debouncedRender() {
    clearTimeout(markdownRenderTimeout);
    markdownRenderTimeout = setTimeout(renderMarkdown, RENDER_DELAY);
  }

  function updateDocumentStats() {
    const text = markdownEditor.value;

    const charCount = text.length;
    charCountElement.textContent = charCount.toLocaleString();

    const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    wordCountElement.textContent = wordCount.toLocaleString();

    const readingTimeMinutes = Math.ceil(wordCount / 200);
    readingTimeElement.textContent = readingTimeMinutes;
  }

  // ── Anchor-based scroll & click sync ─────────────────────────────────────
  // Anchors pair each heading's pixel position in the editor with its rendered
  // pixel position in the preview, then piecewise-interpolate between them.
  // The cache is invalidated after every render and on window resize so it
  // always reflects the current DOM layout.

  let syncAnchorsCache = null;

  function invalidateSyncAnchors() {
    syncAnchorsCache = null;
  }

  // Creates a hidden mirror div matching the textarea's styles and returns the
  // accumulated scrollHeight (= top-of-line offset) for each requested line index.
  function measureEditorLineOffsets(lineIndices) {
    if (lineIndices.length === 0) return [];

    const mirror = document.createElement('div');
    const cs = window.getComputedStyle(editorPane);
    [
      'fontFamily','fontSize','fontWeight','fontStyle','fontVariant',
      'lineHeight','letterSpacing','wordSpacing','textIndent',
      'paddingTop','paddingRight','paddingBottom','paddingLeft',
      'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
      'boxSizing'
    ].forEach(p => { mirror.style[p] = cs[p]; });

    mirror.style.width        = editorPane.clientWidth + 'px';
    mirror.style.position     = 'absolute';
    mirror.style.visibility   = 'hidden';
    mirror.style.top          = '-9999px';
    mirror.style.left         = '-9999px';
    mirror.style.whiteSpace   = 'pre-wrap';
    mirror.style.overflowWrap = 'break-word';
    mirror.style.overflow     = 'hidden';
    mirror.style.height       = 'auto';

    document.body.appendChild(mirror);

    const lines   = markdownEditor.value.split('\n');
    const results = [];

    for (const idx of lineIndices) {
      const textBefore = lines.slice(0, idx).join('\n');
      // Trailing newline ensures the mirror's height ends at the start of line idx.
      mirror.textContent = textBefore ? textBefore + '\n' : '';
      results.push(mirror.scrollHeight);
    }

    document.body.removeChild(mirror);
    return results;
  }

  // Absolute pixel offset of `el` within the previewPane scroll content.
  function previewAbsoluteTop(el) {
    const rect     = el.getBoundingClientRect();
    const paneRect = previewPane.getBoundingClientRect();
    return previewPane.scrollTop + (rect.top - paneRect.top);
  }

  function buildSyncAnchors() {
    if (syncAnchorsCache) return syncAnchorsCache;

    const lines          = markdownEditor.value.split('\n');
    const editorScrollMax  = editorPane.scrollHeight  - editorPane.clientHeight;
    const previewScrollMax = previewPane.scrollHeight - previewPane.clientHeight;

    if (editorScrollMax < 1 || previewScrollMax < 1) {
      syncAnchorsCache = [{ editorPx: 0, previewPx: 0 }];
      return syncAnchorsCache;
    }

    // Collect 0-based line indices of headings in source order.
    const headingLineIndices = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^#{1,6}\s/.test(lines[i])) headingLineIndices.push(i);
    }

    const previewHeadings = Array.from(
      markdownPreview.querySelectorAll('h1,h2,h3,h4,h5,h6')
    );

    const anchors = [{ editorPx: 0, previewPx: 0 }];
    const count   = Math.min(headingLineIndices.length, previewHeadings.length);

    if (count > 0) {
      const editorOffsets = measureEditorLineOffsets(headingLineIndices.slice(0, count));

      for (let i = 0; i < count; i++) {
        const editorPx  = Math.min(editorOffsets[i],                              editorScrollMax);
        const previewPx = Math.min(previewAbsoluteTop(previewHeadings[i]),        previewScrollMax);
        const last      = anchors[anchors.length - 1];
        // Keep anchors strictly monotone on the editor axis.
        if (editorPx > last.editorPx && previewPx >= last.previewPx) {
          anchors.push({ editorPx, previewPx });
        }
      }
    }

    anchors.push({ editorPx: editorScrollMax, previewPx: previewScrollMax });
    syncAnchorsCache = anchors;
    return anchors;
  }

  // Piecewise linear interpolation along the anchor chain.
  function piecewiseMap(anchors, fromKey, toKey, value) {
    if (anchors.length === 0) return 0;
    if (value <= anchors[0][fromKey]) return anchors[0][toKey];
    const last = anchors[anchors.length - 1];
    if (value >= last[fromKey]) return last[toKey];

    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i], b = anchors[i + 1];
      if (value >= a[fromKey] && value <= b[fromKey]) {
        const span = b[fromKey] - a[fromKey];
        const r    = span > 0 ? (value - a[fromKey]) / span : 0;
        return a[toKey] + r * (b[toKey] - a[toKey]);
      }
    }
    return last[toKey];
  }

  // ── Scroll sync ───────────────────────────────────────────────────────────
  function syncEditorToPreview() {
    if (!syncScrollingEnabled || isPreviewScrolling) return;

    isEditorScrolling = true;
    clearTimeout(scrollSyncTimeout);

    scrollSyncTimeout = setTimeout(() => {
      const anchors        = buildSyncAnchors();
      const target         = piecewiseMap(anchors, 'editorPx', 'previewPx', editorPane.scrollTop);
      const previewScrollMax = previewPane.scrollHeight - previewPane.clientHeight;

      if (isFinite(target)) {
        previewPane.scrollTop = Math.max(0, Math.min(target, previewScrollMax));
      }
      setTimeout(() => { isEditorScrolling = false; }, 50);
    }, SCROLL_SYNC_DELAY);
  }

  function syncPreviewToEditor() {
    if (!syncScrollingEnabled || isEditorScrolling) return;

    isPreviewScrolling = true;
    clearTimeout(scrollSyncTimeout);

    scrollSyncTimeout = setTimeout(() => {
      const anchors       = buildSyncAnchors();
      const target        = piecewiseMap(anchors, 'previewPx', 'editorPx', previewPane.scrollTop);
      const editorScrollMax = editorPane.scrollHeight - editorPane.clientHeight;

      if (isFinite(target)) {
        editorPane.scrollTop = Math.max(0, Math.min(target, editorScrollMax));
      }
      setTimeout(() => { isPreviewScrolling = false; }, 50);
    }, SCROLL_SYNC_DELAY);
  }

  // ── Click sync ────────────────────────────────────────────────────────────
  // Editor click → scroll preview to the line the cursor landed on.
  function syncEditorClickToPreview() {
    if (!syncScrollingEnabled) return;

    const textBefore = markdownEditor.value.substring(0, markdownEditor.selectionStart);
    const lineIndex  = textBefore.split('\n').length - 1;
    const offsets    = measureEditorLineOffsets([lineIndex]);
    const editorPx   = offsets[0];
    const anchors    = buildSyncAnchors();
    const target     = piecewiseMap(anchors, 'editorPx', 'previewPx', editorPx);
    const previewScrollMax = previewPane.scrollHeight - previewPane.clientHeight;

    if (isFinite(target)) {
      isEditorScrolling = true;
      previewPane.scrollTop = Math.max(0, Math.min(target, previewScrollMax));
      setTimeout(() => { isEditorScrolling = false; }, 100);
    }
  }

  // Preview click → scroll editor to the corresponding position.
  function syncPreviewClickToEditor(event) {
    if (!syncScrollingEnabled) return;

    const paneRect       = previewPane.getBoundingClientRect();
    const clickedPreviewPx = previewPane.scrollTop + (event.clientY - paneRect.top);
    const anchors        = buildSyncAnchors();
    const target         = piecewiseMap(anchors, 'previewPx', 'editorPx', clickedPreviewPx);
    const editorScrollMax  = editorPane.scrollHeight - editorPane.clientHeight;

    if (isFinite(target)) {
      isPreviewScrolling = true;
      editorPane.scrollTop = Math.max(0, Math.min(target, editorScrollMax));
      setTimeout(() => { isPreviewScrolling = false; }, 100);
    }
  }

  function toggleSyncScrolling() {
    syncScrollingEnabled = !syncScrollingEnabled;
    const buttons = [
      { el: toggleSyncButton,  mobile: false },
      { el: mobileToggleSync,  mobile: true  }
    ].filter(b => b.el);
    if (syncScrollingEnabled) {
      buttons.forEach(({ el, mobile }) => {
        el.innerHTML = `<i class="bi bi-link-45deg${mobile ? ' me-2' : ''}"></i> Sync On`;
        el.classList.add("sync-enabled", "border-primary");
        el.classList.remove("sync-disabled");
      });
    } else {
      buttons.forEach(({ el, mobile }) => {
        el.innerHTML = `<i class="bi bi-link${mobile ? ' me-2' : ''}"></i> Sync Off`;
        el.classList.add("sync-disabled");
        el.classList.remove("sync-enabled", "border-primary");
      });
    }
  }

  // View Mode Functions - Story 1.1 & 1.2
  function setViewMode(mode) {
    if (mode === currentViewMode) return;

    const previousMode = currentViewMode;
    currentViewMode = mode;

    // Update content container class
    contentContainer.classList.remove('view-editor-only', 'view-preview-only', 'view-split');
    contentContainer.classList.add('view-' + (mode === 'editor' ? 'editor-only' : mode === 'preview' ? 'preview-only' : 'split'));

    // Update button active states (desktop)
    viewModeButtons.forEach(btn => {
      const btnMode = btn.getAttribute('data-mode');
      if (btnMode === mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Story 1.4: Update mobile button active states
    mobileViewModeButtons.forEach(btn => {
      const btnMode = btn.getAttribute('data-mode');
      if (btnMode === mode) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });

    // Story 1.2: Show/hide sync toggle based on view mode
    updateSyncToggleVisibility(mode);

    // Story 1.3: Handle pane widths when switching modes
    if (mode === 'split') {
      // Restore preserved pane widths when entering split mode
      applyPaneWidths();
    } else if (previousMode === 'split') {
      // Reset pane widths when leaving split mode
      resetPaneWidths();
    }

    // Re-render markdown when switching to a view that includes preview
    if (mode === 'split' || mode === 'preview') {
      renderMarkdown();
    }
  }

  // Story 1.2: Update sync toggle visibility
  function updateSyncToggleVisibility(mode) {
    const isSplitView = mode === 'split';

    // Desktop sync toggle
    if (toggleSyncButton) {
      toggleSyncButton.style.display = isSplitView ? '' : 'none';
      toggleSyncButton.setAttribute('aria-hidden', !isSplitView);
    }

    // Mobile sync toggle
    if (mobileToggleSync) {
      mobileToggleSync.style.display = isSplitView ? '' : 'none';
      mobileToggleSync.setAttribute('aria-hidden', !isSplitView);
    }
  }

  // Story 1.3: Resize Divider Functions
  function initResizer() {
    if (!resizeDivider) return;

    resizeDivider.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);

    // Touch support for tablets (though disabled via CSS, keeping for future)
    resizeDivider.addEventListener('touchstart', startResizeTouch);
    document.addEventListener('touchmove', handleResizeTouch);
    document.addEventListener('touchend', stopResize);
  }

  function startResize(e) {
    if (currentViewMode !== 'split') return;
    e.preventDefault();
    isResizing = true;
    resizeDivider.classList.add('dragging');
    document.body.classList.add('resizing');
  }

  function startResizeTouch(e) {
    if (currentViewMode !== 'split') return;
    e.preventDefault();
    isResizing = true;
    resizeDivider.classList.add('dragging');
    document.body.classList.add('resizing');
  }

  function handleResize(e) {
    if (!isResizing) return;

    const containerRect = contentContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const mouseX = e.clientX - containerRect.left;

    // Calculate percentage
    let newEditorPercent = (mouseX / containerWidth) * 100;

    // Enforce minimum pane widths
    newEditorPercent = Math.max(MIN_PANE_PERCENT, Math.min(100 - MIN_PANE_PERCENT, newEditorPercent));

    editorWidthPercent = newEditorPercent;
    applyPaneWidths();
  }

  function handleResizeTouch(e) {
    if (!isResizing || !e.touches[0]) return;

    const containerRect = contentContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const touchX = e.touches[0].clientX - containerRect.left;

    let newEditorPercent = (touchX / containerWidth) * 100;
    newEditorPercent = Math.max(MIN_PANE_PERCENT, Math.min(100 - MIN_PANE_PERCENT, newEditorPercent));

    editorWidthPercent = newEditorPercent;
    applyPaneWidths();
  }

  function stopResize() {
    if (!isResizing) return;
    isResizing = false;
    resizeDivider.classList.remove('dragging');
    document.body.classList.remove('resizing');
  }

  function applyPaneWidths() {
    if (currentViewMode !== 'split') return;

    const previewPercent = 100 - editorWidthPercent;
    editorPaneElement.style.flex = `0 0 calc(${editorWidthPercent}% - 4px)`;
    previewPaneElement.style.flex = `0 0 calc(${previewPercent}% - 4px)`;
  }

  function resetPaneWidths() {
    editorPaneElement.style.flex = '';
    previewPaneElement.style.flex = '';
  }

  function openMobileMenu() {
    mobileMenuPanel.classList.add("active");
    mobileMenuOverlay.classList.add("active");
  }
  function closeMobileMenu() {
    mobileMenuPanel.classList.remove("active");
    mobileMenuOverlay.classList.remove("active");
  }
  mobileMenuToggle.addEventListener("click", openMobileMenu);
  mobileCloseMenu.addEventListener("click", closeMobileMenu);
  mobileMenuOverlay.addEventListener("click", closeMobileMenu);

  function updateMobileStats() {
    mobileCharCount.textContent   = charCountElement.textContent;
    mobileWordCount.textContent   = wordCountElement.textContent;
    mobileReadingTime.textContent = readingTimeElement.textContent;
  }

  const origUpdateStats = updateDocumentStats;
  updateDocumentStats = function() {
    origUpdateStats();
    updateMobileStats();
  };

  mobileToggleSync.addEventListener("click", () => {
    toggleSyncScrolling();
  });
  mobileOpenLocalBtn.addEventListener("click", () => { openMarkdownFile(); closeMobileMenu(); });
  mobileOpenSharepointBtn.addEventListener("click", () => {
    sharepointError.classList.add("d-none");
    sharepointUrlInput.value = "";
    closeMobileMenu();
    sharepointImportModal.show();
  });
  mobileOpenAdoBtn.addEventListener("click", () => {
    adoError.classList.add("d-none");
    closeMobileMenu();
    adoImportModal.show();
  });
  mobileSaveBtn.addEventListener("click", () => saveMarkdownFile());
  mobileInsertAdoTocBtn.addEventListener("click", () => {
    insertAdoTocSnippet();
    closeMobileMenu();
  });
  mobileInsertAdoNoteBtn.addEventListener("click", () => {
    insertAdoNoteSnippet();
    closeMobileMenu();
  });
  mobileExportMd.addEventListener("click", () => exportMd.click());
  mobileExportHtml.addEventListener("click", () => exportHtml.click());
  mobileExportPdf.addEventListener("click", () => exportPdf.click());
  mobileCopyMarkdown.addEventListener("click", () => copyMarkdownButton.click());
  mobileThemeToggle.addEventListener("click", () => {
    themeToggle.click();
    mobileThemeToggle.innerHTML = themeToggle.innerHTML + " Toggle Dark Mode";
  });
  
  renderMarkdown();
  updateMobileStats();

  // Initialize view mode - Story 1.1
  contentContainer.classList.add('view-split');

  // Initialize resizer - Story 1.3
  initResizer();

  // View Mode Button Event Listeners - Story 1.1
  viewModeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const mode = this.getAttribute('data-mode');
      setViewMode(mode);
    });
  });

  // Story 1.4: Mobile View Mode Button Event Listeners
  mobileViewModeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const mode = this.getAttribute('data-mode');
      setViewMode(mode);
      closeMobileMenu();
    });
  });

  markdownEditor.addEventListener("input", debouncedRender);
  
  // Tab key handler to insert indentation instead of moving focus
  markdownEditor.addEventListener("keydown", function(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const start = this.selectionStart;
      const end = this.selectionEnd;
      const value = this.value;
      
      // Insert 2 spaces
      const indent = '  '; // 2 spaces
      
      // Update textarea value
      this.value = value.substring(0, start) + indent + value.substring(end);
      
      // Update cursor position
      this.selectionStart = this.selectionEnd = start + indent.length;
      
      // Trigger input event to update preview
      this.dispatchEvent(new Event('input'));
    }
  });
  
  editorPane.addEventListener("scroll", syncEditorToPreview);
  previewPane.addEventListener("scroll", syncPreviewToEditor);
  toggleSyncButton.addEventListener("click", toggleSyncScrolling);

  // Click-to-sync: clicking in either pane scrolls the other to match.
  editorPane.addEventListener("click",   syncEditorClickToPreview);
  editorPane.addEventListener("keyup",   syncEditorClickToPreview);
  previewPane.addEventListener("click",  syncPreviewClickToEditor);

  // Invalidate anchor cache when window is resized (line widths change).
  window.addEventListener("resize", invalidateSyncAnchors);
  themeToggle.addEventListener("click", function () {
    const theme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", theme);

    if (theme === "dark") {
      themeToggle.innerHTML = '<i class="bi bi-sun"></i>';
    } else {
      themeToggle.innerHTML = '<i class="bi bi-moon"></i>';
    }
    
    renderMarkdown();
  });

  // Bootstrap Modal instances for import dialogs
  const sharepointImportModal = new bootstrap.Modal(document.getElementById("sharepoint-import-modal"));
  const sharepointUrlInput    = document.getElementById("sharepoint-url");
  const sharepointImportBtn   = document.getElementById("sharepoint-import-btn");
  const sharepointError       = document.getElementById("sharepoint-error");

  const adoImportModal  = new bootstrap.Modal(document.getElementById("ado-import-modal"));
  const adoOrgInput     = document.getElementById("ado-org");
  const adoProjectInput = document.getElementById("ado-project");
  const adoRepoInput    = document.getElementById("ado-repo");
  const adoBranchInput  = document.getElementById("ado-branch");
  const adoPathInput    = document.getElementById("ado-path");
  const adoPatInput     = document.getElementById("ado-pat");
  const adoError        = document.getElementById("ado-error");
  const adoImportBtn    = document.getElementById("ado-import-btn");

  openLocalBtn.addEventListener("click", function (e) {
    e.preventDefault();
    openMarkdownFile();
  });

  openSharepointBtn.addEventListener("click", function (e) {
    e.preventDefault();
    sharepointError.classList.add("d-none");
    sharepointUrlInput.value = "";
    sharepointImportModal.show();
  });

  openAdoBtn.addEventListener("click", function (e) {
    e.preventDefault();
    adoError.classList.add("d-none");
    adoImportModal.show();
  });

  sharepointImportBtn.addEventListener("click", async function () {
    const url = sharepointUrlInput.value.trim();
    if (!url) {
      sharepointError.textContent = "Please enter a SharePoint file URL.";
      sharepointError.classList.remove("d-none");
      return;
    }
    sharepointImportBtn.disabled = true;
    sharepointImportBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Importing\u2026';
    try {
      await importFromSharePoint(url);
      sharepointImportModal.hide();
    } catch (e) {
      sharepointError.textContent = e.message;
      sharepointError.classList.remove("d-none");
    } finally {
      sharepointImportBtn.disabled = false;
      sharepointImportBtn.innerHTML = '<i class="bi bi-download me-1"></i> Import';
    }
  });

  adoImportBtn.addEventListener("click", async function () {
    const org      = adoOrgInput.value.trim();
    const project  = adoProjectInput.value.trim();
    const repo     = adoRepoInput.value.trim();
    const branch   = adoBranchInput.value.trim() || "main";
    const filePath = adoPathInput.value.trim();
    const pat      = adoPatInput.value.trim();
    if (!org || !project || !repo || !filePath) {
      adoError.textContent = "Organization, Project, Repository and File Path are required.";
      adoError.classList.remove("d-none");
      return;
    }
    adoImportBtn.disabled = true;
    adoImportBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Importing\u2026';
    try {
      await importFromAdo(org, project, repo, branch, filePath, pat);
      adoImportModal.hide();
      adoPatInput.value = "";
    } catch (e) {
      adoError.textContent = e.message;
      adoError.classList.remove("d-none");
    } finally {
      adoImportBtn.disabled = false;
      adoImportBtn.innerHTML = '<i class="bi bi-download me-1"></i> Import';
      adoPatInput.value = "";
    }
  });

  saveButton.addEventListener("click", function () {
    saveMarkdownFile();
  });

  if (insertAdoTocButton) {
    insertAdoTocButton.addEventListener("click", function () {
      insertAdoTocSnippet();
    });
  }

  if (insertAdoNoteButton) {
    insertAdoNoteButton.addEventListener("click", function () {
      insertAdoNoteSnippet();
    });
  }

  fileInput.addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (file) {
      importMarkdownFile(file);
    }
    this.value = "";
  });

  exportMd.addEventListener("click", function (e) {
    e.preventDefault();
    try {
      exportMarkdownFile();
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed: " + e.message);
    }
  });

  document.addEventListener("keydown", function(e) {
    if (!(e.ctrlKey || e.metaKey)) return;

    const key = e.key.toLowerCase();
    if (key === 'o') {
      e.preventDefault();
      openMarkdownFile();
    } else if (key === 's') {
      e.preventDefault();
      saveMarkdownFile();
    } else if (e.altKey && key === 't') {
      e.preventDefault();
      insertAdoTocSnippet();
    } else if (e.altKey && key === 'n') {
      e.preventDefault();
      insertAdoNoteSnippet();
    }
  });

  exportHtml.addEventListener("click", function (e) {
    e.preventDefault();
    try {
      const markdown = markdownEditor.value;
      const html = marked.parse(preprocessMarkdown(markdown));
      const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG);
      const isDarkTheme =
        document.documentElement.getAttribute("data-theme") === "dark";
      const cssTheme = isDarkTheme
        ? "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.9.0/github-markdown-dark.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.9.0/github-markdown.min.css";
      const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Export</title>
  <link rel="stylesheet" href="${cssTheme}">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/${
    isDarkTheme ? "github-dark" : "github"
  }.min.css">
  <style>
      body {
          background-color: ${isDarkTheme ? "#0d1117" : "#ffffff"};
          color: ${isDarkTheme ? "#c9d1d9" : "#24292e"};
      }
      .markdown-body {
          box-sizing: border-box;
          min-width: 200px;
          max-width: 980px;
          margin: 0 auto;
          padding: 45px;
          background-color: ${isDarkTheme ? "#0d1117" : "#ffffff"};
          color: ${isDarkTheme ? "#c9d1d9" : "#24292e"};
      }
      @media (max-width: 767px) {
          .markdown-body {
              padding: 15px;
          }
      }
  </style>
</head>
<body>
  <article class="markdown-body">
      ${sanitizedHtml}
  </article>
</body>
</html>`;
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
      saveAs(blob, "document.html");
    } catch (e) {
      console.error("HTML export failed:", e);
      alert("HTML export failed: " + e.message);
    }
  });

  // ============================================
  // Page-Break Detection Functions (Story 1.1)
  // ============================================

  // Page configuration constants for A4 PDF export
  const PAGE_CONFIG = {
    a4Width: 210,           // mm
    a4Height: 297,          // mm
    margin: 15,             // mm each side
    contentWidth: 180,      // 210 - 30 (margins)
    contentHeight: 267,     // 297 - 30 (margins)
    windowWidth: 1000,      // html2canvas config
    scale: 2                // html2canvas scale factor
  };

  /**
   * Task 1: Identifies all graphic elements that may need page-break handling
   * @param {HTMLElement} container - The container element to search within
   * @returns {Array} Array of {element, type} objects
   */
  function identifyGraphicElements(container) {
    const graphics = [];

    // Query for images
    container.querySelectorAll('img').forEach(el => {
      graphics.push({ element: el, type: 'img' });
    });

    // Query for SVGs (Mermaid diagrams)
    container.querySelectorAll('svg').forEach(el => {
      graphics.push({ element: el, type: 'svg' });
    });

    // Query for pre elements (code blocks)
    container.querySelectorAll('pre').forEach(el => {
      graphics.push({ element: el, type: 'pre' });
    });

    // Query for tables
    container.querySelectorAll('table').forEach(el => {
      graphics.push({ element: el, type: 'table' });
    });

    return graphics;
  }

  /**
   * Task 2: Calculates element positions relative to the container
   * @param {Array} elements - Array of {element, type} objects
   * @param {HTMLElement} container - The container element
   * @returns {Array} Array with position data added
   */
  function calculateElementPositions(elements, container) {
    const containerRect = container.getBoundingClientRect();

    return elements.map(item => {
      const rect = item.element.getBoundingClientRect();
      const top = rect.top - containerRect.top;
      const height = rect.height;
      const bottom = top + height;

      return {
        element: item.element,
        type: item.type,
        top: top,
        height: height,
        bottom: bottom
      };
    });
  }

  /**
   * Task 3: Calculates page boundary positions
   * @param {number} totalHeight - Total height of content in pixels
   * @param {number} elementWidth - Actual width of the rendered element in pixels
   * @param {Object} pageConfig - Page configuration object
   * @returns {Array} Array of y-coordinates where pages end
   */
  function calculatePageBoundaries(totalHeight, elementWidth, pageConfig) {
    // Calculate pixel height per page based on the element's actual width
    // This must match how PDF pagination will split the canvas
    // The aspect ratio of content area determines page height relative to width
    const aspectRatio = pageConfig.contentHeight / pageConfig.contentWidth;
    const pageHeightPx = elementWidth * aspectRatio;

    const boundaries = [];
    let y = pageHeightPx;

    while (y < totalHeight) {
      boundaries.push(y);
      y += pageHeightPx;
    }

    return { boundaries, pageHeightPx };
  }

  /**
   * Task 4: Detects which elements would be split across page boundaries
   * @param {Array} elements - Array of elements with position data
   * @param {Array} pageBoundaries - Array of page break y-coordinates
   * @returns {Array} Array of split elements with additional split info
   */
  function detectSplitElements(elements, pageBoundaries) {
    // Handle edge case: empty elements array
    if (!elements || elements.length === 0) {
      return [];
    }

    // Handle edge case: no page boundaries (single page)
    if (!pageBoundaries || pageBoundaries.length === 0) {
      return [];
    }

    const splitElements = [];

    for (const item of elements) {
      // Find which page the element starts on
      let startPage = 0;
      for (let i = 0; i < pageBoundaries.length; i++) {
        if (item.top >= pageBoundaries[i]) {
          startPage = i + 1;
        } else {
          break;
        }
      }

      // Find which page the element ends on
      let endPage = 0;
      for (let i = 0; i < pageBoundaries.length; i++) {
        if (item.bottom > pageBoundaries[i]) {
          endPage = i + 1;
        } else {
          break;
        }
      }

      // Element is split if it spans multiple pages
      if (endPage > startPage) {
        // Calculate overflow amount (how much crosses into next page)
        const boundaryY = pageBoundaries[startPage] || pageBoundaries[0];
        const overflowAmount = item.bottom - boundaryY;

        splitElements.push({
          element: item.element,
          type: item.type,
          top: item.top,
          height: item.height,
          splitPageIndex: startPage,
          overflowAmount: overflowAmount
        });
      }
    }

    return splitElements;
  }

  /**
   * Task 5: Main entry point for analyzing graphics for page breaks
   * @param {HTMLElement} tempElement - The rendered content container
   * @returns {Object} Analysis result with totalElements, splitElements, pageCount
   */
  function analyzeGraphicsForPageBreaks(tempElement) {
    try {
      // Step 1: Identify all graphic elements
      const graphics = identifyGraphicElements(tempElement);
      debugPdfExport('Step 1 - Graphics found:', graphics.length, graphics.map(g => g.type));

      // Step 2: Calculate positions for each element
      const elementsWithPositions = calculateElementPositions(graphics, tempElement);
      debugPdfExport('Step 2 - Element positions:', elementsWithPositions.map(e => ({
        type: e.type,
        top: Math.round(e.top),
        height: Math.round(e.height),
        bottom: Math.round(e.bottom)
      })));

      // Step 3: Calculate page boundaries using the element's ACTUAL width
      const totalHeight = tempElement.scrollHeight;
      const elementWidth = tempElement.offsetWidth;
      const { boundaries: pageBoundaries, pageHeightPx } = calculatePageBoundaries(
        totalHeight,
        elementWidth,
        PAGE_CONFIG
      );

      debugPdfExport('Step 3 - Page boundaries:', {
        elementWidth,
        totalHeight,
        pageHeightPx: Math.round(pageHeightPx),
        boundaries: pageBoundaries.map(b => Math.round(b))
      });

      // Step 4: Detect split elements
      const splitElements = detectSplitElements(elementsWithPositions, pageBoundaries);
      debugPdfExport('Step 4 - Split elements detected:', splitElements.length);

      // Calculate page count
      const pageCount = pageBoundaries.length + 1;

      return {
        totalElements: graphics.length,
        splitElements: splitElements,
        pageCount: pageCount,
        pageBoundaries: pageBoundaries,
        pageHeightPx: pageHeightPx
      };
    } catch (error) {
      console.error('Page-break analysis failed:', error);
      return {
        totalElements: 0,
        splitElements: [],
        pageCount: 1,
        pageBoundaries: [],
        pageHeightPx: 0
      };
    }
  }

  // ============================================
  // End Page-Break Detection Functions
  // ============================================

  // ============================================
  // Page-Break Insertion Functions (Story 1.2)
  // ============================================

  // Threshold for whitespace optimization (30% of page height)
  const PAGE_BREAK_THRESHOLD = 0.3;

  /**
   * Task 3: Categorizes split elements by whether they fit on a single page
   * @param {Array} splitElements - Array of split elements from detection
   * @param {number} pageHeightPx - Page height in pixels
   * @returns {Object} { fittingElements, oversizedElements }
   */
  function categorizeBySize(splitElements, pageHeightPx) {
    const fittingElements = [];
    const oversizedElements = [];

    for (const item of splitElements) {
      if (item.height <= pageHeightPx) {
        fittingElements.push(item);
      } else {
        oversizedElements.push(item);
      }
    }

    return { fittingElements, oversizedElements };
  }

  /**
   * Task 1: Inserts page breaks by adjusting margins for fitting elements
   * @param {Array} fittingElements - Elements that fit on a single page
   * @param {number} pageHeightPx - Page height in pixels
   */
  function insertPageBreaks(fittingElements, pageHeightPx) {
    for (const item of fittingElements) {
      // Calculate where the current page ends
      const currentPageBottom = (item.splitPageIndex + 1) * pageHeightPx;

      // Calculate remaining space on current page
      const remainingSpace = currentPageBottom - item.top;
      const remainingRatio = remainingSpace / pageHeightPx;

      debugPdfExport('Processing split element:', {
        type: item.type,
        top: Math.round(item.top),
        height: Math.round(item.height),
        splitPageIndex: item.splitPageIndex,
        currentPageBottom: Math.round(currentPageBottom),
        remainingSpace: Math.round(remainingSpace),
        remainingRatio: remainingRatio.toFixed(2)
      });

      // Task 4: Whitespace optimization
      // If remaining space is more than threshold and element almost fits, skip
      // (Will be handled by Story 1.3 scaling instead)
      if (remainingRatio > PAGE_BREAK_THRESHOLD) {
        const scaledHeight = item.height * 0.9; // 90% scale
        if (scaledHeight <= remainingSpace) {
          debugPdfExport('  -> Skipping (can fit with 90% scaling)');
          continue;
        }
      }

      // Calculate margin needed to push element to next page
      const marginNeeded = currentPageBottom - item.top + 5; // 5px buffer

      debugPdfExport('  -> Applying marginTop:', marginNeeded, 'px');

      // Determine which element to apply margin to
      // For SVG elements (Mermaid diagrams), apply to parent container for proper layout
      let targetElement = item.element;
      if (item.type === 'svg' && item.element.parentElement) {
        targetElement = item.element.parentElement;
        debugPdfExport('  -> Using parent element:', targetElement.tagName, targetElement.className);
      }

      // Apply margin to push element to next page
      const currentMargin = parseFloat(targetElement.style.marginTop) || 0;
      targetElement.style.marginTop = `${currentMargin + marginNeeded}px`;

      debugPdfExport('  -> Element after margin:', targetElement.tagName, 'marginTop =', targetElement.style.marginTop);
    }
  }

  /**
   * Task 2: Applies page breaks with cascading adjustment handling
   * @param {HTMLElement} tempElement - The rendered content container
   * @param {Object} pageConfig - Page configuration object (unused, kept for API compatibility)
   * @param {number} maxIterations - Maximum iterations to prevent infinite loops
   * @returns {Object} Final analysis result
   */
  function applyPageBreaksWithCascade(tempElement, pageConfig, maxIterations = 10) {
    let iteration = 0;
    let analysis;
    let previousSplitCount = -1;

    do {
      // Re-analyze after each adjustment
      analysis = analyzeGraphicsForPageBreaks(tempElement);

      // Use pageHeightPx from analysis (calculated from actual element width)
      const pageHeightPx = analysis.pageHeightPx;

      // Categorize elements by size
      const { fittingElements, oversizedElements } = categorizeBySize(
        analysis.splitElements,
        pageHeightPx
      );

      // Store oversized elements for Story 1.3
      analysis.oversizedElements = oversizedElements;

      // If no fitting elements need adjustment, we're done
      if (fittingElements.length === 0) {
        break;
      }

      // Check if we're making progress (prevent infinite loops)
      if (fittingElements.length === previousSplitCount) {
        console.warn('Page-break adjustment not making progress, stopping');
        break;
      }
      previousSplitCount = fittingElements.length;

      // Apply page breaks to fitting elements
      insertPageBreaks(fittingElements, pageHeightPx);
      iteration++;

    } while (iteration < maxIterations);

    if (iteration >= maxIterations) {
      console.warn('Page-break stabilization reached max iterations:', maxIterations);
    }

    debugPdfExport('Page-break cascade complete:', {
      iterations: iteration,
      finalSplitCount: analysis.splitElements.length,
      oversizedCount: analysis.oversizedElements ? analysis.oversizedElements.length : 0
    });

    return analysis;
  }

  // ============================================
  // End Page-Break Insertion Functions
  // ============================================

  // ============================================
  // Oversized Graphics Scaling Functions (Story 1.3)
  // ============================================

  // Minimum scale factor to maintain readability (50%)
  const MIN_SCALE_FACTOR = 0.5;

  // PDF typography defaults for a document-like reading experience.
  const PDF_FONT_STACK = '"Georgia", "Times New Roman", Times, serif';

  /**
   * Task 1 & 2: Calculates scale factor with minimum enforcement
   * @param {number} elementHeight - Original height of element in pixels
   * @param {number} availableHeight - Available page height in pixels
   * @param {number} buffer - Small buffer to prevent edge overflow
   * @returns {Object} { scaleFactor, wasClampedToMin }
   */
  function calculateScaleFactor(elementHeight, availableHeight, buffer = 5) {
    const targetHeight = availableHeight - buffer;
    let scaleFactor = targetHeight / elementHeight;
    let wasClampedToMin = false;

    // Enforce minimum scale for readability
    if (scaleFactor < MIN_SCALE_FACTOR) {
      console.warn(
        `Warning: Large graphic requires ${(scaleFactor * 100).toFixed(0)}% scaling. ` +
        `Clamping to minimum ${MIN_SCALE_FACTOR * 100}%. Content may be cut off.`
      );
      scaleFactor = MIN_SCALE_FACTOR;
      wasClampedToMin = true;
    }

    return { scaleFactor, wasClampedToMin };
  }

  /**
   * Task 3: Applies CSS transform scaling to an element
   * @param {HTMLElement} element - The element to scale
   * @param {number} scaleFactor - Scale factor (0.5 = 50%)
   * @param {string} elementType - Type of element (svg, pre, img, table)
   */
  function applyGraphicScaling(element, scaleFactor, elementType) {
    // Get original dimensions before transform
    const originalHeight = element.offsetHeight;

    // Task 4: Handle SVG elements (Mermaid diagrams)
    if (elementType === 'svg') {
      // Remove max-width constraint that may interfere
      element.style.maxWidth = 'none';
    }

    // Apply CSS transform
    element.style.transform = `scale(${scaleFactor})`;
    element.style.transformOrigin = 'top left';

    // Calculate margin adjustment to collapse visual space
    const scaledHeight = originalHeight * scaleFactor;
    const marginAdjustment = originalHeight - scaledHeight;

    // Apply negative margin to pull subsequent content up
    element.style.marginBottom = `-${marginAdjustment}px`;
  }

  /**
   * Task 6: Handles all oversized elements by applying appropriate scaling
   * @param {Array} oversizedElements - Array of oversized element data
   * @param {number} pageHeightPx - Page height in pixels
   */
  function handleOversizedElements(oversizedElements, pageHeightPx) {
    if (!oversizedElements || oversizedElements.length === 0) {
      return;
    }

    let scaledCount = 0;
    let clampedCount = 0;

    for (const item of oversizedElements) {
      // Calculate required scale factor
      const { scaleFactor, wasClampedToMin } = calculateScaleFactor(
        item.height,
        pageHeightPx
      );

      // Apply scaling to the element
      applyGraphicScaling(item.element, scaleFactor, item.type);

      scaledCount++;
      if (wasClampedToMin) {
        clampedCount++;
      }
    }

    debugPdfExport('Oversized graphics scaling complete:', {
      totalScaled: scaledCount,
      clampedToMinimum: clampedCount
    });
  }

  // ============================================
  // End Oversized Graphics Scaling Functions
  // ============================================

  exportPdf.addEventListener("click", async function (e) {
    e.preventDefault();
    try {
      const originalText = exportPdf.innerHTML;
      exportPdf.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
      exportPdf.disabled = true;

      const progressContainer = document.createElement('div');
      progressContainer.id = 'pdf-export-progress';
      progressContainer.style.position = 'fixed';
      progressContainer.style.top = '50%';
      progressContainer.style.left = '50%';
      progressContainer.style.transform = 'translate(-50%, -50%)';
      progressContainer.style.padding = '15px 20px';
      progressContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      progressContainer.style.color = 'white';
      progressContainer.style.borderRadius = '5px';
      progressContainer.style.zIndex = '9999';
      progressContainer.style.textAlign = 'center';

      const statusText = document.createElement('div');
      statusText.textContent = 'Generating PDF...';
      progressContainer.appendChild(statusText);
      document.body.appendChild(progressContainer);

      const markdown = markdownEditor.value;
      const html = marked.parse(preprocessMarkdown(markdown));
      const sanitizedHtml = DOMPurify.sanitize(html, SANITIZE_CONFIG_PDF);

      const tempElement = document.createElement("div");
      tempElement.className = "markdown-body pdf-export";
      tempElement.innerHTML = sanitizedHtml;
      tempElement.style.padding = "0";
      tempElement.style.width = `${PAGE_CONFIG.contentWidth}mm`;
      tempElement.style.margin = "0 auto";
      tempElement.style.fontFamily = PDF_FONT_STACK;
      tempElement.style.fontSize = "15px";
      tempElement.style.lineHeight = "1.7";
      tempElement.style.position = "fixed";
      tempElement.style.left = "-9999px";
      tempElement.style.top = "0";

      const currentTheme = document.documentElement.getAttribute("data-theme");
      tempElement.style.backgroundColor = currentTheme === "dark" ? "#0d1117" : "#ffffff";
      tempElement.style.color = currentTheme === "dark" ? "#c9d1d9" : "#24292e";

      const pdfStyle = document.createElement("style");
      pdfStyle.textContent = `
        .pdf-export, .pdf-export * {
          font-family: ${PDF_FONT_STACK} !important;
        }
        .pdf-export pre,
        .pdf-export code,
        .pdf-export kbd,
        .pdf-export samp {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace !important;
        }
        .pdf-export p,
        .pdf-export li,
        .pdf-export td,
        .pdf-export th,
        .pdf-export blockquote {
          font-size: 15px;
          line-height: 1.7;
        }
        .pdf-export h1 { font-size: 32px; line-height: 1.25; margin-top: 1.2em; }
        .pdf-export h2 { font-size: 26px; line-height: 1.3; margin-top: 1.15em; }
        .pdf-export h3 { font-size: 22px; line-height: 1.35; margin-top: 1.1em; }
        .pdf-export h4 { font-size: 19px; line-height: 1.4; }
        .pdf-export h5 { font-size: 17px; line-height: 1.45; }
        .pdf-export h6 { font-size: 16px; line-height: 1.5; }
      `;
      tempElement.prepend(pdfStyle);

      document.body.appendChild(tempElement);

      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        await mermaid.run({
          nodes: tempElement.querySelectorAll('.mermaid'),
          suppressErrors: true
        });
      } catch (mermaidError) {
        console.warn("Mermaid rendering issue:", mermaidError);
      }

      if (window.MathJax) {
        try {
          await MathJax.typesetPromise([tempElement]);
        } catch (mathJaxError) {
          console.warn("MathJax rendering issue:", mathJaxError);
        }

        // Hide MathJax assistive elements that cause duplicate text in PDF
        // These are screen reader elements that html2canvas captures as visible
        // Use multiple CSS properties to ensure html2canvas doesn't render them
        const assistiveElements = tempElement.querySelectorAll('mjx-assistive-mml');
        assistiveElements.forEach(el => {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.position = 'absolute';
          el.style.width = '0';
          el.style.height = '0';
          el.style.overflow = 'hidden';
          el.remove(); // Remove entirely from DOM
        });

        // Also hide any MathJax script elements that might contain source
        const mathScripts = tempElement.querySelectorAll('script[type*="math"], script[type*="tex"]');
        mathScripts.forEach(el => el.remove());
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Analyze and apply page-breaks for graphics (Story 1.1 + 1.2)
      const pageBreakAnalysis = applyPageBreaksWithCascade(tempElement, PAGE_CONFIG);

      // Scale oversized graphics that can't fit on a single page (Story 1.3)
      if (pageBreakAnalysis.oversizedElements && pageBreakAnalysis.pageHeightPx) {
        handleOversizedElements(pageBreakAnalysis.oversizedElements, pageBreakAnalysis.pageHeightPx);
      }

      function calculateLogicalBreaks(container, pageHeightPx) {
        const totalHeight = container.scrollHeight;
        if (!pageHeightPx || totalHeight <= pageHeightPx) {
          return [];
        }

        const blockSelectors = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'pre', 'table', 'blockquote', 'ul', 'ol', 'p', 'img',
          '.mermaid-container', '.ado-callout'
        ];

        const candidates = Array.from(container.querySelectorAll(blockSelectors.join(',')))
          .map((el) => ({
            top: el.offsetTop,
            bottom: el.offsetTop + el.offsetHeight
          }))
          .filter((pos) => pos.top > 0 && pos.bottom > pos.top)
          .sort((a, b) => a.top - b.top);

        const breaks = [];
        let startY = 0;
        const minFillRatio = 0.65;

        while (startY + pageHeightPx < totalHeight) {
          const targetBoundary = startY + pageHeightPx;
          const minBreakY = startY + pageHeightPx * minFillRatio;

          let chosen = null;
          for (let i = 0; i < candidates.length; i++) {
            const c = candidates[i];
            if (c.top >= minBreakY && c.top < targetBoundary) {
              if (!chosen || c.top > chosen.top) {
                chosen = c;
              }
            }
          }

          let breakY = chosen ? chosen.top : targetBoundary;
          breakY = Math.max(startY + 1, Math.min(breakY, totalHeight - 1));

          if (breaks.length > 0 && breakY <= breaks[breaks.length - 1]) {
            breakY = Math.min(targetBoundary, totalHeight - 1);
          }

          breaks.push(breakY);
          startY = breakY;

          if (breaks.length > 200) {
            break;
          }
        }

        return breaks;
      }

      const pdfOptions = {
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        hotfixes: ["px_scaling"]
      };

      const pdf = new jspdf.jsPDF(pdfOptions);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);

      const canvas = await html2canvas(tempElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowWidth: 1000,
        windowHeight: tempElement.scrollHeight
      });

      const contentHeight = pageHeight - margin * 2;
      const pageHeightPx = (tempElement.offsetWidth * PAGE_CONFIG.contentHeight) / PAGE_CONFIG.contentWidth;
      const logicalBreaksPx = calculateLogicalBreaks(tempElement, pageHeightPx);
      const cssSegments = [0, ...logicalBreaksPx, tempElement.scrollHeight];
      const canvasScaleY = canvas.height / tempElement.scrollHeight;
      const maxSourceHeightPerPage = Math.max(1, Math.floor((contentHeight / contentWidth) * canvas.width));

      let isFirstPage = true;
      for (let segmentIndex = 0; segmentIndex < cssSegments.length - 1; segmentIndex++) {
        const segmentTopPx = cssSegments[segmentIndex];
        const segmentBottomPx = cssSegments[segmentIndex + 1];
        let remainingSourceHeight = Math.max(1, Math.floor((segmentBottomPx - segmentTopPx) * canvasScaleY));
        let currentSourceY = Math.floor(segmentTopPx * canvasScaleY);

        while (remainingSourceHeight > 0) {
          if (!isFirstPage) {
            pdf.addPage();
          }
          isFirstPage = false;

          const chunkSourceHeight = Math.min(remainingSourceHeight, maxSourceHeightPerPage);
          const destHeight = (chunkSourceHeight / canvas.width) * contentWidth;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = chunkSourceHeight;

          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(
            canvas,
            0,
            currentSourceY,
            canvas.width,
            chunkSourceHeight,
            0,
            0,
            canvas.width,
            chunkSourceHeight
          );

          const imgData = pageCanvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, destHeight);

          currentSourceY += chunkSourceHeight;
          remainingSourceHeight -= chunkSourceHeight;
        }
      }

      pdf.save("document.pdf");

      statusText.textContent = 'Download successful!';
      setTimeout(() => {
        document.body.removeChild(progressContainer);
      }, 1500);

      document.body.removeChild(tempElement);
      exportPdf.innerHTML = originalText;
      exportPdf.disabled = false;

    } catch (error) {
      console.error("PDF export failed:", error);
      alert("PDF export failed: " + error.message);
      exportPdf.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Export';
      exportPdf.disabled = false;

      const progressContainer = document.getElementById('pdf-export-progress');
      if (progressContainer) {
        document.body.removeChild(progressContainer);
      }
    }
  });

  copyMarkdownButton.addEventListener("click", function () {
    try {
      const markdownText = markdownEditor.value;
      copyToClipboard(markdownText);
    } catch (e) {
      console.error("Copy failed:", e);
      alert("Failed to copy Markdown: " + e.message);
    }
  });

  async function copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        showCopiedMessage();
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (successful) {
          showCopiedMessage();
        } else {
          throw new Error("Copy command was unsuccessful");
        }
      }
    } catch (err) {
      console.error("Copy failed:", err);
      alert("Failed to copy HTML: " + err.message);
    }
  }

  function showCopiedMessage() {
    const originalText = copyMarkdownButton.innerHTML;
    copyMarkdownButton.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';

    setTimeout(() => {
      copyMarkdownButton.innerHTML = originalText;
    }, 2000);
  }

  const dropEvents = ["dragenter", "dragover", "dragleave", "drop"];

  dropEvents.forEach((eventName) => {
    dropzone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, unhighlight, false);
  });

  function highlight() {
    dropzone.classList.add("active");
  }

  function unhighlight() {
    dropzone.classList.remove("active");
  }

  dropzone.addEventListener("drop", handleDrop, false);
  dropzone.addEventListener("click", function (e) {
    if (e.target !== closeDropzoneBtn && !closeDropzoneBtn.contains(e.target)) {
      fileInput.click();
    }
  });
  closeDropzoneBtn.addEventListener("click", function(e) {
    e.stopPropagation(); 
    dropzone.style.display = "none";
  });

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length) {
      const file = files[0];
      const isMarkdownFile =
        file.type === "text/markdown" ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".markdown");
      if (isMarkdownFile) {
        importMarkdownFile(file);
      } else {
        alert("Please upload a Markdown file (.md or .markdown)");
      }
    }
  }

  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      e.preventDefault();
      copyMarkdownButton.click();
    }
    // Story 1.2: Only allow sync toggle shortcut when in split view
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "S") {
      e.preventDefault();
      if (currentViewMode === 'split') {
        toggleSyncScrolling();
      }
    }
  });
});