/**
 * 裁判模型服务
 * 负责调用LLM进行语义检测
 */

import { db } from '@/lib/db';
import { llmProviders, judgeModelInvocations } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';
import type { DetectionFinding } from '@/lib/detection/types';
import type {
  PolicyJudgeConfig,
  JudgeModelResult,
  LLMJudgeResponse,
} from './types';
import {
  buildJudgePrompt,
  parseJudgeResponse,
  prepareTextForJudge,
  generateTextHash,
} from './engine';

/**
 * 获取Provider的聊天功能
 */
async function getProviderChat(providerId: string): Promise<{
  name: string;
  chat: (request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }) => Promise<{ content: string; latencyMs: number }>;
  defaultModel: string;
  isPrivate: boolean;
} | null> {
  try {
    const providers = await db
      .select()
      .from(llmProviders)
      .where(eq(llmProviders.id, providerId))
      .limit(1);

    if (providers.length === 0) return null;

    const provider = providers[0];

    // 判断是否为私有/本地模型
    const isPrivate = provider.providerType === 'ollama' ||
                      provider.baseUrl?.includes('localhost') ||
                      provider.baseUrl?.includes('127.0.0.1') ||
                      provider.baseUrl?.includes('internal');

    // 简化的聊天函数实现
    const chat = async (request: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature?: number;
      maxTokens?: number;
    }) => {
      const startTime = Date.now();

      // 根据provider类型构建请求
      const baseUrl = provider.baseUrl || '';
      const apiKey = provider.apiKeyEncrypted; // 实际应该解密

      // 调用LLM API
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: request.model || provider.defaultModel,
          messages: request.messages,
          temperature: request.temperature ?? 0.1,
          max_tokens: request.maxTokens ?? 1024,
        }),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        latencyMs: Date.now() - startTime,
      };
    };

    return {
      name: provider.name,
      chat,
      defaultModel: provider.defaultModel || '',
      isPrivate: isPrivate ?? false,
    };
  } catch (error) {
    console.error('获取Provider失败:', error);
    return null;
  }
}

/**
 * 执行裁判模型检测
 */
