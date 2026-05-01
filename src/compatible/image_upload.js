export const imageUploadBBCodeTags = ['photo'];

function parseHtmlAttribute(source, name) {
  const match = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))`, 'i').exec(source);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? '';
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildBangumiPhotoUrl(filename) {
  const trimmed = String(filename || '').trim();
  return trimmed ? `//lain.bgm.tv/pic/photo/l/${trimmed}` : '';
}

export function preprocessImageUploadHtmlImage(fullMatch) {
  const photoId = parseHtmlAttribute(fullMatch, 'data-bgm-photo-id').trim();
  const photoFilename = parseHtmlAttribute(fullMatch, 'data-bgm-photo-filename').trim();
  if (!/^\d+$/.test(photoId) || !photoFilename) return null;

  return `[photo=${photoId}]${photoFilename}[/photo]`;
}

export function renderImageUploadPhoto(node, value) {
  const filename = String(value || '').trim();
  const src = buildBangumiPhotoUrl(filename);
  if (!src) return '';

  const photoId = String(node?.attr || '').trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
  return `<img src="${escapeHtmlAttribute(src)}" data-bgm-photo-id="${escapeHtmlAttribute(photoId)}" data-bgm-photo-filename="${escapeHtmlAttribute(filename)}" />`;
}
