import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  STORAGE_KEY,
  addBookmark,
  formatBookmark,
  generateSlug,
  loadBookmarks,
  normalizeUrl,
  serializeBookmarks,
} from '../src/lib/bookmarks.js';

describe('normalizeUrl', () => {
  it('saves the same value with and without "https://"', () => {
    assert.equal(normalizeUrl('example.com'), 'https://example.com');
    assert.equal(normalizeUrl('https://example.com'), 'https://example.com');
    assert.equal(normalizeUrl('https://example.com/'), 'https://example.com');
    assert.equal(normalizeUrl('  www.example.com  '), 'https://www.example.com');
  });

  it('keeps paths, queries and http URLs', () => {
    assert.equal(normalizeUrl('github.com/skills'), 'https://github.com/skills');
    assert.equal(normalizeUrl('http://example.com/a?b=1'), 'http://example.com/a?b=1');
  });

  it('rejects input that is not a web address', () => {
    for (const input of ['', '   ', 'not a url', 'localhosts', 'javascript:alert(1)', 'ftp://example.com', null, 42]) {
      assert.equal(normalizeUrl(input), null, `expected ${String(input)} to be rejected`);
    }
  });
});

describe('generateSlug', () => {
  it('creates a short base62 slug with the "mona-" prefix', () => {
    assert.match(generateSlug(), /^mona-[0-9a-zA-Z]{4}$/);
  });

  it('never reuses an existing slug', () => {
    const fixed = () => 0; // always produces "mona-0000" first
    assert.equal(generateSlug([], fixed), 'mona-0000');
    assert.notEqual(generateSlug(['mona-0000'], fixed), 'mona-0000');
  });
});

describe(`loadBookmarks ("${STORAGE_KEY}" value)`, () => {
  const valid = { url: 'https://example.com', slug: 'mona-7fk2' };

  it('round-trips saved bookmarks', () => {
    assert.deepEqual(loadBookmarks(serializeBookmarks([valid])), [valid]);
  });

  it('recovers from empty values', () => {
    assert.deepEqual(loadBookmarks(null), []);
    assert.deepEqual(loadBookmarks(''), []);
    assert.deepEqual(loadBookmarks('   '), []);
  });

  it('recovers from corrupted JSON', () => {
    assert.deepEqual(loadBookmarks('{not json'), []);
    assert.deepEqual(loadBookmarks('[{"url":'), []);
  });

  it('recovers from non-array values', () => {
    for (const raw of ['42', '"text"', 'true', 'null', '{"url":"https://example.com"}']) {
      assert.deepEqual(loadBookmarks(raw), [], `expected ${raw} to load as []`);
    }
  });

  it('recovers bookmarks from the legacy { bookmarks: [...] } shape', () => {
    assert.deepEqual(loadBookmarks(JSON.stringify({ bookmarks: [valid] })), [valid]);
  });

  it('drops malformed and duplicate entries but keeps the valid ones', () => {
    const raw = JSON.stringify([
      valid,
      'https://legacy-string.example',
      { url: 'https://no-slug.example' },
      { url: 'not a url', slug: 'mona-abcd' },
      { url: 'https://bad-slug.example', slug: '<img src=x>' },
      { url: 'https://dupe.example', slug: 'mona-7fk2' },
      null,
      ['nested'],
      { url: 'example.org', slug: 'mona-Zz99' },
    ]);
    assert.deepEqual(loadBookmarks(raw), [valid, { url: 'https://example.org', slug: 'mona-Zz99' }]);
  });
});

describe('addBookmark', () => {
  it('adds a normalised bookmark with a new slug to the top of the list', () => {
    const existing = [{ url: 'https://example.org', slug: 'mona-aaaa' }];
    const result = addBookmark(existing, 'example.com');
    assert.equal(result.error, undefined);
    assert.equal(result.bookmarks.length, 2);
    assert.equal(result.bookmarks[0].url, 'https://example.com');
    assert.match(result.bookmarks[0].slug, /^mona-/);
  });

  it('rejects invalid and duplicate URLs without changing the list', () => {
    const existing = [{ url: 'https://example.com', slug: 'mona-aaaa' }];
    assert.equal(addBookmark(existing, 'not a url').bookmarks, existing);
    const duplicate = addBookmark(existing, 'example.com/');
    assert.equal(duplicate.bookmarks, existing);
    assert.match(duplicate.error ?? '', /mona-aaaa/);
  });
});

describe('formatBookmark', () => {
  it('formats a saved bookmark as "<url> :: <slug>"', () => {
    assert.equal(formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }), 'https://www.example.com :: mona-7fk2');
  });
});