export async function executeJudgeDetection(
  text: string,
  direction: 'input' | 'output',
  ruleFindings: DetectionFinding[],
  ruleScore: number,
  config: PolicyJudgeConfig,
  sessionId?: string
): Promise<JudgeModelResult> {
  const startTime = Date.now();

  // 检查是否配置了Provider
  if (!config.providerId) {
    return {
      used: false,
      error: '未配置裁判模型Provider',
    };
  }

  // 获取Provider
  const provider = await getProviderChat(config.providerId);
  if (!provider) {
    return {
      used: false,
      error: '裁判模型Provider不可用',
    };
  }

  // 准备发送给裁判模型的文本（处理PII和密钥）
  const { processedText, maskedItems, blockedExternal } = prepareTextForJudge(
    text,
    ruleFindings,
    config,
    provider.isPrivate
  );

  // 构建Prompt
  const { systemPrompt, userPrompt } = buildJudgePrompt(
    processedText,
    direction,
    ruleFindings,
    ruleScore
  );

  try {
    // 调用LLM
    const response = await provider.chat({
      model: provider.defaultModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 1024,
    });

    // 解析响应
    const parsed = parseJudgeResponse(response.content);

    if (!parsed) {
      // 记录调用失败
      await recordInvocation({
        sessionId,
        policyId: config.policyId,
        providerId: config.providerId,
        direction,
        modelName: provider.defaultModel,
        textLength: text.length,
        ruleScore,
        ruleAction: getActionFromScore(ruleScore, config.judgeThreshold),
        ruleFindings,
        rawResponse: response.content,
        parseError: '无法解析LLM响应',
        latencyMs: response.latencyMs,
      });

      return {
        used: true,
        error: '无法解析裁判模型响应',
        parseError: 'JSON解析失败',
        latencyMs: response.latencyMs,
        fallbackUsed: true,
      };
    }

    const latencyMs = Date.now() - startTime;

    // 记录调用成功
    const invocationId = await recordInvocation({
      sessionId,
      policyId: config.policyId,
      providerId: config.providerId,
      direction,
      modelName: provider.defaultModel,
      textLength: text.length,
      ruleScore,
      ruleAction: getActionFromScore(ruleScore, config.judgeThreshold),
      ruleFindings,
      judgeScore: parsed.score,
      judgeConfidence: parsed.confidence,
      judgeAction: parsed.suggestedAction,
      judgeReason: parsed.reason,
      judgeDimensions: parsed.dimensionResults,
      ruleReview: parsed.ruleReview,
      latencyMs,
    });

    return {
      used: true,
      invocationId,
      hasRisk: parsed.hasRisk,
      score: parsed.score,
      confidence: parsed.confidence,
      suggestedAction: parsed.suggestedAction,
      reason: parsed.reason,
      dimensionResults: parsed.dimensionResults,
      ruleReview: parsed.ruleReview,
      latencyMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    // 记录调用失败
    await recordInvocation({
      sessionId,
      policyId: config.policyId,
      providerId: config.providerId,
      direction,
      modelName: provider.defaultModel,
      textLength: text.length,
      ruleScore,
      ruleAction: getActionFromScore(ruleScore, config.judgeThreshold),
      ruleFindings,
      errorMessage,
      latencyMs: Date.now() - startTime,
    });

    return {
      used: true,
      error: errorMessage,
      latencyMs: Date.now() - startTime,
      fallbackUsed: true,
    };
  }
}

/**
 * 根据分数获取动作
 */
function getActionFromScore(
  score: number,
  threshold: number
): 'allow' | 'warn' | 'block' {
  if (score >= 80) return 'block';
  if (score >= threshold) return 'warn';
  return 'allow';
}

/**
 * 记录裁判模型调用
 */
async function recordInvocation(params: {
  sessionId?: string;
  policyId: string;
  providerId: string;
  direction: 'input' | 'output';
  modelName: string;
  textLength: number;
  ruleScore: number;
  ruleAction: 'allow' | 'warn' | 'block';
  ruleFindings: DetectionFinding[];
  judgeScore?: number;
  judgeConfidence?: number;
  judgeAction?: 'allow' | 'warn' | 'block';
  judgeReason?: string;
  judgeDimensions?: LLMJudgeResponse['dimensionResults'];
  ruleReview?: LLMJudgeResponse['ruleReview'];
  rawResponse?: string;
  parseError?: string;
  errorMessage?: string;
  latencyMs: number;
}): Promise<string> {
  try {
    const [inserted] = await db
      .insert(judgeModelInvocations)
      .values({
        sessionId: params.sessionId,
        policyId: params.policyId,
        providerId: params.providerId,
        direction: params.direction,
        modelName: params.modelName,
        promptVersion: 'v1',
        textLength: params.textLength,
        ruleScore: params.ruleScore,
        ruleAction: params.ruleAction,
        ruleFindings: params.ruleFindings.map((f) => ({
          dimension: f.dimension,
          dimensionName: f.dimensionName,
          score: f.score,
          action: f.action,
          reason: f.reason,
        })),
        judgeScore: params.judgeScore,
        judgeConfidence: params.judgeConfidence?.toString(),
        judgeAction: params.judgeAction,
        judgeReason: params.judgeReason,
        judgeDimensions: params.judgeDimensions,
        ruleReview: params.ruleReview,
        rawResponse: params.rawResponse ? { content: params.rawResponse } : undefined,
        parseError: params.parseError,
        errorMessage: params.errorMessage,
        latencyMs: params.latencyMs,
        usedInDecision: false,
      })
      .returning({ id: judgeModelInvocations.id });

    return inserted.id;
  } catch (error) {
    console.error('记录裁判模型调用失败:', error);
    return '';
  }
}

/**
 * 获取策略的裁判模型配置
 */
export async function getJudgeConfig(policyId: string): Promise<PolicyJudgeConfig | null> {
  try {
    const { policyJudgeConfigs } = await import('@/storage/database/shared/schema');

    const configs = await db
      .select()
      .from(policyJudgeConfigs)
      .where(eq(policyJudgeConfigs.policyId, policyId))
      .limit(1);

    if (configs.length === 0) return null;

    const config = configs[0];
    return {
      id: config.id,
      policyId: config.policyId,
      enabled: config.enabled,
      providerId: config.providerId || undefined,
      mode: config.mode as 'conservative' | 'balanced' | 'review_only',
      triggerMode: config.triggerMode as 'risk_only' | 'risk_or_semantic' | 'always',
      triggerThreshold: config.triggerThreshold,
      judgeThreshold: config.judgeThreshold,
      weight: parseFloat(config.weight || '0.5'),
      applyToInput: config.applyToInput,
      applyToOutput: config.applyToOutput,
      enabledDimensions: (config.enabledDimensions as string[]) || [],
      semanticDimensions: (config.semanticDimensions as string[]) || [],
      timeoutMs: config.timeoutMs,
      fallbackAction: config.fallbackAction as 'rule' | 'allow' | 'block',
      failClosedForHighRisk: config.failClosedForHighRisk,
      maxTextLength: config.maxTextLength,
      maskPiiBeforeJudge: config.maskPiiBeforeJudge,
      blockExternalForSecrets: config.blockExternalForSecrets,
    };
  } catch (error) {
    console.error('获取裁判模型配置失败:', error);
    return null;
  }
}