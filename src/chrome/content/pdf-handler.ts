/**
 * Kalaama PDF Handler
 * Renders PDFs with clickable text layer for word translation
 */

declare const pdfjsLib: any;

interface PDFPageInfo {
  pageNum: number;
  viewport: any;
  textContent: any;
}

export class KalaamaPDFHandler {
  private pdfDoc: any = null;
  private currentPage = 1;
  private totalPages = 0;
  private scale = 1.5;
  private container: HTMLElement | null = null;
  private isRendering = false;
  private onWordClick: ((word: string, sentence: string) => void) | null = null;

  constructor() {}

  /**
   * Check if current page is a PDF
   */
  static isPDFPage(): boolean {
    const url = window.location.href;

    // Check URL extension
    if (url.toLowerCase().endsWith('.pdf')) {
      return true;
    }

    // Check if it's a PDF viewer URL
    if (url.includes('pdfjs') || url.includes('pdf.js')) {
      return true;
    }

    // Check for Chrome's PDF viewer
    const embedElement = document.querySelector('embed[type="application/pdf"]');
    if (embedElement) {
      return true;
    }

    // Check content type from document
    const contentType = document.contentType;
    if (contentType === 'application/pdf') {
      return true;
    }

    return false;
  }

  /**
   * Initialize PDF handler
   */
  async init(onWordClick: (word: string, sentence: string) => void): Promise<boolean> {
    this.onWordClick = onWordClick;

    if (!KalaamaPDFHandler.isPDFPage()) {
      return false;
    }

    console.log('[Kalaama PDF] Initializing PDF handler');

    try {
      // Load PDF.js library
      await this.loadPDFJS();

      // Get PDF URL
      const pdfUrl = this.getPDFUrl();
      if (!pdfUrl) {
        console.error('[Kalaama PDF] Could not determine PDF URL');
        return false;
      }

      // Create our custom viewer
      this.createViewer();

      // Load the PDF
      await this.loadPDF(pdfUrl);

      return true;
    } catch (error) {
      console.error('[Kalaama PDF] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Load PDF.js library from extension
   */
  private async loadPDFJS(): Promise<void> {
    if (typeof pdfjsLib !== 'undefined') {
      console.log('[Kalaama PDF] PDF.js already loaded');
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('libs/pdf.min.js');
      script.onload = () => {
        console.log('[Kalaama PDF] PDF.js loaded');
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('libs/pdf.worker.min.js');
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load PDF.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Get the PDF URL
   */
  private getPDFUrl(): string | null {
    // Direct PDF URL
    if (window.location.href.toLowerCase().endsWith('.pdf')) {
      return window.location.href;
    }

    // Check embed element
    const embed = document.querySelector('embed[type="application/pdf"]') as HTMLEmbedElement;
    if (embed?.src) {
      return embed.src;
    }

    // Check object element
    const obj = document.querySelector('object[type="application/pdf"]') as HTMLObjectElement;
    if (obj?.data) {
      return obj.data;
    }

    // Fallback to current URL
    return window.location.href;
  }

  /**
   * Create custom PDF viewer UI
   */
  private createViewer(): void {
    // Clear existing content
    document.body.innerHTML = '';
    document.body.style.cssText = 'margin: 0; padding: 0; background: #525659; overflow: auto;';

    // Create container
    this.container = document.createElement('div');
    this.container.id = 'kalaama-pdf-viewer';
    this.container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      min-height: 100vh;
    `;

    // Create toolbar
    const toolbar = this.createToolbar();
    document.body.appendChild(toolbar);
    document.body.appendChild(this.container);

    // Add styles
    this.addStyles();
  }

  /**
   * Create toolbar
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.id = 'kalaama-pdf-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 48px;
      background: #323639;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      z-index: 10000;
      padding: 0 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;

    // Kalaama branding
    const brand = document.createElement('div');
    brand.style.cssText = 'position: absolute; left: 16px; color: #818cf8; font-weight: bold;';
    brand.textContent = 'Kalaama PDF Reader';
    toolbar.appendChild(brand);

    // Page navigation
    const prevBtn = this.createButton('←', () => this.goToPage(this.currentPage - 1));
    const pageInfo = document.createElement('span');
    pageInfo.id = 'kalaama-page-info';
    pageInfo.style.cssText = 'color: white; min-width: 100px; text-align: center;';
    pageInfo.textContent = 'Loading...';
    const nextBtn = this.createButton('→', () => this.goToPage(this.currentPage + 1));

    // Zoom controls
    const zoomOut = this.createButton('−', () => this.zoom(-0.25));
    const zoomInfo = document.createElement('span');
    zoomInfo.id = 'kalaama-zoom-info';
    zoomInfo.style.cssText = 'color: white; min-width: 60px; text-align: center;';
    zoomInfo.textContent = `${Math.round(this.scale * 100)}%`;
    const zoomIn = this.createButton('+', () => this.zoom(0.25));

    toolbar.appendChild(prevBtn);
    toolbar.appendChild(pageInfo);
    toolbar.appendChild(nextBtn);
    toolbar.appendChild(document.createElement('span')); // spacer
    toolbar.appendChild(zoomOut);
    toolbar.appendChild(zoomInfo);
    toolbar.appendChild(zoomIn);

    return toolbar;
  }

  /**
   * Create a toolbar button
   */
  private createButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      background: #4a4d50;
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.onmouseover = () => btn.style.background = '#5a5d60';
    btn.onmouseout = () => btn.style.background = '#4a4d50';
    btn.onclick = onClick;
    return btn;
  }

  /**
   * Add custom styles
   */
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #kalaama-pdf-viewer {
        margin-top: 68px;
      }

      .kalaama-pdf-page {
        background: white;
        margin-bottom: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        position: relative;
      }

      .kalaama-pdf-canvas {
        display: block;
      }

      .kalaama-pdf-text-layer {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        line-height: 1;
        pointer-events: auto;
      }

      .kalaama-pdf-text-layer span {
        position: absolute;
        white-space: pre;
        color: transparent;
        pointer-events: auto;
      }

      .kalaama-pdf-text-layer .kalaama-word {
        cursor: pointer;
        border-radius: 2px;
        transition: background-color 0.15s;
      }

      .kalaama-pdf-text-layer .kalaama-word:hover {
        background-color: rgba(99, 102, 241, 0.3) !important;
        color: transparent !important;
      }

      .kalaama-pdf-text-layer .kalaama-word.selected {
        background-color: rgba(99, 102, 241, 0.5) !important;
      }

      /* Grammar highlighting for PDF */
      .kalaama-grammar-enabled .kalaama-word.pos-noun { background-color: rgba(59, 130, 246, 0.2) !important; }
      .kalaama-grammar-enabled .kalaama-word.pos-verb { background-color: rgba(239, 68, 68, 0.2) !important; }
      .kalaama-grammar-enabled .kalaama-word.pos-adjective { background-color: rgba(34, 197, 94, 0.2) !important; }
      .kalaama-grammar-enabled .kalaama-word.pos-adverb { background-color: rgba(249, 115, 22, 0.2) !important; }
    `;
    document.head.appendChild(style);
  }

  /**
   * Load PDF document
   */
  private async loadPDF(url: string): Promise<void> {
    console.log('[Kalaama PDF] Loading PDF:', url);

    const loadingTask = pdfjsLib.getDocument(url);
    this.pdfDoc = await loadingTask.promise;
    this.totalPages = this.pdfDoc.numPages;

    console.log(`[Kalaama PDF] Loaded PDF with ${this.totalPages} pages`);

    this.updatePageInfo();

    // Render all visible pages
    await this.renderAllPages();
  }

  /**
   * Render all pages
   */
  private async renderAllPages(): Promise<void> {
    if (!this.container || !this.pdfDoc) return;

    this.container.innerHTML = '';

    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      await this.renderPage(pageNum);
    }
  }

  /**
   * Render a single page
   */
  private async renderPage(pageNum: number): Promise<void> {
    if (!this.container || !this.pdfDoc) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    // Create page container
    const pageDiv = document.createElement('div');
    pageDiv.className = 'kalaama-pdf-page';
    pageDiv.dataset.pageNum = String(pageNum);
    pageDiv.style.width = `${viewport.width}px`;
    pageDiv.style.height = `${viewport.height}px`;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'kalaama-pdf-canvas';
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d')!;

    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    pageDiv.appendChild(canvas);

    // Create text layer
    const textLayer = await this.createTextLayer(page, viewport);
    pageDiv.appendChild(textLayer);

    this.container.appendChild(pageDiv);
  }

  /**
   * Create clickable text layer
   */
  private async createTextLayer(page: any, viewport: any): Promise<HTMLElement> {
    const textContent = await page.getTextContent();

    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'kalaama-pdf-text-layer';

    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;

      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

      // Split text into words and create clickable spans
      const words = item.str.split(/(\s+)/);
      let xOffset = 0;

      for (const word of words) {
        if (!word) continue;

        const span = document.createElement('span');

        if (word.trim()) {
          // It's a word - make it clickable
          span.className = 'kalaama-word';
          span.textContent = word;
          span.addEventListener('click', (e) => this.handleWordClick(e, word, item.str));
        } else {
          // It's whitespace
          span.textContent = word;
        }

        // Calculate position
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
        span.style.cssText = `
          left: ${tx[4] + xOffset}px;
          top: ${tx[5] - fontSize}px;
          font-size: ${fontSize}px;
          font-family: sans-serif;
        `;

        // Estimate width for next word position
        xOffset += word.length * fontSize * 0.5;

        textLayerDiv.appendChild(span);
      }
    }

    return textLayerDiv;
  }

  /**
   * Handle word click
   */
  private handleWordClick(event: Event, word: string, sentence: string): void {
    event.stopPropagation();
    event.preventDefault();

    // Remove previous selection
    document.querySelectorAll('.kalaama-word.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Mark as selected
    (event.target as HTMLElement).classList.add('selected');

    console.log('[Kalaama PDF] Word clicked:', word);

    if (this.onWordClick) {
      this.onWordClick(word.trim(), sentence);
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(pageNum: number): Promise<void> {
    if (pageNum < 1 || pageNum > this.totalPages) return;

    this.currentPage = pageNum;
    this.updatePageInfo();

    // Scroll to page
    const pageDiv = this.container?.querySelector(`[data-page-num="${pageNum}"]`);
    if (pageDiv) {
      pageDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Zoom in/out
   */
  async zoom(delta: number): Promise<void> {
    const newScale = Math.max(0.5, Math.min(3, this.scale + delta));
    if (newScale === this.scale) return;

    this.scale = newScale;

    const zoomInfo = document.getElementById('kalaama-zoom-info');
    if (zoomInfo) {
      zoomInfo.textContent = `${Math.round(this.scale * 100)}%`;
    }

    // Re-render all pages
    await this.renderAllPages();
  }

  /**
   * Update page info display
   */
  private updatePageInfo(): void {
    const pageInfo = document.getElementById('kalaama-page-info');
    if (pageInfo) {
      pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    }
  }

  /**
   * Apply grammar highlighting to all words
   */
  applyGrammarHighlighting(analysis: { words: { word: string; pos: string }[] }): void {
    document.body.classList.add('kalaama-grammar-enabled');

    const wordMap = new Map<string, string>();
    for (const w of analysis.words) {
      wordMap.set(w.word.toLowerCase(), w.pos);
    }

    document.querySelectorAll('.kalaama-word').forEach(span => {
      const word = span.textContent?.toLowerCase() || '';
      const pos = wordMap.get(word);
      if (pos) {
        span.classList.add(`pos-${pos}`);
      }
    });
  }
}
