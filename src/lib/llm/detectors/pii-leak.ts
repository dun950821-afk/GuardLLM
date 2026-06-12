/**
 * PII 敏感信息泄露检测器
 * 
 * 检测内容：
 * 1. 手机号（正则 + 前后文判断）
 * 2. 身份证号（正则 + 校验位）
 * 3. 银行卡号（正则 + Luhn 校验）
 * 4. 邮箱地址
 * 5. IP 地址
 * 6. API Key / Token / Secret
 * 7. 内网地址
 * 8. 个人身份词组合
 */

import type { IRiskDetector, RiskFinding } from '../types';

interface PIIType {
  type: string;
  value: string;
  score: number;
  isValid: boolean;
}

export class PIILeakDetector implements IRiskDetector {
  readonly dimension = 'pii_leak';

  /**
   * 检测文本中的 PII 泄露风险
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
    const piiItems: PIIType[] = [];

    // 1. 检测手机号
    const phones = this.detectPhoneNumbers(text);
    piiItems.push(...phones);

    // 2. 检测身份证号
    const idCards = this.detectIDCards(text);
    piiItems.push(...idCards);

    // 3. 检测银行卡号
    const bankCards = this.detectBankCards(text);
    piiItems.push(...bankCards);

    // 4. 检测邮箱
    const emails = this.detectEmails(text);
    piiItems.push(...emails);

    // 5. 检测 IP 地址
    const ips = this.detectIPAddresses(text);
    piiItems.push(...ips);

    // 6. 检测 API Keys
    const apiKeys = this.detectAPIKeys(text);
    piiItems.push(...apiKeys);

    // 7. 检测内网地址
    const privateIPs = this.detectPrivateIPs(text);
    piiItems.push(...privateIPs);

    // 收集匹配规则和证据
    for (const item of piiItems) {
      matchedRules.push(`${item.type}:${item.isValid ? 'valid' : 'potential'}`);
      evidence.push(item.value);
    }

    // 计算风险分数
    const score = this.calculateScore(piiItems);
    const severity = this.getSeverity(score);
    const { reason, suggestion } = this.generateReasonAndSuggestion(piiItems);

    return {
      dimension: this.dimension,
      score,
      confidence: piiItems.length > 0 ? 0.9 : 0.6,
      severity,
      matchedRules,
      evidence: [...new Set(evidence)],
      reason,
      suggestion,
    };
  }

  /**
   * 检测手机号
   */
  private detectPhoneNumbers(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    // 中国大陆手机号正则
    const phoneRegex = /(?<!\d)(1[3-9]\d{9})(?!\d)/g;
    const matches = text.match(phoneRegex) || [];

    for (const match of matches) {
      // 验证手机号格式
      const isValid = /^1[3-9]\d{9}$/.test(match);
      
      results.push({
        type: 'phone_number',
        value: match,
        score: isValid ? 85 : 60,
        isValid,
      });
    }

    return results;
  }

  /**
   * 检测身份证号（含校验位）
   */
  private detectIDCards(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    // 身份证号正则（18位）
    const idCardRegex = /(?<!\d)(\d{17}[\dXx])(?!\d)/g;
    const matches = text.match(idCardRegex) || [];

    for (const match of matches) {
      const isValid = this.validateIDCard(match);
      
      results.push({
        type: 'id_card',
        value: match,
        score: isValid ? 95 : 70,
        isValid,
      });
    }

    return results;
  }

  /**
   * 验证身份证号校验位
   */
  private validateIDCard(idCard: string): boolean {
    if (idCard.length !== 18) {
      return false;
    }

    // 前17位
    const front17 = idCard.substring(0, 17);
    // 第18位
    const last = idCard.substring(17).toUpperCase();

    // 权重因子
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    // 校验码对应值
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

    // 计算校验和
    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(front17[i]) * weights[i];
    }

    // 计算校验码
    const checkCode = checkCodes[sum % 11];

