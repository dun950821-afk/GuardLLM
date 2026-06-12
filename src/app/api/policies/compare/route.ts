import { NextRequest, NextResponse } from 'next/server';
import { detectWithDynamicRules } from '@/lib/detection/dynamic-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { policyAId, policyBId, text, direction = 'input' } = body;

    // 参数校验
    if (!policyAId || !policyBId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: policyAId, policyBId' },
        { status: 400 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: text' },
        { status: 400 }
      );
    }

    if (policyAId === policyBId) {
      return NextResponse.json(
        { success: false, error: '请选择两个不同的策略进行对比' },
        { status: 400 }
      );
    }

    // 并行执行两个策略的检测
    const [resultA, resultB] = await Promise.all([
      detectWithDynamicRules(text, policyAId, direction),
      detectWithDynamicRules(text, policyBId, direction),
    ]);

    // 构建策略A的结果
    const processedResultA = buildProcessedResult(text, resultA);
    
    // 构建策略B的结果
    const processedResultB = buildProcessedResult(text, resultB);

    // 计算差异
    const scoreDiff = Math.abs(resultA.overallScore - resultB.overallScore);
    const actionDiff = getActionDiff(resultA.action, resultB.action);
    
    // 判断策略严格程度
    const strategyASeverity = getStrategySeverity(resultA.overallScore, resultA.action);
    const strategyBSeverity = getStrategySeverity(resultB.overallScore, resultB.action);
    
    // 生成结论
    const conclusion = generateConclusion(resultA, resultB, scoreDiff, actionDiff);

    return NextResponse.json({
      success: true,
      resultA: processedResultA,
      resultB: processedResultB,
      diff: {
        scoreDiff,
        actionDiff,
        strategyASeverity,
        strategyBSeverity,
        conclusion,
      },
    });
  } catch (error) {
    console.error('A/B 对比检测失败:', error);
    return NextResponse.json(
      { success: false, error: '对比检测失败: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}

function buildProcessedResult(text: string, result: ReturnType<typeof detectWithDynamicRules> extends Promise<infer T> ? T : never) {
  const baseResult = {
    action: result.action,
    overallScore: result.overallScore,
    findings: result.findings.map(f => ({
      dimension: f.dimension,
      dimensionName: f.dimensionName,
      score: f.score,
      evidence: f.evidence,
      action: f.action,
    })),
    summary: result.summary,
    latencyMs: result.latencyMs,
    processedText: text,
  };

  // 处理脱敏 - 当 processingAction 是 mask 时
  if (result.processingAction === 'mask') {
    let maskedText = text;
    for (const finding of result.findings) {
      if (finding.evidence && finding.evidence.length > 0) {
        for (const evidence of finding.evidence) {
          if (evidence && evidence.length > 2) {
            const maskedEvidence = evidence[0] + '*'.repeat(Math.min(evidence.length - 2, 8)) + evidence[evidence.length - 1];
            maskedText = maskedText.split(evidence).join(maskedEvidence);
          }
        }
      }
    }
    return { ...baseResult, processedText: maskedText, maskedText };
  }

  // 处理改写 - 当 processingAction 是 rewrite 时
  if (result.processingAction === 'rewrite') {
    let rewrittenText = text;
    for (const finding of result.findings) {
      if (finding.dimension === 'pii_leak' && finding.evidence) {
        for (const evidence of finding.evidence) {
          if (evidence && evidence.length > 2) {
            rewrittenText = rewrittenText.replace(
              new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
              '[个人信息已保护]'
            );
          }
        }
      }
    }
    return { ...baseResult, processedText: rewrittenText, rewrittenText };
  }

  return baseResult;
}

function getActionDiff(actionA: string, actionB: string): string {
  if (actionA === actionB) {
    return '两个策略处理动作相同';
  }

  const actionOrder = ['allow', 'warn', 'mask', 'rewrite', 'block'];
  const indexA = actionOrder.indexOf(actionA);
  const indexB = actionOrder.indexOf(actionB);

  if (indexA < indexB) {
    return `策略B 更严格 (${getActionLabel(actionA)} → ${getActionLabel(actionB)})`;
  } else {
    return `策略A 更严格 (${getActionLabel(actionB)} → ${getActionLabel(actionA)})`;
  }
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    allow: '放行',
    warn: '警告',
    mask: '脱敏',
    rewrite: '改写',
    block: '拦截',
  };
  return labels[action] || action;
}

function getStrategySeverity(score: number, action: string): 'loose' | 'moderate' | 'strict' {
  if (action === 'block' || score >= 80) {
    return 'strict';
  }
  if (action === 'warn' || action === 'mask' || action === 'rewrite' || score >= 50) {
    return 'moderate';
  }
  return 'loose';
}

function generateConclusion(
  resultA: { action: string; overallScore: number },
  resultB: { action: string; overallScore: number },
  scoreDiff: number,
  actionDiff: string
): string {
  if (resultA.action === resultB.action && resultA.overallScore === resultB.overallScore) {
    return '两个策略对该内容的处理结果完全一致';
  }

  const severityOrder = ['loose', 'moderate', 'strict'];
  const severityA = getStrategySeverity(resultA.overallScore, resultA.action);
  const severityB = getStrategySeverity(resultB.overallScore, resultB.action);
  
  const indexA = severityOrder.indexOf(severityA);
  const indexB = severityOrder.indexOf(severityB);

  if (indexB > indexA) {
    if (resultB.action === 'block') {
      return `策略B 更严格，会拦截该内容，适合对安全性要求较高的场景`;
    }
    return `策略B 对该内容更敏感，适合需要较高安全级别的场景`;
  } else if (indexA > indexB) {
    if (resultA.action === 'block') {
      return `策略A 更严格，会拦截该内容，适合对安全性要求较高的场景`;
    }
    return `策略A 对该内容更敏感，适合需要较高安全级别的场景`;
  }

  if (scoreDiff <= 10) {
    return `两个策略差异较小，可根据其他因素选择`;
  }

  return `两个策略存在明显差异，建议根据实际安全需求选择`;
}
