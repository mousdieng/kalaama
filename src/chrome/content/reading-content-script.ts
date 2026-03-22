/**
 * Kalaama Reading Mode Content Script
 * Enables word-level interaction on any web page or PDF for language learning
 */

import * as pdfjsLib from 'pdfjs-dist';

interface ReadingSettings {
  enabled: boolean;
  grammarHighlighting: boolean;
  grammarStyle: 'color' | 'underline' | 'background';
  showLegend: boolean;
  targetLanguage: string;
  nativeLanguage: string;
}

interface GrammarWord {
  word: string;
  pos: string;
  start: number;
  end: number;
}

interface GrammarAnalysisResponse {
  words: GrammarWord[];
}

class KalaamaReadingScript {
  private isEnabled = false;
  private isPDF = false;
  private pdfDoc: any = null;
  private pdfScale = 1.5;
  private pdfContainer: HTMLElement | null = null;
  private settings: ReadingSettings = {
    enabled: false,
    grammarHighlighting: false,
    grammarStyle: 'color',
    showLegend: true,
    targetLanguage: 'de',
    nativeLanguage: 'en'
  };
  private wrappedElements: WeakSet<Node> = new WeakSet();
  private originalNodes: Map<HTMLElement, { parent: Node; nextSibling: Node | null; html: string }> = new Map();
  private grammarCache: Map<string, GrammarAnalysisResponse> = new Map();
  private legendElement: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private lastClickTime = 0;
  private lastClickedWord = '';

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('[Kalaama Reading] Content script initialized');

    // Check if this is a PDF
    this.isPDF = this.detectPDF();
    console.log('[Kalaama Reading] Is PDF:', this.isPDF);

    // Load settings
    await this.loadSettings();

