import axios from 'axios';
import globals from './globals';

// Both documentation endpoints are read-only and do not search or write history.
const readinessUrl = new URL('/v2/api-docs', globals.api.places).toString();
const openApiUrl = new URL('/v3/api-docs', globals.api.places).toString();

const MAX_ATTEMPTS = 6;
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;
const READY_TTL_MS = 15000;

let pending: Promise<void> | undefined;
let readyUntil = 0;

const isDocumentation = (data: unknown): boolean => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  const document = data as { swagger?: unknown; openapi?: unknown };

  return document.swagger === '2.0' ||
    (
      typeof document.openapi === 'string' &&
      /^3\.\d+\.\d+$/.test(document.openapi)
    );
};

async function probeBackend(): Promise<void> {
  // Resolve the endpoint again for each warm-up, including after a rollback.
  let url = readinessUrl;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const deadline = Date.now() + REQUEST_TIMEOUT_MS;

      const readDocumentation = (endpoint: string) => axios.get(endpoint, {
        timeout: Math.max(1, deadline - Date.now()),
      });

      let response;

      try {
        response = await readDocumentation(url);
      } catch (error) {
        if (
          url !== readinessUrl ||
          !axios.isAxiosError(error) ||
          error.response?.status !== 404
        ) {
          throw error;
        }

        url = openApiUrl;

        if (Date.now() >= deadline) {
          throw new Error('Readiness attempt timed out');
        }

        response = await readDocumentation(url);
      }

      if (response.status === 200 && isDocumentation(response.data)) {
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