import mermaid from 'mermaid';
import { state } from './state.js';
import { dom } from './dom.js';

export function initMermaid() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const mermaidTheme = currentTheme === "dark" ? "dark" : "default";

  mermaid.initialize({
    startOnLoad: false,
    theme: mermaidTheme,
    securityLevel: 'strict',
    flowchart: { useMaxWidth: true, htmlLabels: false },
    fontSize: 16
  });
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

export function enhanceMermaidDiagrams(rootElement) {
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
        if (!(event.ctrlKey || event.metaKey)) return;

        event.preventDefault();
        const delta = event.deltaY < 0 ? 0.1 : -0.1;
        adjustZoom(delta);
      }, { passive: false });

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
