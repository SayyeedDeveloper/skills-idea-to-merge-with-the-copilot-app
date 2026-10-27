// Pure bookmark helpers. No browser APIs here, so they run in unit tests (node --test)
// and in the client <script> in src/components/Bookmarks.astro.

/** @typedef {{ url: string; slug: string }} Bookmark */

export const STORAGE_KEY = 'mona-bookmarks';
export const SLUG_PREFIX = 'mona-';
export const SEPARATOR = ' :: ';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLUG_PATTERN = /^mona-[0-9a-zA-Z]{4,12}$/;
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;

/**
 * Normalise what the user typed into a canonical http(s) URL, or return null if it is not one.
 * "example.com", "https://example.com" and "https://example.com/" all become "https://example.com".
 * @param {unknown} input
 * @returns {string | null}
 */
export function normalizeUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;

  let parsed;
  try {
    parsed = new URL(HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') return null;

  const href = parsed.href;
  // Drop the bare trailing slash on root URLs so both spellings save the same value.
  return parsed.pathname === '/' && !parsed.search && !parsed.hash ? href.slice(0, -1) : href;
}

/**
 * Generate a unique "mona-" slug with a 4-character base62 suffix, for example "mona-7fk2".
 * @param {Iterable<string>} [existingSlugs]
 * @param {() => number} [random]
 * @returns {string}
 */
export function generateSlug(existingSlugs = [], random = Math.random) {
  const taken = new Set(existingSlugs);
  for (let length = 4; ; length++) {
    for (let attempt = 0; attempt < 20; attempt++) {
      let suffix = '';
      for (let i = 0; i < length; i++) suffix += BASE62[Math.floor(random() * BASE62.length) % BASE62.length];
      const slug = `${SLUG_PREFIX}${suffix}`;
      if (!taken.has(slug)) return slug;
    }
  }
}

/**
 * Validate one untrusted stored value, returning a clean bookmark or null.
 * @param {unknown} value
 * @returns {Bookmark | null}
 */
function toBookmark(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { url, slug } = /** @type {Record<string, unknown>} */ (value);
  const normalized = normalizeUrl(url);
  if (!normalized || typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) return null;
  return { url: normalized, slug };
}

/**
 * Parse the raw "mona-bookmarks" value from storage. Never throws: empty, corrupted,
 * legacy ({ bookmarks: [...] }) and non-array values recover to the valid bookmarks they
 * contain, or an empty list. Duplicate slugs and URLs are dropped.
 * @param {unknown} raw
 * @returns {Bookmark[]}
 */
export function loadBookmarks(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray(parsed.bookmarks)
      ? parsed.bookmarks
      : [];

  /** @type {Bookmark[]} */
  const bookmarks = [];
  const seen = new Set();
  for (const item of items) {
    const bookmark = toBookmark(item);
    if (bookmark && !seen.has(bookmark.slug) && !seen.has(bookmark.url)) {
      seen.add(bookmark.slug).add(bookmark.url);
      bookmarks.push(bookmark);
    }
  }
  return bookmarks;
}

/**
 * Serialise bookmarks for storage.
 * @param {Bookmark[]} bookmarks
 */
export function serializeBookmarks(bookmarks) {
  return JSON.stringify(bookmarks.map(({ url, slug }) => ({ url, slug })));
}

/**
 * Add a bookmark for the typed URL. Returns the new list, or an error message and the
 * unchanged list when the URL is invalid or already saved.
 * @param {Bookmark[]} bookmarks
 * @param {unknown} input
 * @param {() => number} [random]
 * @returns {{ bookmarks: Bookmark[]; added?: Bookmark; error?: string }}
 */
export function addBookmark(bookmarks, input, random = Math.random) {
  const url = normalizeUrl(input);
  if (!url) return { bookmarks, error: 'Please enter a valid web address, like example.com.' };
  const existing = bookmarks.find((bookmark) => bookmark.url === url);
  if (existing) return { bookmarks, error: `Already saved as ${existing.slug}.` };
  const added = { url, slug: generateSlug(bookmarks.map((bookmark) => bookmark.slug), random) };
  return { bookmarks: [added, ...bookmarks], added };
}

/**
 * Format a bookmark for display: "<url> :: <slug>".
 * @param {Bookmark} bookmark
 */
export function formatBookmark(bookmark) {
  return `${bookmark.url}${SEPARATOR}${bookmark.slug}`;
}
