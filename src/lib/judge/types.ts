/**
 * 裁判模型类型定义
 */

// 决策模式
export type JudgeMode = 'conservative' | 'balanced' | 'review_only';

// 触发模式
export type TriggerMode = 'risk_only' | 'risk_or_semantic' | 'always';

// 失败回退动作
export type FallbackAction = 'rule' | 'allow' | 'block';

// 裁判模型配置
export interface PolicyJudgeConfig {
  id: string;
  policyId: string;

  // 基础配置
  enabled: boolean;
  providerId?: string;
  mode: JudgeMode;
  triggerMode: TriggerMode;

  // 触发条件
  triggerThreshold: number;      // 规则分数达到此值触发 (0-100)
  judgeThreshold: number;        // 裁判判断阈值 (0-100)
  weight: number;                // 平衡模式权重 (0-1)

  // 适用范围
  applyToInput: boolean;
  applyToOutput: boolean;
  enabledDimensions: string[];   // 适用的维度 code 列表，空为全部
  semanticDimensions: string[];  // 需要语义增强的维度

  // 超时与失败处理
  timeoutMs: number;
  fallbackAction: FallbackAction;
  failClosedForHighRisk: boolean;

  // 数据保护
  maxTextLength: number;
  maskPiiBeforeJudge: boolean;
  blockExternalForSecrets: boolean;

  createdAt?: string;
  updatedAt?: string;
}

// 裁判模型维度结果
export interface JudgeDimensionResult {
  dimensionCode: string;
  dimensionName: string;
  hasRisk: boolean;
  score: number;
  confidence: number;
  reason: string;
}

// 规则复核结果
export interface RuleReview {
  agreeWithRules: boolean;
  falsePositiveSuspected: boolean;
  falseNegativeSuspected: boolean;
  explanation: string;
}

// 裁判模型结果
export interface JudgeModelResult {
  // 调用状态
  used: boolean;
  invocationId?: string;

  // 结果
  hasRisk?: boolean;
  score?: number;
  confidence?: number;
  suggestedAction?: 'allow' | 'warn' | 'block';
  reason?: string;

  // 维度结果
  dimensionResults?: JudgeDimensionResult[];

  // 规则复核
  ruleReview?: RuleReview;

  // 性能指标
  latencyMs?: number;
  tokensUsed?: number;

  // 错误信息
  error?: string;
  parseError?: string;
  fallbackUsed?: boolean;
}

// 决策过程追踪
export interface DecisionTrace {
  ruleScore: number;
  ruleAction: 'allow' | 'warn' | 'block';
  judgeScore?: number;
  judgeAction?: 'allow' | 'warn' | 'block';
  decisionMode: JudgeMode;
  finalScore: number;
  finalAction: 'allow' | 'warn' | 'block';
  reasoning: string;
}

// 裁判模型调用记录
export interface JudgeModelInvocation {
  id: string;

  // 关联信息
  sessionId?: string;
  policyId?: string;
  providerId?: string;

  // 输入信息
  direction?: 'input' | 'output';
  modelName?: string;
  promptVersion?: string;
  inputHash?: string;
  textLength?: number;

  // 规则检测结果
  ruleScore?: number;
  ruleAction?: 'allow' | 'warn' | 'block';
  ruleFindings?: Array<{
    dimension: string;
    dimensionName: string;
    score: number;
    action: string;
    reason: string;
  }>;

  // 裁判模型结果
  judgeScore?: number;
  judgeConfidence?: number;
  judgeAction?: 'allow' | 'warn' | 'block';
  judgeReason?: string;
  judgeDimensions?: JudgeDimensionResult[];
  ruleReview?: RuleReview;

  // 原始响应
  rawResponse?: unknown;
  parseError?: string;
  errorMessage?: string;

  // 性能指标
  latencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;

  // 决策影响
  usedInDecision: boolean;
  decisionMode?: JudgeMode;
  finalScore?: number;
  finalAction?: 'allow' | 'warn' | 'block';

  createdAt?: string;
}

// LLM Judge 响应格式
export interface LLMJudgeResponse {
  hasRisk: boolean;
  score: number;
  confidence: number;
  suggestedAction: 'allow' | 'warn' | 'block';
  reason: string;
  dimensionResults: JudgeDimensionResult[];
  ruleReview: RuleReview;
}

// 模式说明（用于前端展示）
export const JUDGE_MODE_DESCRIPTIONS: Record<JudgeMode, { name: string; description: string; recommended?: boolean }> = {
  conservative: {
    name: '保守模式',
    description: '取规则检测和裁判模型的更高风险结果。适合金融、合规等高安全场景。',
    recommended: true,
  },
  balanced: {
    name: '平衡模式',
    description: '规则检测和裁判模型结果加权融合。可根据权重调整两者影响力。',
  },
  review_only: {
    name: '复核模式',
    description: '裁判模型只提供建议，不改变最终动作。适合需要人工审核的场景。',
  },
};

// 触发模式说明
export const TRIGGER_MODE_DESCRIPTIONS: Record<TriggerMode, { name: string; description: string; recommended?: boolean }> = {
  risk_only: {
    name: '仅风险触发',
    description: '只有当规则检测分数达到阈值时才调用裁判模型。',
  },
  risk_or_semantic: {
    name: '风险或语义触发',
    description: '规则检测分数达到阈值，或满足语义检测条件（如长文本、复杂意图）时调用。',
    recommended: true,
  },
  always: {
    name: '始终触发',
    description: '每次检测都调用裁判模型。成本较高，适合高安全要求场景。',
  },
};

// 失败回退说明
export const FALLBACK_ACTION_DESCRIPTIONS: Record<FallbackAction, { name: string; description: string }> = {
  rule: {
    name: '使用规则结果',
    description: '裁判模型失败时，使用规则检测结果作为最终结果。',
  },
  allow: {
    name: '放行',
    description: '裁判模型失败时放行内容。风险较高，慎用。',
  },
  block: {
    name: '拦截',
    description: '裁判模型失败时拦截内容。适合高安全场景（fail-closed）。',
  },
};