/**
 * 暴力仇恨言论检测器
 * 
 * 检测内容：
 * 1. 暴力威胁
 * 2. 人身攻击
 * 3. 仇恨言论
 * 4. 煽动伤害
 * 5. 针对群体的侮辱
 * 6. 极端攻击性表达
 */

import type { IRiskDetector, RiskFinding } from '../types';

export class ViolenceHateDetector implements IRiskDetector {
  readonly dimension = 'violence_hate';

  // 暴力威胁关键词
  private readonly violenceKeywords = [
    // 中文
    '杀', '打死', '砍死', '弄死', '弄死你', '打死你', '砍死你',
    '弄死他', '打死他', '砍死他', '灭口', '暗杀', '刺杀',
    '爆炸', '炸弹', '袭击', '攻击', '伤害', '殴打', '暴打',
    '威胁', '恐吓', '勒索', '绑架', '劫持',
    '强奸', '性侵', '猥亵', '骚扰',
    
    // 英文
    'kill', 'murder', 'assassinate', 'slaughter',
    'bomb', 'explode', 'attack', 'assault', 'rape',
    'threat', 'terrorist', 'terrorism',
  ];

  // 仇恨言论关键词
  private readonly hateKeywords = [
    // 中文
    '畜生', '畜牲', '狗', '猪', '垃圾', '废物', '渣滓',
    '贱人', '婊子', '傻逼', '傻B', 'SB', 'sb',
    '脑残', '智障', '白痴', '弱智', '变态',
    '种族歧视', '民族歧视', '地域歧视',
    '仇恨', '歧视', '侮辱', '辱骂', '谩骂',
    
    // 英文
    'nigger', 'nigga', 'chink', 'gook', 'spic', 'kike',
    'fag', 'faggot', 'dyke', 'tranny',
    'bitch', 'whore', 'slut', 'cunt',
    'racist', 'hate', 'discrimination',
  ];

  // 正则规则
  private readonly regexPatterns = [
    // 暴力威胁模式
    /我要[杀砍打弄]死[你他她它]/gi,
    /[杀砍打弄]死[你他她它]/gi,
    /[威胁恐吓][你他她它]/gi,
    
    // 侮辱性表达
    /[你他她它]是[个只]?[畜生畜牲狗猪垃圾废物]/gi,
    /[种族民族地域]歧视/gi,
  ];

  /**
   * 检测文本中的暴力仇恨风险
   */
  async detect(text: string): Promise<RiskFinding> {
    // 参数验证
    if (!text || typeof text !== 'string') {
      return {
        dimension: this.dimension,
        score: 0,
        confidence: 0.5,
        severity: 'low',
        matchedRules: [],
        evidence: [],
        reason: '输入文本为空或无效',
        suggestion: '请提供有效的输入文本',
      };
    }

    const matchedRules: string[] = [];
    const evidence: string[] = [];
    let maxScore = 0;

    // 1. 检测暴力关键词
    for (const keyword of this.violenceKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        matchedRules.push(`violence:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 90);
      }
    }

    // 2. 检测仇恨关键词
    for (const keyword of this.hateKeywords) {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        matchedRules.push(`hate:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 85);
      }
    }

    // 3. 检测正则模式
    for (const pattern of this.regexPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matchedRules.push(`pattern:${pattern.source}`);
        evidence.push(...matches);
        maxScore = Math.max(maxScore, 95);
      }
    }

    const score = this.calculateScore(matchedRules.length, maxScore);
    const severity = this.getSeverity(score);
    const { reason, suggestion } = this.generateReasonAndSuggestion(matchedRules, evidence);

    return {
      dimension: this.dimension,
      score,
      confidence: matchedRules.length > 0 ? 0.85 : 0.5,
      severity,
      matchedRules,
      evidence: [...new Set(evidence)],
      reason,
      suggestion,
    };
  }

  private calculateScore(matchCount: number, maxScore: number): number {
    if (matchCount === 0) return 10;
    const countBonus = Math.min(matchCount * 5, 15);
    return Math.min(maxScore + countBonus, 100);
  }

  private getSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  private generateReasonAndSuggestion(
    matchedRules: string[],
    evidence: string[]
  ): { reason: string; suggestion: string } {
    if (matchedRules.length === 0) {
      return {
        reason: '未检测到暴力仇恨言论风险',
        suggestion: '继续监控文本内容',
      };
    }

    const hasViolence = matchedRules.some(r => r.includes('violence:'));
    const hasHate = matchedRules.some(r => r.includes('hate:'));

    const reasons: string[] = [];
    if (hasViolence) reasons.push('检测到暴力威胁');
    if (hasHate) reasons.push('检测到仇恨言论');

    const reason = reasons.length > 0
      ? `暴力仇恨风险：${reasons.join('、')}`
      : '检测到可疑的暴力仇恨特征';

    return {
      reason,
      suggestion: '建议拒绝该请求，并记录用户行为',
    };
  }
}
