import { v4 as uuidv4 } from 'uuid';

let sessionUserId: string | undefined;

export function getUserId(): string {
  if (sessionUserId) return sessionUserId;

  try {
    const stored = window.localStorage.getItem('userId');

    if (stored && /^[A-Za-z0-9_-]{1,128}$/.test(stored)) {
      sessionUserId = stored;
      return stored;
    }
  } catch {
    // Browsing and search must remain available when storage is blocked.
  }

  const generated = uuidv4();
  sessionUserId = generated;

  try {
    window.localStorage.setItem('userId', generated);
  } catch {
    // Share this tab's in-memory identity between search and history.
  }

  return generated;
}