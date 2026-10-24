# Copilot instructions

Project context Copilot should apply to every session in this repository.

## Stack

- Framework: Astro (static output).
- Language: TypeScript.
- Styling: plain CSS in the base layout.

## Conventions

- Keep components small and focused.
- Prefer semantic HTML and accessible markup.
- Do not close, or add closing keywords for, the exercise walkthrough issue (issue #1) in any pull request. The exercise's GitHub Actions workflows manage that issue. When you open a pull request for app work, link only the specific app work-item issue you are implementing.

## Persistence and hydration rules

1. **Persistence uses browser `localStorage`.** Bookmarks (each an original URL and its short `mona-` slug) are saved under the `mona-bookmarks` key in `localStorage`. There is no server or database. Treat stored data as untrusted: validate it on load and recover from empty or corrupted values without throwing.
2. **Browser code runs behind a `client:load` boundary.** Any code that touches `localStorage`, `window` or `document` must live in a client-side boundary: an inline `<script>` in the component or a framework component hydrated with `client:load`. Never access browser APIs in Astro component frontmatter, which runs during SSR and the static build.
