import {loginUrl,safeLoginTarget} from '../config/loginRedirect.js';
// Use for fetch callers that need Response/blob while sharing session and timeout handling.
export async function request(url, options = {}) {
  const { timeoutMs = 30000, ...init } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (response.status === 401 && typeof window !== 'undefined') {
      const target=window.location.pathname+window.location.search+window.location.hash;
      if(safeLoginTarget(target))window.location.replace(loginUrl(target));
    }
    return response;
  } catch (cause) {
    if (timedOut) throw Object.assign(new Error('La operación ha tardado demasiado. Inténtalo de nuevo.'), { cause, code: 'TIMEOUT' });
    throw cause;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', abort);
  }
}
