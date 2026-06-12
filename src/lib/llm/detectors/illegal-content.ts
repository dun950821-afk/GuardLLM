/**
 * 非法内容检测器
 * 
 * 检测内容：
 * 1. 违法交易
 * 2. 非法入侵
 * 3. 规避监管
 * 4. 赌博诈骗
 * 5. 黑灰产教程
 * 6. 违法工具制作
 * 7. 非法数据获取
 * 8. 其他违规请求
 */

import type { IRiskDetector, RiskFinding } from '../types';

export class IllegalContentDetector implements IRiskDetector {
  readonly dimension = 'illegal_content';

  // 违法交易关键词
  private readonly illegalTradeKeywords = [
    '毒品', '冰毒', '海洛因', '大麻', '可卡因', '摇头丸', 'K粉',
    '枪支', '枪械', '武器', '弹药', '炸药',
    '假币', '伪造', '变造',
    '走私', '贩卖', '交易', '买卖',
    '黑市', '暗网', '地下交易',
  ];

  // 非法入侵关键词
  private readonly illegalIntrusionKeywords = [
    '入侵', '渗透', '攻击', '黑客', '骇客',
    '破解', '破解版', '注册机', '序列号',
    '盗版', '侵权', '破解补丁',
    '钓鱼', '诈骗', '欺诈', '骗取',
    '洗钱', '套现', '跑分',
  ];

  // 赌博诈骗关键词
  private readonly gamblingFraudKeywords = [
    '赌博', '赌场', '赌钱', '博彩', '彩票',
    '六合彩', '私彩', '网络赌博',
    '诈骗', '骗局', '骗术', '套路',
    '传销', '庞氏', '资金盘', '返利',
    '刷单', '刷信誉', '刷钻',
  ];

  // 黑灰产关键词
  private readonly blackMarketKeywords = [
    '黑产', '灰产', '黑灰产',
    '肉鸡', '僵尸网络', 'DDoS',
    '撞库', '脱裤', '数据泄露',
    '社工库', '个人信息买卖',
    '账号买卖', '账号交易',
    '代开发票', '办证', '刻章',
  ];

  // 正则规则
  private readonly regexPatterns = [
    // 制作违禁品
    /制作[冰毒海洛因大麻枪支炸弹]/gi,
    /如何[制作获取购买][毒品枪支弹药]/gi,
    
    // 非法活动
    /如何[入侵破解攻击]/gi,
    /[洗钱套现跑分]方法/gi,
    /赌博[网站平台代理]/gi,
    
    // 黑灰产
    /社工库查询/gi,
    /个人信息[买卖交易]/gi,
    /账号[买卖交易租借]/gi,
  ];

  /**
   * 检测文本中的非法内容风险
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

    // 1. 检测违法交易关键词
    for (const keyword of this.illegalTradeKeywords) {
      if (text.includes(keyword)) {
        matchedRules.push(`trade:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 95);
      }
    }

    // 2. 检测非法入侵关键词
    for (const keyword of this.illegalIntrusionKeywords) {
      if (text.includes(keyword)) {
        matchedRules.push(`intrusion:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 85);
      }
    }

    // 3. 检测赌博诈骗关键词
    for (const keyword of this.gamblingFraudKeywords) {
      if (text.includes(keyword)) {
        matchedRules.push(`fraud:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 80);
      }
    }

    // 4. 检测黑灰产关键词
    for (const keyword of this.blackMarketKeywords) {
      if (text.includes(keyword)) {
        matchedRules.push(`blackmarket:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 90);
      }
    }

    // 5. 检测正则模式
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
      confidence: matchedRules.length > 0 ? 0.9 : 0.5,
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
        reason: '未检测到非法内容风险',
        suggestion: '继续监控文本内容',
      };
    }

    const hasIllegalTrade = matchedRules.some(r => r.includes('trade:'));
    const hasIntrusion = matchedRules.some(r => r.includes('intrusion:'));
    const hasFraud = matchedRules.some(r => r.includes('fraud:'));
    const hasBlackMarket = matchedRules.some(r => r.includes('blackmarket:'));

    const reasons: string[] = [];
    if (hasIllegalTrade) reasons.push('涉及违法交易');
    if (hasIntrusion) reasons.push('涉及非法入侵');
    if (hasFraud) reasons.push('涉及赌博诈骗');
    if (hasBlackMarket) reasons.push('涉及黑灰产');

    const reason = reasons.length > 0
      ? `非法内容风险：${reasons.join('、')}`
      : '检测到可疑的非法内容特征';

    return {
      reason,
      suggestion: '建议拒绝该请求，并记录用户行为',
    };
  }
}
