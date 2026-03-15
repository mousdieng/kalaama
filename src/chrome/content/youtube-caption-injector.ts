/**
 * YouTube Caption Injector
 *
 * This module injects a script into YouTube's page context to access
 * the internal player API and extract captions directly.
 *
 * YouTube's caption URLs require session authentication that extensions can't provide.
 * By injecting into the page context, we can access the player's internal methods
 * that already have the captions loaded.
 *
 * NOTE: Uses external script file (page-injector.js) to comply with YouTube's
 * Content Security Policy which blocks inline scripts.
 */

/**
 * Inject the script into the page context using external file
 */
export function injectCaptionScript(): Promise<void> {
  return new Promise((resolve) => {
    // Check if already injected
    if ((window as any).__kalaamaInjected) {
      resolve();
      return;
    }

    // Check if script already exists
    if (document.getElementById('kalaama-page-injector')) {
      (window as any).__kalaamaInjected = true;
      resolve();
      return;
    }

    // Create script element that loads external file (CSP compliant)
    const script = document.createElement('script');
    script.id = 'kalaama-page-injector';
    script.src = chrome.runtime.getURL('content/page-injector.js');

    // Listen for ready signal from injected script
    const onReady = () => {
      console.log('[Kalaama] Page injector signaled ready');
      (window as any).__kalaamaInjected = true;
      window.removeEventListener('kalaama-injected-ready', onReady);
      resolve();
    };

    window.addEventListener('kalaama-injected-ready', onReady);

    // Handle script load error
    script.onerror = (error) => {
      console.error('[Kalaama] Failed to load page injector:', error);
      window.removeEventListener('kalaama-injected-ready', onReady);
      resolve(); // Resolve anyway to not block, we'll fall back to other methods
    };

    // Handle script load success (in case ready event doesn't fire)
    script.onload = () => {
      console.log('[Kalaama] Page injector script loaded');
      // Give it a moment to execute and fire the ready event
      setTimeout(() => {
        if (!(window as any).__kalaamaInjected) {
          console.log('[Kalaama] Page injector ready (via onload fallback)');
          (window as any).__kalaamaInjected = true;
          window.removeEventListener('kalaama-injected-ready', onReady);
          resolve();
        }
      }, 100);
    };

    // Inject the script
    (document.head || document.documentElement).appendChild(script);

    // Fallback timeout
    setTimeout(() => {
      if (!(window as any).__kalaamaInjected) {
        console.log('[Kalaama] Page injector ready (via timeout fallback)');
        (window as any).__kalaamaInjected = true;
        window.removeEventListener('kalaama-injected-ready', onReady);
        resolve();
      }
    }, 2000);
  });
}

/**
 * Send a request to the injected script and wait for response
 */
export function sendToInjectedScript<T>(action: string, data?: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const timeout = setTimeout(() => {
      window.removeEventListener('kalaama-response', handler);
      reject(new Error('Injected script request timeout'));
    }, 10000);

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      const response = customEvent.detail;
      if (response?.requestId !== requestId) return;

      clearTimeout(timeout);
      window.removeEventListener('kalaama-response', handler);

      if (response.success) {
        resolve(response as T);
      } else {
        reject(new Error(response.error || 'Request failed'));
      }
    };

    window.addEventListener('kalaama-response', handler);

    window.dispatchEvent(new CustomEvent('kalaama-request', {
      detail: { requestId, action, data }
    }));
  });
}