    return last === checkCode;
  }

  /**
   * 检测银行卡号（含 Luhn 校验）
   */
  private detectBankCards(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    // 银行卡号正则（16-19位）
    const bankCardRegex = /(?<!\d)(\d{16,19})(?!\d)/g;
    const matches = text.match(bankCardRegex) || [];

    for (const match of matches) {
      const isValid = this.luhnCheck(match);
      
      results.push({
        type: 'bank_card',
        value: match,
        score: isValid ? 90 : 65,
        isValid,
      });
    }

    return results;
  }

  /**
   * Luhn 算法校验银行卡号
   */
  private luhnCheck(cardNumber: string): boolean {
    if (!/^\d+$/.test(cardNumber)) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    // 从右到左遍历
    for (let i = cardNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cardNumber[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * 检测邮箱地址
   */
  private detectEmails(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const matches = text.match(emailRegex) || [];

    for (const match of matches) {
      results.push({
        type: 'email',
        value: match,
        score: 75,
        isValid: true,
      });
    }

    return results;
  }

  /**
   * 检测 IP 地址
   */
  private detectIPAddresses(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    const ipRegex = /(?<!\d)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?!\d)/g;
    const matches = text.match(ipRegex) || [];

    for (const match of matches) {
      const isValid = this.validateIP(match);
      
      results.push({
        type: 'ip_address',
        value: match,
        score: isValid ? 70 : 50,
        isValid,
      });
    }

    return results;
  }

  /**
   * 验证 IP 地址格式
   */
  private validateIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      return false;
    }

    for (const part of parts) {
      const num = parseInt(part);
      if (isNaN(num) || num < 0 || num > 255) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检测 API Key / Token / Secret
   */
  private detectAPIKeys(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    // API Key 前缀模式
    const patterns = [
      /sk-[a-zA-Z0-9]{20,}/g,                    // OpenAI API Key
      /AKIA[A-Z0-9]{16}/g,                       // AWS Access Key
      /Bearer\s+[a-zA-Z0-9_-]{20,}/g,            // Bearer Token
      /token["\s:=]+[a-zA-Z0-9_-]{20,}/gi,       // Token
      /secret["\s:=]+[a-zA-Z0-9_-]{20,}/gi,      // Secret
      /access_key["\s:=]+[a-zA-Z0-9_-]{20,}/gi,  // Access Key
      /api_key["\s:=]+[a-zA-Z0-9_-]{20,}/gi,     // API Key
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        results.push({
          type: 'api_key',
          value: match,
          score: 95,
          isValid: true,
        });
      }
    }

    return results;
  }

  /**
   * 检测内网地址
   */
  private detectPrivateIPs(text: string): PIIType[] {
    const results: PIIType[] = [];
    
    // 内网 IP 段
    const privateRanges = [
      /(?<!\d)(10\.\d{1,3}\.\d{1,3}\.\d{1,3})(?!\d)/g,         // 10.0.0.0/8
      /(?<!\d)(172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3})(?!\d)/g, // 172.16.0.0/12
      /(?<!\d)(192\.168\.\d{1,3}\.\d{1,3})(?!\d)/g,            // 192.168.0.0/16
    ];

    for (const pattern of privateRanges) {
      const matches = text.match(pattern) || [];
      for (const match of matches) {
        results.push({
          type: 'private_ip',
          value: match,
          score: 80,
          isValid: true,
        });
      }
    }

    return results;
  }

  /**
   * 计算风险分数
   */
  private calculateScore(piiItems: PIIType[]): number {
    if (piiItems.length === 0) {
      return 5; // 基础风险分数
    }

    // 根据检测到的 PII 类型和有效性计算
    const validItems = piiItems.filter(item => item.isValid);
    const invalidItems = piiItems.filter(item => !item.isValid);

    // 有效 PII 项的最高分数
    const maxValidScore = validItems.length > 0
      ? Math.max(...validItems.map(item => item.score))
      : 0;

    // 无效 PII 项的最高分数
    const maxInvalidScore = invalidItems.length > 0
      ? Math.max(...invalidItems.map(item => item.score))
      : 0;

    // 数量加成
    const countBonus = Math.min(piiItems.length * 5, 15);

    return Math.min(Math.max(maxValidScore, maxInvalidScore) + countBonus, 100);
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
  private generateReasonAndSuggestion(piiItems: PIIType[]): {
    reason: string;
    suggestion: string;
  } {
    if (piiItems.length === 0) {
      return {
        reason: '未检测到敏感信息泄露风险',
        suggestion: '继续监控文本内容',
      };
    }

    const validItems = piiItems.filter(item => item.isValid);
    const invalidItems = piiItems.filter(item => !item.isValid);

    const reasons: string[] = [];

    if (validItems.length > 0) {
      const types = [...new Set(validItems.map(item => item.type))];
      reasons.push(`检测到有效的敏感信息：${types.join('、')}`);
    }

    if (invalidItems.length > 0) {
      const types = [...new Set(invalidItems.map(item => item.type))];
      reasons.push(`检测到可能的敏感信息：${types.join('、')}`);
    }

    const reason = reasons.join('；');

    const suggestion = validItems.length > 0
      ? '建议对敏感信息进行脱敏处理或拒绝该请求'
      : '建议进一步验证疑似敏感信息';

    return { reason, suggestion };
  }
}
