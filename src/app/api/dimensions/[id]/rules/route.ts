import { NextResponse } from 'next/server';
import { query, insert } from '@/lib/db';

// 辅助函数：根据 UUID 或 code 获取维度 ID
async function getDimensionIdByIdOrCode(idOrCode: string): Promise<string | null> {
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);

  if (isUUID) {
    const result = await query('detection_dimensions', {
      filter: { id: idOrCode },
      single: true
    });
    return result.data?.id || null;
  } else {
    const result = await query('detection_dimensions', {
      filter: { code: idOrCode },
      single: true
    });
    return result.data?.id || null;
  }
}

// 获取维度的所有规则
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const enabled = searchParams.get('enabled');

    // 获取维度 ID
    const dimensionId = await getDimensionIdByIdOrCode(id);
    if (!dimensionId) {
      return NextResponse.json(
        { success: false, error: '维度不存在' },
        { status: 404 }
      );
    }

    let filter: Record<string, any> = { dimensionId };
    if (type) filter.type = type;
    if (enabled !== null) filter.enabled = enabled === 'true';

    const rulesResult = await query('detection_rules', {
      filter,
      order: { column: 'priority', ascending: false }
    });

    const rules = rulesResult.data || [];

    // 获取规则组信息
    const ruleGroupsResult = await query('rule_groups', {
      filter: { dimensionId }
    });
    
    const ruleGroups = ruleGroupsResult.data || [];

    // 为规则添加组信息
    const rulesWithGroup = rules.map((rule: any) => ({
      ...rule,
      groupName: rule.group_id 
        ? ruleGroups.find((g: any) => g.id === rule.group_id)?.name 
        : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        items: rulesWithGroup,
        total: rules.length,
        ruleGroups
      }
    });
  } catch (error) {
    console.error('获取规则列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取规则列表失败' },
      { status: 500 }
    );
  }
}

// 创建新规则
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      pattern,
      matchType,
      caseSensitive,
      score,
      confidence,
      priority,
      enabled,
      description,
      config,
      groupId,
      suggestion
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: '规则名称和类型不能为空' },
        { status: 400 }
      );
    }

    // keyword 和 regex 类型需要 pattern
    if ((type === 'keyword' || type === 'regex') && !pattern) {
      return NextResponse.json(
        { success: false, error: '关键词和正则规则需要提供匹配模式' },
        { status: 400 }
      );
    }

    // 根据 type 自动推断 match_type
    const defaultMatchType = type === 'regex' ? 'regex' : type === 'keyword' ? 'exact' : 'contains';

    // 获取维度 ID
    const dimensionId = await getDimensionIdByIdOrCode(id);
    if (!dimensionId) {
      return NextResponse.json(
        { success: false, error: '维度不存在' },
        { status: 404 }
      );
    }

    const rule = await insert('detection_rules', {
      dimension_id: dimensionId,
      group_id: groupId || null,
      name,
      type,
      pattern: pattern || null,
      match_type: matchType || defaultMatchType,
      case_sensitive: caseSensitive || false,
      score: score || 50,
      confidence: confidence || 0.8,
      priority: priority || 100,
      enabled: enabled !== false,
      description: description || '',
      config: config || {},
      suggestion: suggestion || '',
      tags: []
    });

    return NextResponse.json({ success: true, data: rule.data });
  } catch (error) {
    console.error('创建规则失败:', error);
    return NextResponse.json(
      { success: false, error: '创建规则失败' },
      { status: 500 }
    );
  }
}
