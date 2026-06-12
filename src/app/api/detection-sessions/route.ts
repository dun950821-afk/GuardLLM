import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { detectionSessions, detectionRecords, riskFindings } from '@/lib/db';

// 检测动作类型
type DetectionAction = 'allow' | 'block' | 'warn' | 'mask' | 'rewrite';

// 白名单命中信息
interface WhitelistMatchedInfo {
  id: string;
  name: string;
  policyScope: string;
  dimensionScope: string;
  dimensionCodes: string[];
  pattern: string;
  matchType: string;
  effect: string;
}

// 被跳过的维度信息
interface SkippedDimensionInfo {
  dimensionCode: string;
  dimensionName: string;
  whitelistId: string;
  whitelistName: string;
  effect: string;
}

// 记录会话的参数
interface RecordSessionParams {
  userPrompt: string;
  mockModelOutput?: string;
  finalResponse?: string;
  inputDetection?: {
    action: DetectionAction;
    processingAction?: 'none' | 'mask' | 'rewrite';
    overallScore: number;
    findings: Array<{
      dimension: string;
      dimensionName?: string;
      score: number;
      severity?: string;
      matchedRules?: string[];
      evidence?: string[];
      reason?: string;
      action?: string;
    }>;
    summary?: string;
    latencyMs?: number;
    whitelistMatched?: WhitelistMatchedInfo;
    skippedDimensions?: SkippedDimensionInfo[];
  };
  outputDetection?: {
    action: DetectionAction;
    processingAction?: 'none' | 'mask' | 'rewrite';
    overallScore: number;
    findings: Array<{
      dimension: string;
      dimensionName?: string;
      score: number;
      severity?: string;
      matchedRules?: string[];
      evidence?: string[];
      reason?: string;
      action?: string;
    }>;
    summary?: string;
    latencyMs?: number;
    whitelistMatched?: WhitelistMatchedInfo;
    skippedDimensions?: SkippedDimensionInfo[];
  };
  policyId?: string;
  targetProviderId?: string;
  judgeProviderId?: string;
  userId?: string;
}

/**
 * 确定最终动作（取最严格的）
 */
function determineFinalAction(
  inputAction?: DetectionAction,
  outputAction?: DetectionAction
): DetectionAction {
  const priority: DetectionAction[] = ['block', 'rewrite', 'mask', 'warn', 'allow'];
  const inputPriority = inputAction ? priority.indexOf(inputAction) : 4;
  const outputPriority = outputAction ? priority.indexOf(outputAction) : 4;
  return priority[Math.min(inputPriority, outputPriority)];
}

/**
 * 生成 UUID
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * POST /api/detection-sessions
 * 记录检测会话
 */
export async function POST(request: NextRequest) {
  try {
    const params: RecordSessionParams = await request.json();

    if (!params.userPrompt) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: userPrompt' },
        { status: 400 }
      );
    }

    const sessionId = generateUUID();

    // 计算总耗时
    const totalDurationMs = 
      (params.inputDetection?.latencyMs || 0) + 
      (params.outputDetection?.latencyMs || 0);

    // 确定最终动作
    const finalAction = determineFinalAction(
      params.inputDetection?.action,
      params.outputDetection?.action
    );

    // 1. 写入检测会话
    await db.insert(detectionSessions).values({
      id: sessionId,
      userId: params.userId || null,
      userPrompt: params.userPrompt,
      mockModelOutput: params.mockModelOutput || null,
      finalResponse: params.finalResponse || null,
      inputAction: params.inputDetection?.action || null,
      inputScore: params.inputDetection?.overallScore?.toString() || null,
      inputSummary: params.inputDetection?.summary || null,
      outputAction: params.outputDetection?.action || null,
      outputScore: params.outputDetection?.overallScore?.toString() || null,
      outputSummary: params.outputDetection?.summary || null,
      finalAction: finalAction,
      policyId: params.policyId || null,
      targetProviderId: params.targetProviderId || null,
      judgeProviderId: params.judgeProviderId || null,
      durationMs: totalDurationMs || null,
      // 保存白名单命中信息
      whitelistMatched: (params.inputDetection?.whitelistMatched || params.outputDetection?.whitelistMatched) as any,
      skippedDimensions: (params.inputDetection?.skippedDimensions || params.outputDetection?.skippedDimensions) as any,
    });

    // 2. 写入输入检测记录（如果有）
    if (params.inputDetection) {
      const recordId = generateUUID();
      await db.insert(detectionRecords).values({
        id: recordId,
        sessionId,
        direction: 'input',
        rawText: params.userPrompt,
        maskedText: null,
        rewrittenText: null,
        overallScore: params.inputDetection.overallScore?.toString() || null,
        confidence: null,
        action: params.inputDetection.action || null,
        processingAction: params.inputDetection.processingAction || null,
        summary: params.inputDetection.summary || null,
        ruleLatencyMs: params.inputDetection.latencyMs || null,
        cozeLatencyMs: null,
        totalLatencyMs: params.inputDetection.latencyMs || null,
      });

      // 写入风险发现
      if (params.inputDetection.findings && params.inputDetection.findings.length > 0) {
        for (const finding of params.inputDetection.findings) {
          await db.insert(riskFindings).values({
            id: generateUUID(),
            recordId,
            dimension: finding.dimension,
            score: finding.score?.toString() || null,
            confidence: null,
            severity: finding.severity || null,
            matchedRules: finding.matchedRules || null,
            evidence: finding.evidence || null,
            reason: finding.reason || null,
            suggestion: null,
          });
        }
      }
    }

    // 3. 写入输出检测记录（如果有）
    if (params.outputDetection && (params.mockModelOutput || params.finalResponse)) {
      const recordId = generateUUID();
      await db.insert(detectionRecords).values({
        id: recordId,
        sessionId,
        direction: 'output',
        rawText: params.mockModelOutput || params.finalResponse || '',
        maskedText: null,
        rewrittenText: null,
        overallScore: params.outputDetection.overallScore?.toString() || null,
        confidence: null,
        action: params.outputDetection.action || null,
        processingAction: params.outputDetection.processingAction || null,
        summary: params.outputDetection.summary || null,
        ruleLatencyMs: params.outputDetection.latencyMs || null,
        cozeLatencyMs: null,
        totalLatencyMs: params.outputDetection.latencyMs || null,
      });

      // 写入风险发现
      if (params.outputDetection.findings && params.outputDetection.findings.length > 0) {
        for (const finding of params.outputDetection.findings) {
          await db.insert(riskFindings).values({
            id: generateUUID(),
            recordId,
            dimension: finding.dimension,
            score: finding.score?.toString() || null,
            confidence: null,
            severity: finding.severity || null,
            matchedRules: finding.matchedRules || null,
            evidence: finding.evidence || null,
            reason: finding.reason || null,
            suggestion: null,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { sessionId },
    });
  } catch (error: any) {
    console.error('记录检测会话失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '记录失败' },
      { status: 500 }
    );
  }
}
