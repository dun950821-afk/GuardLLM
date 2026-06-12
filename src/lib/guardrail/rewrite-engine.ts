/**
 * 安全改写引擎
 * 对危险内容进行安全改写，提供安全建议替代危险内容
 */

export interface RewriteResult {
  /** 改写后的文本 */
  rewrittenText: string
  /** 改写类型 */
  rewriteType: 'dangerous_code' | 'violence' | 'illegal' | 'injection' | 'pii' | 'general'
  /** 改写原因 */
  reason: string
  /** 是否进行了改写 */
  hasRewritten: boolean
  /** 改写建议 */
  suggestions: string[]
}

/**
 * 危险代码改写规则
 */
const dangerousCodeRewrites: Array<{
  patterns: RegExp[]
  replacement: string
  reason: string
}> = [
  {
    patterns: [
      /rm\s+-rf\s+\//gi,
      /rm\s+-rf\s+~/gi,
      /del\s+\/s\s+\/q/gi
    ],
    replacement: '⚠️ [文件删除命令已被安全拦截，请使用安全的文件操作方法]',
    reason: '危险文件删除命令'
  },
  {
    patterns: [
      /eval\s*\(/gi,
      /exec\s*\(/gi,
      /system\s*\(/gi
    ],
    replacement: '⚠️ [动态代码执行已被安全拦截，请使用安全的替代方法]',
    reason: '危险代码执行命令'
  },
  {
    patterns: [
      /sudo\s+chmod\s+777/gi,
      /chmod\s+777/gi
    ],
    replacement: '⚠️ [危险权限设置已被安全拦截，建议使用最小权限原则]',
    reason: '危险权限设置'
  },
  {
    patterns: [
      /curl\s+.*\|\s*bash/gi,
      /wget\s+.*\|\s*sh/gi
    ],
    replacement: '⚠️ [远程脚本执行已被安全拦截，请验证脚本来源后手动执行]',
    reason: '远程脚本执行风险'
  },
  {
    patterns: [
      /DROP\s+TABLE/gi,
      /DROP\s+DATABASE/gi,
      /TRUNCATE\s+TABLE/gi
    ],
    replacement: '⚠️ [危险数据库操作已被安全拦截，请使用备份和测试环境]',
    reason: '危险数据库操作'
  }
]

/**
 * 暴力仇恨内容改写规则
 */
const violenceRewrites: Array<{
  patterns: RegExp[]
  replacement: string
  reason: string
}> = [
  {
    patterns: [
      /如何.*杀人/gi,
      /怎么.*杀人/gi,
      /杀人.*方法/gi
    ],
    replacement: '⚠️ [暴力内容已被安全拦截，我们倡导和平与尊重生命]',
    reason: '暴力威胁内容'
  },
  {
    patterns: [
      /制作.*炸弹/gi,
      /如何.*爆炸/gi,
      /炸弹.*制作/gi
    ],
    replacement: '⚠️ [危险物品制作已被安全拦截，此类内容违反安全规范]',
    reason: '危险物品制作'
  }
]

/**
 * 非法内容改写规则
 */
const illegalRewrites: Array<{
  patterns: RegExp[]
  replacement: string
  reason: string
}> = [
  {
    patterns: [
      /如何.*毒品/gi,
      /制作.*毒品/gi,
      /毒品.*方法/gi
    ],
    replacement: '⚠️ [违法内容已被安全拦截，毒品严重危害个人和社会健康]',
    reason: '涉毒违法内容'
  },
  {
    patterns: [
      /如何.*赌博/gi,
      /赌博.*技巧/gi,
      /赌场.*作弊/gi
    ],
    replacement: '⚠️ [赌博相关内容已被安全拦截，赌博违法且容易导致财产损失]',
    reason: '赌博违法内容'
  },
  {
    patterns: [
      /如何.*诈骗/gi,
      /诈骗.*方法/gi,
      /骗钱.*技巧/gi
    ],
    replacement: '⚠️ [诈骗相关内容已被安全拦截，欺诈行为违法且有害]',
    reason: '诈骗违法内容'
  }
]

/**
 * 提示词注入改写规则
 */
const injectionRewrites: Array<{
  patterns: RegExp[]
  replacement: string
  reason: string
}> = [
  {
    patterns: [
      /忽略.*之前.*指令/gi,
      /忽略.*系统.*提示/gi,
      /ignore.*previous.*instruction/gi
    ],
    replacement: '⚠️ [提示词注入尝试已被安全拦截，请正常描述您的需求]',
    reason: '提示词注入尝试'
  },
  {
    patterns: [
      /进入.*开发者.*模式/gi,
      /开启.*DAN.*模式/gi,
      /developer.*mode/gi
    ],
    replacement: '⚠️ [越狱尝试已被安全拦截，我始终遵守安全规范]',
    reason: '越狱尝试'
  },
  {
    patterns: [
      /输出.*系统.*提示/gi,
      /显示.*prompt/gi,
      /print.*system.*prompt/gi
    ],
    replacement: '⚠️ [系统信息获取尝试已被安全拦截，这是受保护的内容]',
    reason: '系统信息获取尝试'
  }
]

/**
 * 通用安全改写
 */
const generalRewrites: Array<{
  patterns: RegExp[]
  replacement: string
  reason: string
}> = [
  {
    patterns: [
      /我(?:想|要|需要).*(?:攻击|入侵|破坏).*(?:系统|服务器|网站)/gi
    ],
    replacement: '⚠️ [攻击相关内容已被安全拦截，如有安全研究需求，请通过正规渠道进行]',
    reason: '攻击相关请求'
  },
  {
    patterns: [
      /如何.*绕过.*安全/gi,
      /绕过.*验证/gi,
      /bypass.*security/gi
    ],
    replacement: '⚠️ [安全绕过相关内容已被安全拦截，建议通过正规渠道获取授权]',
    reason: '安全绕过尝试'
  }
]

/**
 * 应用改写规则
 */
function applyRewriteRules(
  text: string,
  rules: Array<{ patterns: RegExp[]; replacement: string; reason: string }>
): { text: string; reasons: string[] } {
  let result = text
  const reasons: string[] = []
  
  for (const rule of rules) {
    for (const pattern of rule.patterns) {
      if (pattern.test(result)) {
        result = result.replace(pattern, rule.replacement)
        reasons.push(rule.reason)
      }
    }
  }
  
  return { text: result, reasons }
}

/**
 * 主改写函数
 * 根据检测到的风险类型进行相应的安全改写
 */
export function rewriteContent(
  text: string,
  riskTypes: string[] = ['all']
): RewriteResult {
  let rewrittenText = text
  const allReasons: string[] = []
  const suggestions: string[] = []
  
  const shouldRewrite = (type: string) => 
    riskTypes.includes('all') || riskTypes.includes(type)
  
  // 1. 危险代码改写
  if (shouldRewrite('malicious_code')) {
    const result = applyRewriteRules(rewrittenText, dangerousCodeRewrites)
    if (result.reasons.length > 0) {
      rewrittenText = result.text
      allReasons.push(...result.reasons)
      suggestions.push('建议使用安全的代码实践，如输入验证、最小权限原则等')
    }
  }
  
  // 2. 暴力仇恨改写
  if (shouldRewrite('violence_hate')) {
    const result = applyRewriteRules(rewrittenText, violenceRewrites)
    if (result.reasons.length > 0) {
      rewrittenText = result.text
      allReasons.push(...result.reasons)
      suggestions.push('我们倡导和平、尊重与理解，请用积极的方式表达观点')
    }
  }
  
  // 3. 非法内容改写
  if (shouldRewrite('illegal_content')) {
    const result = applyRewriteRules(rewrittenText, illegalRewrites)
    if (result.reasons.length > 0) {
      rewrittenText = result.text
      allReasons.push(...result.reasons)
      suggestions.push('请遵守法律法规，如有疑问请咨询专业人士')
    }
  }
  
  // 4. 提示词注入改写
  if (shouldRewrite('prompt_injection')) {
    const result = applyRewriteRules(rewrittenText, injectionRewrites)
    if (result.reasons.length > 0) {
      rewrittenText = result.text
      allReasons.push(...result.reasons)
      suggestions.push('请直接描述您的真实需求，我会尽力帮助您')
    }
  }
  
  // 5. 通用改写
  if (shouldRewrite('general')) {
    const result = applyRewriteRules(rewrittenText, generalRewrites)
    if (result.reasons.length > 0) {
      rewrittenText = result.text
      allReasons.push(...result.reasons)
      suggestions.push('如有合法需求，请提供更多背景信息以便我更好地帮助您')
    }
  }
  
  // 确定主要改写类型
  let rewriteType: RewriteResult['rewriteType'] = 'general'
  if (allReasons.length > 0) {
    if (allReasons.some(r => r.includes('代码') || r.includes('执行'))) {
      rewriteType = 'dangerous_code'
    } else if (allReasons.some(r => r.includes('暴力'))) {
      rewriteType = 'violence'
    } else if (allReasons.some(r => r.includes('违法') || r.includes('毒品') || r.includes('赌博'))) {
      rewriteType = 'illegal'
    } else if (allReasons.some(r => r.includes('注入') || r.includes('越狱'))) {
      rewriteType = 'injection'
    }
  }
  
  return {
    rewrittenText,
    rewriteType,
    reason: allReasons.length > 0 ? allReasons.join('；') : '无需改写',
    hasRewritten: allReasons.length > 0,
    suggestions: [...new Set(suggestions)] // 去重
  }
}

/**
 * 生成安全建议回复
 * 用于替代危险内容回复
 */
export function generateSafeResponse(
  originalIntent: string,
  riskType: string
): string {
  const safeResponses: Record<string, string> = {
    malicious_code: `我理解您可能在探索技术知识。关于"${originalIntent}"，我建议：

1. 在合法的测试环境中进行安全研究
2. 学习网络安全防护知识，而非攻击技术
3. 参考 OWASP 等权威安全组织的最佳实践

如果您需要安全防护建议或想了解如何保护系统，我很乐意提供帮助。`,
    
    violence_hate: `我注意到您的请求可能涉及不适当的内容。我无法提供此类信息。

如果您遇到困难或需要帮助，请考虑：
1. 寻求专业心理咨询
2. 与信任的朋友或家人交流
3. 联系相关支持机构

让我们一起创造一个更友善的环境。`,
    
    illegal_content: `我无法协助处理可能涉及违法的请求。

如果您有合法需求，例如：
- 了解相关法律法规
- 获取合法渠道信息
- 咨询专业意见

我可以帮您找到正确的资源。`,
    
    prompt_injection: `我注意到您可能在尝试一些特殊操作。

请直接告诉我您的真实需求是什么？我会尽力以安全、负责任的方式帮助您。

例如：
- 如果您想了解我的能力，可以问我"你能做什么"
- 如果您有具体问题，直接描述即可
- 如果您想测试安全机制，请联系管理员`,
    
    pii: `我注意到您的信息中包含敏感内容。

为保护您的隐私安全，我已经对敏感信息进行了脱敏处理。请不要在公开场合分享：
- 个人身份信息（身份证、护照等）
- 金融信息（银行卡、账户等）
- 登录凭证（密码、API密钥等）

如有疑问，请联系管理员。`,
    
    general: `我理解您的请求，但出于安全考虑，我无法直接提供相关内容。

如果您有其他问题或需要帮助，请告诉我具体需求，我会尽力协助。`
  }
  
  return safeResponses[riskType] || safeResponses.general
}

/**
 * 判断内容是否需要改写
 */
export function needsRewrite(text: string): boolean {
  const result = rewriteContent(text)
  return result.hasRewritten
}

/**
 * 获取改写建议
 */
export function getRewriteSuggestions(text: string): string[] {
  const result = rewriteContent(text)
  return result.suggestions
}
