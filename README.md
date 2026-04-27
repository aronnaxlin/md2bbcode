# md2bbcode

Markdown to BBCode helper for Bangumi, planned as a userscript.

## Usage

The installable userscript is a single file:

- `dist/md2bbcode.user.js`

Greasy Fork is stricter about bundled dependency code. Use this build there:

- `dist/md2bbcode.greasyfork.user.js`

Bangumi components do not support `@require`; use the component build there:

- `dist/md2bbcode.bgm.user.js`

Build it from source:

```powershell
npm.cmd run build
```

Then install `dist/md2bbcode.user.js` in Tampermonkey or another userscript manager.

## Development

Run tests:

```powershell
npm.cmd test
```

The userscript adds one editor toolbar icon:

- Markdown icon: converts selected Markdown to BBCode. If nothing is selected, it converts the whole textarea.

BBCode preview is intentionally not implemented here. If a Bangumi BBCode preview userscript is installed, this script stays compatible by updating the textarea and dispatching standard `input` / `change` events after conversion.

Markdown parsing is handled by `markdown-it`. The normal build bundles it into one file for local install; the Greasy Fork build uses `@require` with the readable upstream browser build to avoid obfuscation warnings; the Bangumi component build loads the same dependency at runtime with `$.getScript` when available.
