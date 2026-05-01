/**
 * 兼容「为更多地方加上 BBCodeHelper」脚本（more_bbcode）。
 * 该脚本会为 Bangumi 上原本没有 markItUp 的 textarea 动态加载并初始化编辑器。
 * md2bbcode 需要：
 * 1. 识别这些 textarea 也需要增强；
 * 2. 在 more_bbcode 异步加载完成前，避免过早创建自定义工具栏导致重复。
 */

const MORE_BBCODE_SELECTORS = [
  '#msg_body',
  '#newbio',
  '#summary',
  '.tip textarea#content',
  '#desc',
  '#subject_summary',
  '#crt_summary',
  '#comment_list textarea.sub_reply'
];

/** 判断 textarea 是否是 more_bbcode 脚本会添加编辑器的目标 */
export function isMoreBBCodeTarget(element) {
  if (!element || element.tagName !== 'TEXTAREA') return false;
  return element.matches?.(MORE_BBCODE_SELECTORS.join(', '));
}

/**
 * 对 more_bbcode 目标进行轮询，等待其 markItUp 初始化完成。
 * 如果超时仍未出现，则静默结束，避免在 more_bbcode 初始化前
 * 由 md2bbcode 抢先创建自定义工具栏。
 */
export function waitForMoreBBCodeMarkItUp(textarea, onReady, timeout = 8000) {
  if (!textarea?.isConnected) return;
  if (textarea.closest('.markItUp')) {
    onReady();
    return;
  }

  const startTime = Date.now();
  const timer = setInterval(() => {
    if (!textarea.isConnected) {
      clearInterval(timer);
      return;
    }
    if (textarea.closest('.markItUp')) {
      clearInterval(timer);
      onReady();
      return;
    }
    if (Date.now() - startTime > timeout) {
      clearInterval(timer);
    }
  }, 300);
}
