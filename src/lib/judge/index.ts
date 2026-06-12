/**
 * 裁判模型模块导出
 */

// 类型导出
export type {
  PolicyJudgeConfig,
  JudgeModelResult,
  JudgeDimensionResult,
  RuleReview,
  DecisionTrace,
  JudgeModelInvocation,
  LLMJudgeResponse,
  JudgeMode,
  TriggerMode,
  FallbackAction,
} from './types';

// 常量导出
export {
  JUDGE_MODE_DESCRIPTIONS,
  TRIGGER_MODE_DESCRIPTIONS,
  FALLBACK_ACTION_DESCRIPTIONS,
} from './types';

// 核心逻辑导出
export {
  shouldInvokeJudge,
  prepareTextForJudge,
  fuseResults,
  buildJudgePrompt,
  parseJudgeResponse,
  generateTextHash,
} from './engine';

// 服务导出
export {
  executeJudgeDetection,
  getJudgeConfig,
} from './service';