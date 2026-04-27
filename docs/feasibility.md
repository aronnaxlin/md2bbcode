# Bangumi Markdown to BBCode feasibility research

## Sources

- Bangumi BBCode guide: https://bangumi.tv/help/bbcode
- Bangumi dev topic: https://bangumi.tv/group/topic/457299

## Current Bangumi BBCode surface

The official help page documents these basic BBCode tags:

- `[b]...[/b]`
- `[i]...[/i]`
- `[u]...[/u]`
- `[s]...[/s]`
- `[mask]...[/mask]`
- `[color=red]...[/color]`
- `[size=10]...[/size]`
- `[url]http://example.com[/url]`
- `[url=http://example.com]label[/url]`
- `[img]http://example.com/image.gif[/img]`

The page also shows keyboard shortcuts for common formatting actions:

- `Ctrl+B`: bold
- `Ctrl+I`: italic
- `Ctrl+U`: underline
- `Ctrl+D`: strikethrough
- `Ctrl+M`: mask
- `Ctrl+L`: link
- `Ctrl+P`: image

## Related community component

The dev topic is for a new BBCode preview component. The author says the old component had become invalid, and the new component adds:

- updated emoji support
- BMO support
- link domain conversion
- real-time preview, enabled by default and configurable from personalization
- adaptation across all pages
- compatibility with another component that adds BBCodeHelper to more places

In the same topic, a user asked whether Markdown would be developed. The component author answered no. This means Markdown support is currently an open niche rather than covered by that component.

There are also compatibility clues:

- A reply reports that preview content remains after posting a reply.
- A reply reports that spaces and line breaks inside quote environments do not match the actual rendered result.
- A reply shows that preview can accept CSS-like color values such as `rgba(...)`, while Bangumi itself does not support that syntax.

These are important because a Markdown converter should not rely only on preview output. It should target Bangumi's real accepted BBCode subset.

## Feasibility

Implementing Markdown to BBCode through a userscript is feasible.

The site already has textarea-based BBCode workflows and existing userscript/component precedent around BBCode helpers and preview. A userscript can attach UI controls near Bangumi textareas, transform selected text or the whole textarea value, and insert Bangumi-compatible BBCode before submission.

The safer approach is client-side conversion only:

- Do not submit Markdown directly.
- Convert Markdown into BBCode inside the textarea.
- Let Bangumi's normal posting flow handle the resulting BBCode.
- Keep the output within tags documented or observed to work on Bangumi.

## Recommended first supported Markdown subset

Use a real Markdown parser rather than regex-only conversion. `markdown-it` is the current recommendation because it has CommonMark-oriented parsing, built-in GFM strikethrough/table support, linkify support, a browser build, and renderer hooks that can emit BBCode directly instead of converting Markdown to HTML first.

High confidence mapping:

- `**bold**` / `__bold__` -> `[b]bold[/b]`
- `*italic*` / `_italic_` -> `[i]italic[/i]`
- `~~strike~~` -> `[s]strike[/s]`
- `[label](https://example.com)` -> `[url=https://example.com]label[/url]`
- bare image syntax `![alt](https://example.com/a.png)` -> `[img]https://example.com/a.png[/img]`
- inline code `` `code` `` -> preserve as plain text or map to `[code]` only after confirming Bangumi support
- paragraphs and hard line breaks -> preserve line breaks

Medium confidence mapping, should be tested against Bangumi rendering:

- blockquote `>` -> `[quote]...[/quote]`
- unordered lists -> plain lines prefixed with bullets, unless list BBCode support is confirmed
- ordered lists -> plain numbered lines, unless list BBCode support is confirmed
- fenced code blocks -> plain text or `[code]`, after confirming support

Unsupported or risky for v1:

- Markdown tables
- nested lists
- HTML blocks
- arbitrary color/style spans
- footnotes
- task list checkboxes

## Userscript implementation plan

1. Detect Bangumi textareas on common posting pages and dynamically added reply forms.
2. Add a small toolbar button such as `MD -> BBCode`.
3. On click, convert either the selected text or the entire textarea.
4. Preserve cursor/selection after replacement.
5. Do not reimplement BBCode preview in this script. Stay compatible with existing preview userscripts by dispatching normal textarea events after conversion.
6. Keep a small conversion core independent from DOM code so it can be unit tested.

## Risks and mitigations

- Bangumi's actual parser may support more or fewer tags than the help page documents.
  - Mitigation: start with the documented basic tags and add fixtures as real behavior is confirmed.
- Existing BBCode in the textarea could be double-converted or damaged.
  - Mitigation: v1 should convert only selected Markdown by default, with whole-text conversion as an explicit action.
- Markdown emphasis parsing has edge cases around underscores, URLs, CJK text, and nesting.
  - Mitigation: use a real Markdown parser AST rather than regex-only conversion.
- Preview component behavior can differ from actual Bangumi rendering.
  - Mitigation: do not copy or depend on preview implementation details; generate conservative BBCode and let preview plugins observe normal textarea updates.
- Multiple helper scripts may compete for toolbar space.
  - Mitigation: use a compact button and avoid assuming a fixed toolbar layout.

## Conclusion

The feature is practical as a userscript and fits existing Bangumi customization patterns. The MVP should be a conservative Markdown-to-documented-BBCode converter attached to Bangumi textareas, with selected-text conversion as the main workflow. Broader Markdown support should be added only after confirming Bangumi's real parser behavior for quote, code, and list tags.
