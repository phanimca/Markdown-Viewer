import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import mermaid from 'mermaid';
import { dom } from './dom.js';
import {
  PAGE_CONFIG, PAGE_BREAK_THRESHOLD, MIN_SCALE_FACTOR,
  PDF_FONT_STACK, SANITIZE_CONFIG_PDF
} from './state.js';
import { preprocessMarkdown } from './preprocessors.js';

function identifyGraphicElements(container) {
  const graphics = [];
  container.querySelectorAll('img').forEach(el => graphics.push({ element: el, type: 'img' }));
  container.querySelectorAll('svg').forEach(el => graphics.push({ element: el, type: 'svg' }));
  container.querySelectorAll('pre').forEach(el => graphics.push({ element: el, type: 'pre' }));
  container.querySelectorAll('table').forEach(el => graphics.push({ element: el, type: 'table' }));
  return graphics;
}

function calculateElementPositions(elements, container) {
  const containerRect = container.getBoundingClientRect();

  return elements.map(item => {
    const rect = item.element.getBoundingClientRect();
    const top = rect.top - containerRect.top;
    const height = rect.height;
    const bottom = top + height;

    return { element: item.element, type: item.type, top, height, bottom };
  });
}

function calculatePageBoundaries(totalHeight, elementWidth, pageConfig) {
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

function detectSplitElements(elements, pageBoundaries) {
  if (!elements || elements.length === 0) return [];
  if (!pageBoundaries || pageBoundaries.length === 0) return [];

  const splitElements = [];

  for (const item of elements) {
    let startPage = 0;
    for (let i = 0; i < pageBoundaries.length; i++) {
      if (item.top >= pageBoundaries[i]) {
        startPage = i + 1;
      } else {
        break;
      }
    }

    let endPage = 0;
    for (let i = 0; i < pageBoundaries.length; i++) {
      if (item.bottom > pageBoundaries[i]) {
        endPage = i + 1;
      } else {
        break;
      }
    }

    if (endPage > startPage) {
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

function analyzeGraphicsForPageBreaks(tempElement) {
  try {
    const graphics = identifyGraphicElements(tempElement);
    const elementsWithPositions = calculateElementPositions(graphics, tempElement);
    const totalHeight = tempElement.scrollHeight;
    const elementWidth = tempElement.offsetWidth;
    const { boundaries: pageBoundaries, pageHeightPx } = calculatePageBoundaries(
      totalHeight, elementWidth, PAGE_CONFIG
    );
    const splitElements = detectSplitElements(elementsWithPositions, pageBoundaries);
    const pageCount = pageBoundaries.length + 1;

    return { totalElements: graphics.length, splitElements, pageCount, pageBoundaries, pageHeightPx };
  } catch (error) {
    console.error('Page-break analysis failed:', error);
    return { totalElements: 0, splitElements: [], pageCount: 1, pageBoundaries: [], pageHeightPx: 0 };
  }
}

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

function insertPageBreaks(fittingElements, pageHeightPx) {
  for (const item of fittingElements) {
    const currentPageBottom = (item.splitPageIndex + 1) * pageHeightPx;
    const remainingSpace = currentPageBottom - item.top;
    const remainingRatio = remainingSpace / pageHeightPx;

    if (remainingRatio > PAGE_BREAK_THRESHOLD) {
      const scaledHeight = item.height * 0.9;
      if (scaledHeight <= remainingSpace) {
        continue;
      }
    }

    const marginNeeded = currentPageBottom - item.top + 5;
    let targetElement = item.element;
    if (item.type === 'svg' && item.element.parentElement) {
      targetElement = item.element.parentElement;
    }

    const currentMargin = parseFloat(targetElement.style.marginTop) || 0;
    targetElement.style.marginTop = `${currentMargin + marginNeeded}px`;
  }
}

function applyPageBreaksWithCascade(tempElement, pageConfig, maxIterations = 10) {
  let iteration = 0;
  let analysis;
  let previousSplitCount = Infinity;

  do {
    analysis = analyzeGraphicsForPageBreaks(tempElement);
    const pageHeightPx = analysis.pageHeightPx;
    const { fittingElements, oversizedElements } = categorizeBySize(analysis.splitElements, pageHeightPx);
    analysis.oversizedElements = oversizedElements;

    if (fittingElements.length === 0) break;

    if (fittingElements.length === previousSplitCount) {
      console.warn('Page-break adjustment not making progress, stopping');
      break;
    }
    previousSplitCount = fittingElements.length;

    insertPageBreaks(fittingElements, pageHeightPx);
    iteration++;
  } while (iteration < maxIterations);

  if (iteration >= maxIterations) {
    console.warn('Page-break stabilization reached max iterations:', maxIterations);
  }

  return analysis;
}

function calculateScaleFactor(elementHeight, availableHeight, buffer = 5) {
  const targetHeight = availableHeight - buffer;
  let scaleFactor = targetHeight / elementHeight;
  let wasClampedToMin = false;

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

function applyGraphicScaling(element, scaleFactor, elementType) {
  const originalHeight = element.offsetHeight;

  if (elementType === 'svg') {
    element.style.maxWidth = 'none';
  }

  element.style.transform = `scale(${scaleFactor})`;
  element.style.transformOrigin = 'top left';

  const scaledHeight = originalHeight * scaleFactor;
  const marginAdjustment = originalHeight - scaledHeight;
  element.style.marginBottom = `-${marginAdjustment}px`;
}

function handleOversizedElements(oversizedElements, pageHeightPx) {
  if (!oversizedElements || oversizedElements.length === 0) return;

  for (const item of oversizedElements) {
    const { scaleFactor } = calculateScaleFactor(item.height, pageHeightPx);
    applyGraphicScaling(item.element, scaleFactor, item.type);
  }
}

function calculateLogicalBreaks(container, pageHeightPx) {
  const totalHeight = container.scrollHeight;
  if (!pageHeightPx || totalHeight <= pageHeightPx) return [];

  const blockSelectors = [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre', 'table', 'blockquote', 'ul', 'ol', 'p', 'img',
    '.mermaid-container', '.ado-callout'
  ];

  const candidates = Array.from(container.querySelectorAll(blockSelectors.join(',')))
    .map((el) => ({ top: el.offsetTop, bottom: el.offsetTop + el.offsetHeight }))
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

    if (breaks.length > 200) break;
  }

  return breaks;
}

export async function runPdfExport() {
  try {
    const originalText = dom.exportPdf.innerHTML;
    dom.exportPdf.innerHTML = '<i class="bi bi-hourglass-split"></i> Generating...';
    dom.exportPdf.disabled = true;

    const progressContainer = document.createElement('div');
    progressContainer.id = 'pdf-export-progress';
    progressContainer.setAttribute('aria-live', 'polite');
    progressContainer.setAttribute('role', 'status');
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

    const markdown = dom.markdownEditor.value;
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

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

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

      const assistiveElements = tempElement.querySelectorAll('mjx-assistive-mml');
      assistiveElements.forEach(el => {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.position = 'absolute';
        el.style.width = '0';
        el.style.height = '0';
        el.style.overflow = 'hidden';
        el.remove();
      });

      const mathScripts = tempElement.querySelectorAll('script[type*="math"], script[type*="tex"]');
      mathScripts.forEach(el => el.remove());
    }

    const pageBreakAnalysis = applyPageBreaksWithCascade(tempElement, PAGE_CONFIG);

    if (pageBreakAnalysis.oversizedElements && pageBreakAnalysis.pageHeightPx) {
      handleOversizedElements(pageBreakAnalysis.oversizedElements, pageBreakAnalysis.pageHeightPx);
    }

    const pdfOptions = {
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      hotfixes: ["px_scaling"]
    };

    const pdf = new jsPDF(pdfOptions);
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
        ctx.drawImage(canvas, 0, currentSourceY, canvas.width, chunkSourceHeight, 0, 0, canvas.width, chunkSourceHeight);

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
    dom.exportPdf.innerHTML = originalText;
    dom.exportPdf.disabled = false;

  } catch (error) {
    console.error("PDF export failed:", error);
    alert("PDF export failed: " + error.message);
    dom.exportPdf.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Export';
    dom.exportPdf.disabled = false;

    const progressContainer = document.getElementById('pdf-export-progress');
    if (progressContainer) {
      document.body.removeChild(progressContainer);
    }
  }
}
