import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// 规则匹配函数
function matchRule(text: string, rule: any): boolean {
  const searchText = rule.case_sensitive ? text : text.toLowerCase();
  const pattern = rule.case_sensitive ? rule.pattern : rule.pattern?.toLowerCase();

  if (!pattern) return false;

  switch (rule.match_type) {
    case 'exact':
      return searchText === pattern;
    case 'contains':
      return searchText.includes(pattern);
    case 'prefix':
      return searchText.startsWith(pattern);
    case 'suffix':
      return searchText.endsWith(pattern);
    case 'regex':
      try {
        const flags = rule.case_sensitive ? 'g' : 'gi';
        return new RegExp(pattern, flags).test(text);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

// 计算维度评分
function calculateDimensionScore(
  matchedRules: any[],
  dimensionWeight: number
): number {
  if (matchedRules.length === 0) return 0;

  // 取最高分
  const maxRuleScore = Math.max(...matchedRules.map(r => r.score || 0), 0);

  // 其他规则衰减累加
  const extraScore = matchedRules
    .filter(r => r.score !== maxRuleScore)
    .reduce((sum: number, r) => sum + (r.score || 0) * 0.2, 0);

  // 加权计算
  const finalScore = (maxRuleScore + extraScore) * dimensionWeight;

  // 限制在0-100
  return Math.min(Math.max(finalScore, 0), 100);
}

// 测试维度检测
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: '测试文本不能为空' },
        { status: 400 }
      );
    }

    // 获取维度信息
    const dimensionResult = await query('detection_dimensions', {
      filter: { id },
      single: true
    });

    if (dimensionResult.error || !dimensionResult.data) {
      return NextResponse.json(
        { success: false, error: '维度不存在' },
        { status: 404 }
      );
    }

    const dimension = Array.isArray(dimensionResult.data) ? dimensionResult.data[0] : dimensionResult.data;

    // 获取该维度的所有启用规则
    const rulesResult = await query('detection_rules', {
      filter: { dimensionId: id, enabled: true },
      order: { column: 'priority', ascending: false }
    });

    const rules = rulesResult.data && Array.isArray(rulesResult.data) ? rulesResult.data : [];

    // 执行规则匹配
    const matchedRules: any[] = [];
    const matchedEvidence: string[] = [];

    for (const rule of rules) {
      if (rule.pattern && matchRule(text, rule)) {
        matchedRules.push(rule);
        // 提取匹配的证据
        if (rule.match_type === 'regex') {
          try {
            const flags = rule.case_sensitive ? 'g' : 'gi';
            const regex = new RegExp(rule.pattern, flags);
            const matches = text.match(regex);
            if (matches) {
              matchedEvidence.push(...matches.slice(0, 3)); // 最多取3个匹配
            }
          } catch {
            // 忽略无效正则
          }
        } else {
          matchedEvidence.push(rule.pattern);
        }
      }
    }

    // 计算评分
    const dimensionWeight = parseFloat(dimension.weight) || 1.0;
    const score = calculateDimensionScore(matchedRules, dimensionWeight);

    return NextResponse.json({
      success: true,
      data: {
        dimension: {
          id: dimension.id,
          code: dimension.code,
          name: dimension.name,
          weight: dimensionWeight
        },
        text,
        score: Math.round(score),
        matchedRules: matchedRules.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          pattern: r.pattern,
          score: r.score,
          confidence: r.confidence
        })),
        evidence: [...new Set(matchedEvidence)], // 去重
        ruleCount: rules.length,
        matchedCount: matchedRules.length
      }
    });
  } catch (error) {
    console.error('测试维度失败:', error);
    return NextResponse.json(
      { success: false, error: '测试维度失败' },
      { status: 500 }
    );
  }
}
