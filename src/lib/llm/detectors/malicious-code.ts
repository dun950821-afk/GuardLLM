/**
 * 恶意代码检测器
 * 
 * 检测内容：
 * 1. 远程命令执行
 * 2. 文件删除命令
 * 3. 反弹 Shell
 * 4. 木马生成
 * 5. 凭据窃取
 * 6. SQL 注入 Payload
 * 7. XSS Payload
 * 8. 命令注入
 * 9. 提权命令
 * 10. 恶意脚本
 */

import type { IRiskDetector, RiskFinding } from '../types';

export class MaliciousCodeDetector implements IRiskDetector {
  readonly dimension = 'malicious_code';

  // 危险命令关键词
  private readonly dangerousCommands = [
    'rm -rf',
    'rm -fr',
    'del /',
    'format',
    'fdisk',
    'dd if=',
    'curl | bash',
    'wget | bash',
    'curl | sh',
    'wget | sh',
    '/dev/null',
    'chmod 777',
    'chown root',
  ];

  // 危险函数
  private readonly dangerousFunctions = [
    'eval(',
    'exec(',
    'system(',
    'shell_exec(',
    'passthru(',
    'popen(',
    'proc_open(',
    'pcntl_exec(',
    'subprocess.',
    'os.system(',
    'os.popen(',
    'subprocess.Popen(',
    '__import__(',
    'compile(',
    'execfile(',
  ];

  // 正则规则
  private readonly regexPatterns = [
    // SQL 注入
    /('|")\s*(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
    /union\s+(all\s+)?select/gi,
    /;\s*drop\s+table/gi,
    /;\s*delete\s+from/gi,
    /;\s*truncate\s+table/gi,
    
    // XSS
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+onerror\s*=/gi,
    /<svg[^>]+onload\s*=/gi,
    
    // 命令注入
    /[;&|`]\s*(rm|del|format|fdisk|shutdown|reboot)/gi,
    /\$\([^)]+\)/g,  // $(command)
    /`[^`]+`/g,       // `command`
    
    // 反弹 Shell
    /nc\s+-[elp]/gi,
    /bash\s+-[ci]/gi,
    /python\s+-c\s+['"]import\s+socket/gi,
    /perl\s+-e\s+['"]use\s+Socket/gi,
  ];

  /**
   * 检测文本中的恶意代码风险
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

    // 1. 检测危险命令
    for (const cmd of this.dangerousCommands) {
      if (text.toLowerCase().includes(cmd.toLowerCase())) {
        matchedRules.push(`command:${cmd}`);
        evidence.push(cmd);
        maxScore = Math.max(maxScore, 90);
      }
    }

    // 2. 检测危险函数
    for (const func of this.dangerousFunctions) {
      if (text.includes(func)) {
        matchedRules.push(`function:${func}`);
        evidence.push(func);
        maxScore = Math.max(maxScore, 95);
      }
    }

    // 3. 检测正则模式
    for (const pattern of this.regexPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        matchedRules.push(`pattern:${pattern.source}`);
        evidence.push(...matches);
        maxScore = Math.max(maxScore, 85);
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
        reason: '未检测到恶意代码风险',
        suggestion: '继续监控代码内容',
      };
    }

    const hasDangerousCmd = matchedRules.some(r => r.includes('command:'));
    const hasDangerousFunc = matchedRules.some(r => r.includes('function:'));
    const hasInjection = matchedRules.some(r => 
      r.includes('SQL') || r.includes('XSS') || r.includes('injection')
    );

    const reasons: string[] = [];
    if (hasDangerousCmd) reasons.push('检测到危险命令');
    if (hasDangerousFunc) reasons.push('检测到危险函数调用');
    if (hasInjection) reasons.push('检测到注入攻击特征');

    const reason = reasons.length > 0
      ? `恶意代码风险：${reasons.join('、')}`
      : '检测到可疑的恶意代码特征';

    return {
      reason,
      suggestion: '建议拒绝该请求，并记录用户行为',
    };
  }
}
