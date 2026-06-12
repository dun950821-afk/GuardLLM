/**
 * 提示词注入检测器
 * 
 * 检测用户是否试图：
 * 1. 忽略系统提示词或之前的指令
 * 2. 开启开发者模式或特殊模式
 * 3. 扮演无限制的模型角色
 * 4. 绕过安全策略
 * 5. 获取系统内部信息
 */

import type { IRiskDetector, RiskFinding } from '../types';

export class PromptInjectionDetector implements IRiskDetector {
  readonly dimension = 'prompt_injection';

  // 关键词规则（中文）
  private readonly chineseKeywords = [
    // 忽略指令类
    '忽略之前',
    '忽略所有',
    '忽略上述',
    '忽略前文',
    '忘记之前',
    '忘记所有',
    '忘记上述',
    '不要遵循',
    '不用遵循',
    '不用遵守',
    '不必遵循',
    '不必遵守',
    
    // 系统提示词类
    '系统提示词',
    '系统提示',
    '你的指令',
    '你的规则',
    '你的约束',
    '输出你的提示词',
    '显示你的提示词',
    '打印你的提示词',
    
    // 开发者模式类
    '开发者模式',
    'debug模式',
    '调试模式',
    'root模式',
    '管理员模式',
    'God Mode',
    'god mode',
    
    // 角色扮演类
    '没有限制',
    '无限制',
    '不受限制',
    '不受约束',
    '没有任何限制',
    '没有任何约束',
    '可以做任何事',
    '可以说任何话',
    'DAN',
    'dan',
    
    // 绕过安全类
    '绕过安全',
    '绕过限制',
    '绕过约束',
    '绕过过滤',
    '绕过审核',
    '绕过检测',
    '逃避安全',
    '逃避限制',
    '逃避约束',
    
    // 特殊指令类
    'sudo',
    'admin',
    'administrator',
    'root',
    'superuser',
  ];

  // 关键词规则（英文）
  private readonly englishKeywords = [
    'ignore previous',
    'ignore all',
    'ignore above',
    'ignore the above',
    'forget previous',
    'forget all',
    'forget above',
    'disregard previous',
    'disregard all',
    'disregard above',
    
    'system prompt',
    'your instructions',
    'your rules',
    'your constraints',
    'print your prompt',
    'show your prompt',
    'display your prompt',
    'output your prompt',
    
    'developer mode',
    'debug mode',
    'root mode',
    'admin mode',
    'god mode',
    
    'no limits',
    'no restrictions',
    'unlimited',
    'unrestricted',
    'without limits',
    'without restrictions',
    'can do anything',
    'can say anything',
    
    'bypass security',
    'bypass limits',
    'bypass restrictions',
    'bypass filters',
    'bypass moderation',
    'bypass detection',
    'evade security',
    'evade limits',
    'evade restrictions',
    
    'sudo',
    'admin',
    'administrator',
    'root',
    'superuser',
  ];

  // 正则规则
  private readonly regexPatterns = [
    // 忽略指令模式
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/gi,
    /forget\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/gi,
    /disregard\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/gi,
    
    // 角色扮演模式
    /you\s+are\s+(now\s+)?(a\s+)?(unrestricted|unlimited|uncensored|free)\s+(AI|ai|model|assistant)/gi,
    /act\s+as\s+(if\s+)?(you\s+are\s+)?(a\s+)?(unrestricted|unlimited|uncensored|free)/gi,
    /pretend\s+(to\s+be\s+)?(a\s+)?(unrestricted|unlimited|uncensored|free)/gi,
    /role[\s-]?play\s+as\s+(a\s+)?(unrestricted|unlimited|uncensored|free)/gi,
    
    // DAN 模式
    /\bDAN\b/gi,
    /do\s+anything\s+now/gi,
    
    // 开发者模式
    /enable\s+(developer|debug|root|admin)\s+mode/gi,
    /enter\s+(developer|debug|root|admin)\s+mode/gi,
    /activate\s+(developer|debug|root|admin)\s+mode/gi,
    
    // 输出系统信息
    /output\s+(your\s+)?(system\s+)?prompt/gi,
    /print\s+(your\s+)?(system\s+)?prompt/gi,
    /show\s+(your\s+)?(system\s+)?prompt/gi,
    /display\s+(your\s+)?(system\s+)?prompt/gi,
    /reveal\s+(your\s+)?(system\s+)?prompt/gi,
    
    // 绕过安全
    /bypass\s+(all\s+)?(security|safety|filters?|moderation)/gi,
    /disable\s+(all\s+)?(security|safety|filters?|moderation)/gi,
    /turn\s+off\s+(all\s+)?(security|safety|filters?|moderation)/gi,
  ];

