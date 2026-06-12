/**
 * 文档高亮服务
 * 在预览 HTML 中插入风险高亮标记
 */

import sanitizeHtml from 'sanitize-html';

export interface FindingForHighlight {
  id: string;
  evidence: string[];
  maskedEvidence: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  locationStatus: 'located' | 'not_found';
}

export interface HighlightOptions {
  previewHtml: string;
  findings: FindingForHighlight[];
}

export interface HighlightResult {
  highlightedHtml: string;
  highlightCount: number;
  notFoundFindings: string[];
}

/**
 * 高亮严重程度对应的 CSS 类名
 */
const SEVERITY_CLASSES: Record<string, string> = {
  critical: 'doc-risk-critical',
  high: 'doc-risk-high',
  medium: 'doc-risk-medium',
  low: 'doc-risk-low',
};

/**
 * 在 HTML 文本节点中查找并高亮证据
 * 使用简单的字符串替换，但确保不会破坏 HTML 标签
 */
export function highlightEvidenceInHtml(options: HighlightOptions): HighlightResult {
  const { previewHtml, findings } = options;
  
  if (!previewHtml || findings.length === 0) {
    return {
      highlightedHtml: previewHtml,
      highlightCount: 0,
      notFoundFindings: [],
    };
  }

  let highlightedHtml = previewHtml;
  let highlightCount = 0;
  const notFoundFindings: string[] = [];

  // 按证据长度降序排序，优先高亮较长的证据（避免短证据破坏长证据的高亮）
  const sortedFindings = [...findings].sort((a, b) => {
    const aMaxLen = Math.max(...a.evidence.map(e => e.length));
    const bMaxLen = Math.max(...b.evidence.map(e => e.length));
    return bMaxLen - aMaxLen;
  });

  // 用于追踪已经高亮的文本位置，避免重复高亮
  const highlightedRanges: Array<{ start: number; end: number }> = [];

  for (const finding of sortedFindings) {
    if (finding.locationStatus === 'not_found') {
      notFoundFindings.push(finding.id);
      continue;
    }

    const severityClass = SEVERITY_CLASSES[finding.severity] || 'doc-risk-medium';
    let found = false;

    // 尝试用原始证据定位
    for (let i = 0; i < finding.evidence.length; i++) {
      const originalEvidence = finding.evidence[i];
      const maskedEvidence = finding.maskedEvidence[i] || originalEvidence;

      if (!originalEvidence || originalEvidence.trim().length === 0) continue;

      // 在 HTML 中查找证据（需要考虑 HTML 转义）
      const escapedEvidence = escapeHtmlText(originalEvidence);
      const escapedMasked = escapeHtmlText(maskedEvidence);

      // 查找所有出现的位置
      let searchPos = 0;
      let foundInThisEvidence = false;

      while (searchPos < highlightedHtml.length) {
        const pos = highlightedHtml.indexOf(escapedEvidence, searchPos);
        if (pos === -1) break;

        // 检查是否在 HTML 标签内（简单检查：向前找 < 和 >）
        const beforeText = highlightedHtml.substring(0, pos);
        const lastOpenTag = beforeText.lastIndexOf('<');
        const lastCloseTag = beforeText.lastIndexOf('>');

        // 如果最后一个 < 在最后一个 > 之后，说明在标签内
        if (lastOpenTag > lastCloseTag) {
          searchPos = pos + 1;
          continue;
        }

        // 检查是否已经被高亮
        const isAlreadyHighlighted = highlightedRanges.some(
          range => pos >= range.start && pos < range.end
        );

        if (isAlreadyHighlighted) {
          searchPos = pos + escapedEvidence.length;
          continue;
        }

        // 创建高亮标记
        const highlightTag = `<mark class="doc-risk-highlight ${severityClass}" data-finding-id="${finding.id}">${escapedMasked}</mark>`;

        // 替换文本
        highlightedHtml =
          highlightedHtml.substring(0, pos) +
          highlightTag +
          highlightedHtml.substring(pos + escapedEvidence.length);

        // 记录已高亮的范围
        highlightedRanges.push({
          start: pos,
          end: pos + highlightTag.length,
        });

        found = true;
        foundInThisEvidence = true;
        highlightCount++;

        // 继续搜索下一个出现（更新搜索位置，考虑新插入的标签长度）
        searchPos = pos + highlightTag.length + 1;
        break; // 每个 evidence 只高亮第一个匹配
      }

      if (foundInThisEvidence) break;

      // 如果原始证据找不到，尝试用脱敏后的证据查找（仅用于定位）
      if (!foundInThisEvidence && maskedEvidence !== originalEvidence) {
        const maskedPos = highlightedHtml.indexOf(escapedMasked);
        if (maskedPos !== -1) {
          // 检查是否在标签内
          const beforeText = highlightedHtml.substring(0, maskedPos);
          const lastOpenTag = beforeText.lastIndexOf('<');
          const lastCloseTag = beforeText.lastIndexOf('>');

          if (lastOpenTag <= lastCloseTag) {
            const highlightTag = `<mark class="doc-risk-highlight ${severityClass}" data-finding-id="${finding.id}">${escapedMasked}</mark>`;
            highlightedHtml =
              highlightedHtml.substring(0, maskedPos) +
              highlightTag +
              highlightedHtml.substring(maskedPos + escapedMasked.length);

            found = true;
            highlightCount++;
          }
        }
      }
    }

    if (!found) {
      notFoundFindings.push(finding.id);
    }
  }

  return {
    highlightedHtml,
    highlightCount,
    notFoundFindings,
  };
}

/**
 * HTML 文本转义（用于在 HTML 中搜索）
 */
function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 清洗高亮后的 HTML（确保安全）
 */
export function sanitizeHighlightedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'div', 'span',
      'mark', // 允许高亮标签
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title'],
      table: ['class'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
      div: ['class'],
      span: ['class'],
      mark: ['class', 'data-finding-id'], // 允许高亮标签的属性
    },
    allowedSchemes: ['http', 'https', 'data'],
  });
}
