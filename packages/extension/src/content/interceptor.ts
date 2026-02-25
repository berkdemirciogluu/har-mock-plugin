/**
 * MAIN World Content Script Entry Point
 * manifest.json → content_scripts[1] → "world": "MAIN", "run_at": "document_start"
 *
 * Bu script sayfanın JS context'inde çalışır:
 * - window.fetch ve XMLHttpRequest override
 * - chrome.runtime API'lerine ERİŞİMİ YOK
 * - ISOLATED world content script ile window.postMessage üzerinden iletişim kurar
 */
import { MockResolver } from './mock-resolver';
import { interceptFetch } from './fetch-interceptor';
import { interceptXhr } from './xhr-interceptor';

const resolver = new MockResolver();
interceptFetch(resolver);
interceptXhr(resolver);