  /**
   * 检测文本中的提示词注入风险
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

    // 1. 检测中文关键词
    for (const keyword of this.chineseKeywords) {
      if (text.includes(keyword)) {
        matchedRules.push(`keyword_cn:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 80);
      }
    }

    // 2. 检测英文关键词
    const lowerText = text.toLowerCase();
    for (const keyword of this.englishKeywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchedRules.push(`keyword_en:${keyword}`);
        evidence.push(keyword);
        maxScore = Math.max(maxScore, 80);
      }
    }

    // 3. 检测正则模式
    for (const pattern of this.regexPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matchedRules.push(`pattern:${pattern.source}`);
        evidence.push(...matches);
        maxScore = Math.max(maxScore, 90);
      }
    }

    // 4. 计算综合风险分数
    const score = this.calculateScore(matchedRules.length, maxScore);
    
    // 5. 确定严重程度
    const severity = this.getSeverity(score);
    
    // 6. 生成原因和建议
    const { reason, suggestion } = this.generateReasonAndSuggestion(matchedRules, evidence);

    return {
      dimension: this.dimension,
      score,
      confidence: matchedRules.length > 0 ? 0.85 : 0.5,
      severity,
      matchedRules,
      evidence: [...new Set(evidence)], // 去重
      reason,
      suggestion,
    };
  }

  /**
   * 计算风险分数
   */
  private calculateScore(matchCount: number, maxScore: number): number {
    if (matchCount === 0) {
      return 10; // 基础风险分数
    }

    // 根据匹配数量和最高分数计算
    const countBonus = Math.min(matchCount * 5, 20);
    return Math.min(maxScore + countBonus, 100);
  }

  /**
   * 确定严重程度
   */
  private getSeverity(score: number): 'critical' | 'high' | 'medium' | 'low' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * 生成原因和建议
   */
  private generateReasonAndSuggestion(
    matchedRules: string[],
    evidence: string[]
  ): { reason: string; suggestion: string } {
    if (matchedRules.length === 0) {
      return {
        reason: '未检测到明显的提示词注入风险',
        suggestion: '继续监控用户输入',
      };
    }

    const hasIgnoreInstructions = matchedRules.some(r => 
      r.includes('ignore') || r.includes('忘记') || r.includes('忽略')
    );
    const hasDeveloperMode = matchedRules.some(r => 
      r.includes('developer') || r.includes('debug') || r.includes('root') || r.includes('admin')
    );
    const hasRolePlay = matchedRules.some(r => 
      r.includes('role') || r.includes('act') || r.includes('pretend') || r.includes('DAN')
    );
    const hasSystemPrompt = matchedRules.some(r => 
      r.includes('system') && r.includes('prompt')
    );

    let reason = '检测到提示词注入风险：';
    const reasons: string[] = [];

    if (hasIgnoreInstructions) {
      reasons.push('试图忽略系统指令');
    }
    if (hasDeveloperMode) {
      reasons.push('试图开启开发者模式');
    }
    if (hasRolePlay) {
      reasons.push('试图进行角色扮演绕过');
    }
    if (hasSystemPrompt) {
      reasons.push('试图获取系统提示词');
    }

    if (reasons.length === 0) {
      reasons.push('检测到可疑的提示词注入行为');
    }

    reason += reasons.join('、');

    const suggestion = '建议拒绝该请求，并向用户说明安全策略限制';

    return { reason, suggestion };
  }
}