    // Listen for messages from side panel/service worker
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Send page info to side panel
    this.sendPageInfo();
  }

  /**
   * Detect if current page is a PDF
   */
  private detectPDF(): boolean {
    const url = window.location.href.toLowerCase();

    // Check URL extension
    if (url.endsWith('.pdf')) {
      return true;
    }

    // Check for PDF embed
    if (document.querySelector('embed[type="application/pdf"]')) {
      return true;
    }

    // Check content type
    if (document.contentType === 'application/pdf') {
      return true;
    }

    return false;
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['settings', 'reading_mode_enabled']);
      if (result.settings) {
        this.settings = {
          ...this.settings,
          targetLanguage: result.settings.target_language || 'de',
          nativeLanguage: result.settings.native_language || 'en',
          grammarHighlighting: result.settings.grammar_highlighting || false,
          grammarStyle: result.settings.grammar_style || 'color',
          showLegend: result.settings.grammar_legend !== false
        };
      }
      // Auto-enable if previously enabled on this domain
      if (result.reading_mode_enabled) {
        const domain = window.location.hostname;
        if (result.reading_mode_enabled[domain]) {
          this.enable();
        }
      }
    } catch (error) {
      console.warn('[Kalaama Reading] Failed to load settings:', error);
    }
  }

  private handleMessage(
    message: { type: string; payload?: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean {
    switch (message.type) {
      case 'TOGGLE_READING_MODE':
        if (this.isEnabled) {
          this.disable();
        } else {
          this.enable();
        }
        sendResponse({ enabled: this.isEnabled });
        break;

      case 'ENABLE_READING_MODE':
        this.enable();
        sendResponse({ enabled: true });
        break;

      case 'DISABLE_READING_MODE':
        this.disable();
        sendResponse({ enabled: false });
        break;

      case 'GET_READING_MODE_STATUS':
        sendResponse({
          enabled: this.isEnabled,
          pageTitle: document.title,
          pageUrl: window.location.href
        });
        break;

      case 'ENABLE_GRAMMAR_HIGHLIGHTING':
        this.settings.grammarHighlighting = true;
        this.applyGrammarHighlighting();
        sendResponse({ success: true });
        break;

      case 'DISABLE_GRAMMAR_HIGHLIGHTING':
        this.settings.grammarHighlighting = false;
        this.removeGrammarHighlighting();
        sendResponse({ success: true });
        break;

      case 'SETTINGS_UPDATED':
        const newSettings = message.payload as Record<string, unknown>;
        if (newSettings) {
          this.settings.targetLanguage = (newSettings.target_language as string) || this.settings.targetLanguage;
          this.settings.nativeLanguage = (newSettings.native_language as string) || this.settings.nativeLanguage;
          this.settings.grammarHighlighting = (newSettings.grammar_highlighting as boolean) || false;
          this.settings.grammarStyle = (newSettings.grammar_style as 'color' | 'underline' | 'background') || 'color';
          this.settings.showLegend = newSettings.grammar_legend !== false;
        }
        sendResponse({ success: true });
        break;

      default:
        return false;
    }
    return true;
  }

  private sendPageInfo(): void {
    chrome.runtime.sendMessage({
      type: 'READING_PAGE_INFO',
      payload: {
        title: document.title,
        url: window.location.href,
        language: document.documentElement.lang || this.detectLanguage()
      }
    }).catch(() => {});
  }

  private detectLanguage(): string {
    // Try to detect language from meta tags or content
    const metaLang = document.querySelector('meta[http-equiv="content-language"]');
    if (metaLang) {
      return metaLang.getAttribute('content') || '';
    }
    return '';
  }

  /**
   * Enable reading mode - wrap all text in clickable spans
   */
  async enable(): Promise<void> {
    if (this.isEnabled) return;

    console.log('[Kalaama Reading] Enabling reading mode, isPDF:', this.isPDF);
    this.isEnabled = true;

    if (this.isPDF) {
      // Handle PDF
      await this.enablePDFMode();
    } else {
      // Handle regular web page
      // Add reading-active class to body
      document.body.classList.add('kalaama-reading-active');

      // Wrap text nodes
      this.wrapTextNodes(document.body);

      // Set up mutation observer for dynamic content
      this.setupMutationObserver();
    }

    // Apply grammar highlighting if enabled
    if (this.settings.grammarHighlighting) {
      this.applyGrammarHighlighting();
    }

    // Show legend if enabled
    if (this.settings.grammarHighlighting && this.settings.showLegend) {
      this.showLegend();
    }

    // Save enabled state for this domain
    this.saveEnabledState(true);

    // Notify side panel
    chrome.runtime.sendMessage({
      type: 'READING_MODE_STATUS',
      payload: { enabled: true }
    }).catch(() => {});
  }

  /**
   * Enable PDF reading mode
   */
  private async enablePDFMode(): Promise<void> {
    console.log('[Kalaama Reading] Enabling PDF mode');
    console.log('[Kalaama Reading] Document structure:', document.body.innerHTML.substring(0, 500));

    try {
      // Get PDF URL BEFORE we modify the page
      const pdfUrl = this.getPDFUrl();
      if (!pdfUrl) {
        console.error('[Kalaama PDF] Could not determine PDF URL');
        return;
      }
      console.log('[Kalaama PDF] PDF URL:', pdfUrl);

      // Initialize PDF.js
      this.initPDFJS();

      // Create custom viewer (this clears the page)
      this.createPDFViewer();

      console.log('[Kalaama PDF] Loading PDF from:', pdfUrl);

      // Load and render PDF
      await this.loadPDF(pdfUrl);

    } catch (error) {
      console.error('[Kalaama PDF] Failed to enable PDF mode:', error);
    }
  }

  /**
   * Initialize PDF.js worker
   */
  private initPDFJS(): void {
    // Set worker source to bundled worker or CDN fallback
    const workerUrl = chrome.runtime.getURL('libs/pdf.worker.min.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('[Kalaama PDF] PDF.js initialized with worker:', workerUrl);
  }

  /**
   * Get PDF URL
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

    return window.location.href;
  }

  /**
   * Fetch file:// URL via service worker (bypasses CORS restrictions)
   */
  private async fetchFileAsArrayBuffer(url: string): Promise<ArrayBuffer> {
    console.log('[Kalaama PDF] Requesting file via service worker:', url);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_FILE_DATA',
        payload: { url }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data || response.data.length === 0) {
        throw new Error('Empty file data received');
      }

      // Convert array back to ArrayBuffer
      const uint8Array = new Uint8Array(response.data);
      console.log('[Kalaama PDF] Received file data, size:', uint8Array.length);
      return uint8Array.buffer;
    } catch (error) {
      console.error('[Kalaama PDF] Service worker fetch failed:', error);
      throw new Error('Cannot access file. Go to chrome://extensions → Kalaama → Details → Enable "Allow access to file URLs"');
    }
  }

  /**
   * Create PDF viewer UI
   */
  private createPDFViewer(): void {
    console.log('[Kalaama PDF] Creating custom PDF viewer...');

    // For Chrome's PDF viewer, we need to create a full-page overlay
    // because Chrome's PDF plugin can't be easily removed

    // First, try to hide Chrome's PDF viewer
    const embed = document.querySelector('embed[type="application/pdf"]');
    if (embed) {
      console.log('[Kalaama PDF] Hiding Chrome PDF embed');
      (embed as HTMLElement).style.display = 'none';
    }

    // Hide any other embeds or objects
    document.querySelectorAll('embed, object').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });

    // Create a full-page overlay container
    const overlay = document.createElement('div');
    overlay.id = 'kalaama-pdf-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: #525659;
      z-index: 999999;
      overflow: auto;
    `;

    // Add overlay to document
    document.body.appendChild(overlay);

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'kalaama-pdf-toolbar';
    toolbar.innerHTML = `
      <div style="position: absolute; left: 16px; color: #818cf8; font-weight: bold;">Kalaama PDF Reader</div>
      <button id="kalaama-prev-page" style="background: #4a4d50; border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer;">←</button>
      <span id="kalaama-page-info" style="color: white; min-width: 120px; text-align: center;">Loading...</span>
      <button id="kalaama-next-page" style="background: #4a4d50; border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer;">→</button>
      <span style="width: 32px;"></span>
      <button id="kalaama-zoom-out" style="background: #4a4d50; border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer;">−</button>
      <span id="kalaama-zoom-info" style="color: white; min-width: 60px; text-align: center;">${Math.round(this.pdfScale * 100)}%</span>
      <button id="kalaama-zoom-in" style="background: #4a4d50; border: none; color: white; width: 32px; height: 32px; border-radius: 4px; cursor: pointer;">+</button>
    `;
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
      gap: 12px;
      z-index: 10000;
      padding: 0 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;

    // Create container
    this.pdfContainer = document.createElement('div');
    this.pdfContainer.id = 'kalaama-pdf-container';
    this.pdfContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
      padding-top: 68px;
      min-height: 100vh;
    `;

    // Add toolbar and container to the overlay
    overlay.appendChild(toolbar);
    overlay.appendChild(this.pdfContainer);

    // Add PDF styles
    this.addPDFStyles();

    // Update toolbar z-index to be above overlay
    toolbar.style.zIndex = '1000000';

    // Add event listeners
    document.getElementById('kalaama-prev-page')?.addEventListener('click', () => this.pdfGoToPage(-1, true));
    document.getElementById('kalaama-next-page')?.addEventListener('click', () => this.pdfGoToPage(1, true));
    document.getElementById('kalaama-zoom-in')?.addEventListener('click', () => this.pdfZoom(0.25));
    document.getElementById('kalaama-zoom-out')?.addEventListener('click', () => this.pdfZoom(-0.25));

    console.log('[Kalaama PDF] Custom viewer created with overlay');
  }

  /**
   * Add PDF-specific styles including PDF.js text layer CSS
   */
  private addPDFStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .kalaama-pdf-page {
        background: white;
        margin-bottom: 20px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        position: relative;
      }

      /* PDF.js text layer CSS - required for proper alignment */
      .kalaama-pdf-text-layer {
        position: absolute;
        text-align: initial;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        overflow: hidden;
        opacity: 1;
        line-height: 1.0;
        z-index: 2;
        -webkit-text-size-adjust: none;
        -moz-text-size-adjust: none;
        text-size-adjust: none;
      }

      .kalaama-pdf-text-layer > span {
        color: transparent;
        position: absolute;
        white-space: pre;
        cursor: pointer;
        transform-origin: 0% 0%;
        pointer-events: auto;
      }

      .kalaama-pdf-text-layer .kalaama-word {
        cursor: pointer !important;
        pointer-events: auto !important;
        color: transparent !important;
      }

      .kalaama-pdf-text-layer .kalaama-word:hover {
        background-color: rgba(99, 102, 241, 0.3) !important;
      }

      .kalaama-pdf-text-layer .kalaama-word.selected {
        background-color: rgba(99, 102, 241, 0.4) !important;
      }

      /* Ensure text layer spans don't show text */
      .kalaama-pdf-text-layer span::selection {
        background: rgba(99, 102, 241, 0.3);
      }

      body.kalaama-grammar-enabled .kalaama-pdf-text-layer .kalaama-word.pos-noun { background-color: rgba(59, 130, 246, 0.3) !important; }
      body.kalaama-grammar-enabled .kalaama-pdf-text-layer .kalaama-word.pos-verb { background-color: rgba(239, 68, 68, 0.3) !important; }
      body.kalaama-grammar-enabled .kalaama-pdf-text-layer .kalaama-word.pos-adjective { background-color: rgba(34, 197, 94, 0.3) !important; }
      body.kalaama-grammar-enabled .kalaama-pdf-text-layer .kalaama-word.pos-adverb { background-color: rgba(249, 115, 22, 0.3) !important; }
    `;
    document.head.appendChild(style);
  }

  /**
   * Load PDF document
   */
  private async loadPDF(url: string): Promise<void> {
    const pageInfo = document.getElementById('kalaama-page-info');

    try {
      console.log('[Kalaama PDF] Loading PDF from:', url);
      if (pageInfo) pageInfo.textContent = 'Fetching PDF...';

      // For file:// URLs, use XMLHttpRequest which has better file:// support
      let pdfData: ArrayBuffer | string;

      if (url.startsWith('file://') || url.startsWith('file:///')) {
        console.log('[Kalaama PDF] Using XMLHttpRequest for file:// URL');
        try {
          pdfData = await this.fetchFileAsArrayBuffer(url);
          console.log('[Kalaama PDF] Got PDF data, size:', pdfData.byteLength);
        } catch (fetchError) {
          console.error('[Kalaama PDF] Fetch failed:', fetchError);
          throw fetchError;
        }
      } else {
        // For http/https URLs, PDF.js can load directly
        pdfData = url;
      }

      if (pageInfo) pageInfo.textContent = 'Rendering...';
      console.log('[Kalaama PDF] Creating PDF document...');

      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      this.pdfDoc = await loadingTask.promise;

      console.log(`[Kalaama PDF] Loaded PDF with ${this.pdfDoc.numPages} pages`);

      this.updatePDFPageInfo(1, this.pdfDoc.numPages);

      // Render all pages
      for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
        await this.renderPDFPage(pageNum);
      }
    } catch (error) {
      console.error('[Kalaama PDF] Failed to load PDF:', error);
      if (this.pdfContainer) {
        const isFileUrl = url.startsWith('file://');
        this.pdfContainer.innerHTML = `
          <div style="color: white; text-align: center; padding: 40px; max-width: 600px;">
            <h2 style="color: #ef4444;">Failed to load PDF</h2>
            <p style="color: #fca5a5; margin: 20px 0;">${error}</p>
            ${isFileUrl ? `
              <div style="background: #374151; padding: 20px; border-radius: 8px; text-align: left; margin-top: 20px;">
                <p style="font-weight: bold; margin-bottom: 10px;">To read local PDF files:</p>
                <ol style="margin-left: 20px; line-height: 1.8;">
                  <li>Go to <code style="background: #1f2937; padding: 2px 6px; border-radius: 4px;">chrome://extensions</code></li>
                  <li>Find <strong>Kalaama</strong> and click <strong>Details</strong></li>
                  <li>Enable <strong>"Allow access to file URLs"</strong></li>
                  <li>Reload this page</li>
                </ol>
              </div>
            ` : `
              <p style="margin-top: 20px;">Try refreshing the page or check if the PDF is accessible.</p>
            `}
          </div>
        `;
      }
    }
  }

  /**
   * Render a PDF page
   */
  private async renderPDFPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc || !this.pdfContainer) return;

    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.pdfScale });

    // Create page container
    const pageDiv = document.createElement('div');
    pageDiv.className = 'kalaama-pdf-page';
    pageDiv.dataset.pageNum = String(pageNum);
    pageDiv.style.width = `${viewport.width}px`;
    pageDiv.style.height = `${viewport.height}px`;
    pageDiv.style.position = 'relative';

    // Create canvas - ensure no margins/padding
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.cssText = 'display: block; margin: 0; padding: 0;';
    const context = canvas.getContext('2d')!;

    // Render page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;

    pageDiv.appendChild(canvas);

    // Create text layer with clickable areas
    const textContent = await page.getTextContent();
    const textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'kalaama-pdf-text-layer';
    textLayerDiv.style.cssText = `
      position: absolute;
      left: 0;
      top: 0;
      width: ${viewport.width}px;
      height: ${viewport.height}px;
      overflow: hidden;
      pointer-events: none;
    `;

    // Create a measuring canvas for accurate text width calculation
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d')!;

    // Group text items by line (similar Y position) to build sentence context
    const lineGroups = new Map<number, any[]>();
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const y = Math.round(tx[5]); // Round Y to group items on same line
      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)!.push({ item, tx });
    }

    // Build sentence context for each line
    const lineSentences = new Map<number, string>();
    for (const [y, items] of lineGroups) {
      // Sort by X position and join text
      items.sort((a, b) => a.tx[4] - b.tx[4]);
      const sentence = items.map(i => i.item.str).join(' ').replace(/\s+/g, ' ').trim();
      lineSentences.set(y, sentence);
    }

    // Create clickable spans for each WORD in each text item
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;

      // Get the transform for this text item in viewport coordinates
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

      // Font height from vertical scale components
      const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);

      // Use item height if available, otherwise use font height
      const itemHeight = item.height ? item.height * viewport.scale : fontHeight;

      // Base position
      const baseLeft = tx[4];
      const top = tx[5] - itemHeight;

      // Get the font family from the item if available
      const fontFamily = item.fontName || 'sans-serif';

      // Set up measuring context with the same font
      measureCtx.font = `${fontHeight}px ${fontFamily}`;

      // Total width of this text item (from PDF)
      const pdfTotalWidth = item.width ? item.width * viewport.scale : measureCtx.measureText(item.str).width;

      // Measure actual text width to calculate scale factor
      const measuredWidth = measureCtx.measureText(item.str).width;
      const scaleFactor = pdfTotalWidth / measuredWidth;

      // Split into words and create individual spans
      const text = item.str;
      // Get sentence context from the full line
      const lineY = Math.round(tx[5]);
      const sentence = lineSentences.get(lineY) || item.str;

      // Split by whitespace, keeping track of positions
      const parts = text.split(/(\s+)/);
      let currentX = baseLeft;

      for (const part of parts) {
        // Measure this part's width
        const partWidth = measureCtx.measureText(part).width * scaleFactor;

        if (part.trim()) {
          // This is a word - create clickable span
          const span = document.createElement('span');
          span.className = 'kalaama-word';
          span.textContent = part;
          span.dataset.sentence = sentence;

          span.style.cssText = `
            position: absolute;
            left: ${currentX}px;
            top: ${top}px;
            font-size: ${fontHeight}px;
            font-family: ${fontFamily}, sans-serif;
            transform-origin: left top;
            white-space: pre;
            color: transparent;
            pointer-events: auto;
            cursor: pointer;
            line-height: 1;
            width: ${partWidth}px;
            height: ${itemHeight}px;
          `;

          span.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Remove previous selection
            document.querySelectorAll('.kalaama-word.selected').forEach(el => {
              el.classList.remove('selected');
            });
            span.classList.add('selected');

            this.handlePDFWordClick(e, part, sentence);
          });

          textLayerDiv.appendChild(span);
        }

        // Move x position forward by this part's width
        currentX += partWidth;
      }
    }

    pageDiv.appendChild(textLayerDiv);
    this.pdfContainer.appendChild(pageDiv);
  }

  /**
   * Handle word click in PDF
   */
  private handlePDFWordClick(event: Event, word: string, sentence: string): void {
    event.stopPropagation();
    event.preventDefault();

    const cleanWord = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    if (!cleanWord) return;

    // Debounce: ignore duplicate clicks within 300ms on same word
    const now = Date.now();
    if (cleanWord === this.lastClickedWord && now - this.lastClickTime < 300) {
      console.log('[Kalaama Reading] Ignoring duplicate click on:', cleanWord);
      return;
    }
    this.lastClickTime = now;
    this.lastClickedWord = cleanWord;

    // Remove previous selection
    document.querySelectorAll('.kalaama-word.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Mark as selected
    (event.target as HTMLElement).classList.add('selected');

    console.log('='.repeat(50));
    console.log('[TRACE 1/5] Content Script - Word clicked');
    console.log('  Word:', cleanWord);
    console.log('  Sentence:', sentence);
    console.log('  Sending READING_WORD_CLICK message...');

    // Send to side panel
    chrome.runtime.sendMessage({
      type: 'READING_WORD_CLICK',
      payload: {
        word: cleanWord,
        sentence: sentence,
        pageUrl: window.location.href,
        pageTitle: document.title || 'PDF Document'
      }
    }).then(() => {
      console.log('[TRACE 1/5] Message sent successfully');
    }).catch(err => {
      console.warn('[TRACE 1/5] Failed to send message:', err);
    });
  }

  /**
   * Navigate PDF pages
   */
  private pdfGoToPage(delta: number, relative: boolean): void {
    // Get current visible page
    const pages = document.querySelectorAll('.kalaama-pdf-page');
    let currentPage = 1;

    for (const page of pages) {
      const rect = page.getBoundingClientRect();
      if (rect.top < window.innerHeight / 2) {
        currentPage = parseInt((page as HTMLElement).dataset.pageNum || '1');
      }
    }

    const targetPage = relative ? currentPage + delta : delta;
    if (targetPage < 1 || targetPage > (this.pdfDoc?.numPages || 1)) return;

    const targetEl = document.querySelector(`[data-page-num="${targetPage}"]`);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    this.updatePDFPageInfo(targetPage, this.pdfDoc?.numPages || 1);
  }

  /**
   * Zoom PDF
   */
  private async pdfZoom(delta: number): Promise<void> {
    const newScale = Math.max(0.5, Math.min(3, this.pdfScale + delta));
    if (newScale === this.pdfScale) return;

    this.pdfScale = newScale;

    const zoomInfo = document.getElementById('kalaama-zoom-info');
    if (zoomInfo) {
      zoomInfo.textContent = `${Math.round(this.pdfScale * 100)}%`;
    }

    // Re-render all pages
    if (this.pdfContainer && this.pdfDoc) {
      this.pdfContainer.innerHTML = '';
      for (let pageNum = 1; pageNum <= this.pdfDoc.numPages; pageNum++) {
        await this.renderPDFPage(pageNum);
      }
    }
  }

  /**
   * Update page info display
   */
  private updatePDFPageInfo(current: number, total: number): void {
    const pageInfo = document.getElementById('kalaama-page-info');
    if (pageInfo) {
      pageInfo.textContent = `Page ${current} of ${total}`;
    }
  }

  /**
   * Disable reading mode - remove all wrappers
   */
  disable(): void {
    if (!this.isEnabled) return;

    console.log('[Kalaama Reading] Disabling reading mode');
    this.isEnabled = false;

    // Remove reading-active class
    document.body.classList.remove('kalaama-reading-active');
    document.body.classList.remove('kalaama-grammar-enabled');
    document.body.classList.remove('kalaama-grammar-underline');
    document.body.classList.remove('kalaama-grammar-background');

    // Stop observing
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove wrappers
    this.unwrapTextNodes();

    // Hide legend
    this.hideLegend();

    // Save disabled state for this domain
    this.saveEnabledState(false);

    // Notify side panel
    chrome.runtime.sendMessage({
      type: 'READING_MODE_STATUS',
      payload: { enabled: false }
    }).catch(() => {});
  }

  private async saveEnabledState(enabled: boolean): Promise<void> {
    try {
      const result = await chrome.storage.local.get('reading_mode_enabled');
      const states = result.reading_mode_enabled || {};
      states[window.location.hostname] = enabled;
      await chrome.storage.local.set({ reading_mode_enabled: states });
    } catch (error) {
      console.warn('[Kalaama Reading] Failed to save enabled state:', error);
    }
  }

  /**
   * Wrap all text nodes in clickable spans
   */
  private wrapTextNodes(root: HTMLElement): void {
    // Elements to skip
    const skipTags = new Set([
      'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
      'SVG', 'CANVAS', 'VIDEO', 'AUDIO', 'INPUT', 'TEXTAREA',
      'SELECT', 'BUTTON', 'CODE', 'PRE', 'KBD', 'SAMP'
    ]);

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if already wrapped
          if (this.wrappedElements.has(node)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip empty text nodes
          if (!node.textContent?.trim()) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip certain parent elements
          const parent = node.parentElement;
          if (!parent || skipTags.has(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }

          // Skip if parent is already a kalaama-word span
          if (parent.classList.contains('kalaama-word')) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    // Collect all text nodes first (to avoid modifying while iterating)
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }

    // Wrap each text node
    for (const textNode of textNodes) {
      this.wrapTextNode(textNode);
    }
  }

  /**
   * Wrap a single text node's words in spans
   */
  private wrapTextNode(textNode: Text): void {
    const text = textNode.textContent || '';
    if (!text.trim()) return;

    // Mark as wrapped
    this.wrappedElements.add(textNode);

    // Split into words while preserving whitespace
    const fragment = document.createDocumentFragment();

    // Regex to match words (including unicode letters) and non-words (whitespace, punctuation)
    const regex = /([\p{L}\p{N}]+)|([^\p{L}\p{N}]+)/gu;
    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, word, nonWord] = match;

      if (word) {
        // Create clickable span for word
        const span = document.createElement('span');
        span.className = 'kalaama-word';
        span.textContent = word;
        span.dataset.wordIndex = String(lastIndex);
        span.addEventListener('click', (e) => this.handleWordClick(e, word, span));
        fragment.appendChild(span);
      } else if (nonWord) {
        // Preserve whitespace and punctuation
        fragment.appendChild(document.createTextNode(nonWord));
      }

      lastIndex = regex.lastIndex;
    }

    // Replace text node with fragment
    const parent = textNode.parentNode;
    if (parent) {
      parent.replaceChild(fragment, textNode);
    }
  }

  /**
   * Remove all word wrappers and restore original text
   */
  private unwrapTextNodes(): void {
    const wordSpans = document.querySelectorAll('.kalaama-word');

    wordSpans.forEach(span => {
      const textNode = document.createTextNode(span.textContent || '');
      span.parentNode?.replaceChild(textNode, span);
    });

    // Clear wrapped set
    this.wrappedElements = new WeakSet();
  }

  /**
   * Handle word click - send to side panel for translation
   */
  private handleWordClick(event: Event, word: string, element: HTMLElement): void {
    event.stopPropagation();
    event.preventDefault();

    // Remove previous selection
    document.querySelectorAll('.kalaama-word.selected').forEach(el => {
      el.classList.remove('selected');
    });

    // Mark as selected
    element.classList.add('selected');

    // Get sentence context
    const sentence = this.getSentenceContext(element);

    console.log('[Kalaama Reading] Word clicked:', word, 'in sentence:', sentence);

    // Send to side panel
    chrome.runtime.sendMessage({
      type: 'READING_WORD_CLICK',
      payload: {
        word,
        sentence,
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    }).catch(err => {
      console.warn('[Kalaama Reading] Failed to send word click:', err);
    });
  }

  /**
   * Extract the sentence containing the clicked word
   */
  private getSentenceContext(element: HTMLElement): string {
    // Try to find the parent paragraph or similar block element
    let block = element.parentElement;
    while (block && !['P', 'DIV', 'LI', 'TD', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'ARTICLE', 'SECTION'].includes(block.tagName)) {
      block = block.parentElement;
    }

    if (!block) {
      block = element.parentElement;
    }

    const fullText = block?.textContent || '';

    // Try to extract just the sentence containing the word
    const wordText = element.textContent || '';
    const wordIndex = fullText.indexOf(wordText);

    if (wordIndex === -1) return fullText.slice(0, 200);

    // Find sentence boundaries
    const beforeWord = fullText.slice(0, wordIndex);
    const afterWord = fullText.slice(wordIndex);

    // Look for sentence start (., !, ?, or start of text)
    const sentenceStartMatch = beforeWord.match(/[.!?]\s+[^.!?]*$/);
    const sentenceStart = sentenceStartMatch
      ? wordIndex - sentenceStartMatch[0].length + sentenceStartMatch[0].indexOf(sentenceStartMatch[0].trim())
      : Math.max(0, wordIndex - 100);

    // Look for sentence end
    const sentenceEndMatch = afterWord.match(/[.!?]/);
    const sentenceEnd = sentenceEndMatch
      ? wordIndex + sentenceEndMatch.index! + 1
      : Math.min(fullText.length, wordIndex + 100);

    return fullText.slice(sentenceStart, sentenceEnd).trim();
  }

  /**
   * Set up mutation observer for dynamic content
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.wrapTextNodes(node as HTMLElement);
            }
          });
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Apply grammar highlighting to all words
   */
  private async applyGrammarHighlighting(): Promise<void> {
    if (!this.isEnabled) return;

    // Add grammar class based on style
    document.body.classList.add('kalaama-grammar-enabled');
    if (this.settings.grammarStyle === 'underline') {
      document.body.classList.add('kalaama-grammar-underline');
    } else if (this.settings.grammarStyle === 'background') {
      document.body.classList.add('kalaama-grammar-background');
    }

    // Get visible paragraphs
    const paragraphs = this.getVisibleParagraphs();

    for (const p of paragraphs) {
      const text = p.textContent?.trim();
      if (!text || text.length < 10) continue;

      const cacheKey = this.hashText(text);
      let analysis = this.grammarCache.get(cacheKey);

      if (!analysis) {
        try {
          analysis = await this.requestGrammarAnalysis(text);
          if (analysis) {
            this.grammarCache.set(cacheKey, analysis);
          }
        } catch (error) {
          console.warn('[Kalaama Reading] Grammar analysis failed:', error);
          continue;
        }
      }

      if (analysis) {
        this.applyGrammarToElement(p, analysis);
      }
    }

    // Show legend if enabled
    if (this.settings.showLegend) {
      this.showLegend();
    }
  }

  /**
   * Remove grammar highlighting
   */
  private removeGrammarHighlighting(): void {
    document.body.classList.remove('kalaama-grammar-enabled');
    document.body.classList.remove('kalaama-grammar-underline');
    document.body.classList.remove('kalaama-grammar-background');

    // Remove POS classes from words
    document.querySelectorAll('.kalaama-word').forEach(el => {
      el.className = 'kalaama-word';
    });

    this.hideLegend();
  }

  /**
   * Get visible paragraphs for grammar analysis
   */
  private getVisibleParagraphs(): HTMLElement[] {
    const paragraphs: HTMLElement[] = [];
    const elements = document.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, td, th');

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      // Check if element is in viewport or close to it
      if (rect.top < window.innerHeight + 500 && rect.bottom > -500) {
        paragraphs.push(el as HTMLElement);
      }
    });

    return paragraphs;
  }

  /**
   * Request grammar analysis from service worker
   */
  private async requestGrammarAnalysis(text: string): Promise<GrammarAnalysisResponse | null> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_GRAMMAR_ANALYSIS',
        payload: {
          text: text.slice(0, 500), // Limit text length
          language: this.settings.targetLanguage
        }
      });
      return response as GrammarAnalysisResponse;
    } catch (error) {
      console.warn('[Kalaama Reading] Grammar analysis request failed:', error);
      return null;
    }
  }

  /**
   * Apply grammar analysis to element
   */
  private applyGrammarToElement(element: HTMLElement, analysis: GrammarAnalysisResponse): void {
    const wordSpans = element.querySelectorAll('.kalaama-word');
    const wordMap = new Map<string, string>();

    // Build map of word -> POS
    for (const wordData of analysis.words) {
      const normalizedWord = wordData.word.toLowerCase();
      wordMap.set(normalizedWord, wordData.pos);
    }

    // Apply POS classes to word spans
    wordSpans.forEach(span => {
      const word = span.textContent?.toLowerCase() || '';
      const pos = wordMap.get(word);
      if (pos) {
        span.classList.add(`pos-${pos}`);
      }
    });
  }

  /**
   * Simple hash function for caching
   */
  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Show grammar legend
   */
  private showLegend(): void {
    if (this.legendElement) return;

    this.legendElement = document.createElement('div');
    this.legendElement.className = 'kalaama-grammar-legend';
    this.legendElement.innerHTML = `
      <div class="kalaama-grammar-legend-title">Grammar Legend</div>
      <div class="kalaama-grammar-legend-item">
        <span class="kalaama-grammar-legend-color noun"></span>
        <span>Noun</span>
      </div>
      <div class="kalaama-grammar-legend-item">
        <span class="kalaama-grammar-legend-color verb"></span>
        <span>Verb</span>
      </div>
      <div class="kalaama-grammar-legend-item">
        <span class="kalaama-grammar-legend-color adjective"></span>
        <span>Adjective</span>
      </div>
      <div class="kalaama-grammar-legend-item">
        <span class="kalaama-grammar-legend-color adverb"></span>
        <span>Adverb</span>
      </div>
      <div class="kalaama-grammar-legend-close" title="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </div>
    `;

    // Close button handler
    const closeBtn = this.legendElement.querySelector('.kalaama-grammar-legend-close');
    closeBtn?.addEventListener('click', () => this.hideLegend());

    document.body.appendChild(this.legendElement);
  }

  /**
   * Hide grammar legend
   */
  private hideLegend(): void {
    if (this.legendElement) {
      this.legendElement.remove();
      this.legendElement = null;
    }
  }
}

// Initialize reading script
new KalaamaReadingScript();
