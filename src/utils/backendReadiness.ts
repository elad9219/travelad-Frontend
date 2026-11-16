import axios from 'axios';
import globals from './globals';

// Keep the existing public server compatible until the backend migration.
// This documentation endpoint reads metadata and does not search or write history.
const readinessUrl = new URL('/v2/api-docs', globals.api.places).toString();
const MAX_ATTEMPTS = 6;
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;
const READY_TTL_MS = 15000;

let pending: Promise<void> | undefined;
let readyUntil = 0;

async function probeBackend(): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await axios.get(readinessUrl, {
        timeout: REQUEST_TIMEOUT_MS,
      });

      if (response.status === 200 && response.data?.swagger === '2.0') {
        readyUntil = Date.now() + READY_TTL_MS;
        return;
      }
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;

      if (status && ![502, 503, 504].includes(status)) {
        throw error;
      }
    }

    if (attempt + 1 < MAX_ATTEMPTS) {
      await new Promise<void>(resolve => {
        setTimeout(resolve, RETRY_DELAY_MS);
      });
    }
  }

  throw new Error('The demo server is not ready yet');
}

export function warmBackend(): Promise<void> {
  if (Date.now() < readyUntil) {
    return Promise.resolve();
  }

  if (!pending) {
    pending = probeBackend().finally(() => {
      pending = undefined;
    });
  }

  return pending;
}

export function waitForBackend(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(
      new DOMException('Search cancelled', 'AbortError')
    );
  }

  // Cancelling one search must not cancel the shared background warm-up.
  return new Promise<void>((resolve, reject) => {
    const cancelled = () => {
      signal.removeEventListener('abort', cancelled);
      reject(new DOMException('Search cancelled', 'AbortError'));
    };

    signal.addEventListener('abort', cancelled, { once: true });

    warmBackend().then(
      () => {
        signal.removeEventListener('abort', cancelled);
        resolve();
      },
      error => {
        signal.removeEventListener('abort', cancelled);
        reject(error);
      }
    );
  });
}