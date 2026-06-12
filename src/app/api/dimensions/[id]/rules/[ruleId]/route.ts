import { NextResponse } from 'next/server';
import { query, update, remove } from '@/lib/db';
import { clearPolicyCache } from '@/lib/detection/dynamic-engine';

// 获取单个规则详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id, ruleId } = await params;

    const result = await query('detection_rules', {
      filter: { id: ruleId, dimensionId: id },
      single: true
    });

    if (result.error || !result.data) {
      return NextResponse.json(
        { success: false, error: '规则不存在' },
        { status: 404 }
      );
    }

    const rule = Array.isArray(result.data) ? result.data[0] : result.data;
    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('获取规则详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取规则详情失败' },
      { status: 500 }
    );
  }
}

// 更新规则
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id, ruleId } = await params;
    const body = await request.json();

    // 检查规则是否存在
    const existing = await query('detection_rules', {
      filter: { id: ruleId, dimensionId: id },
      single: true
    });

    if (existing.error || !existing.data) {
      return NextResponse.json(
        { success: false, error: '规则不存在' },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.pattern !== undefined) updateData.pattern = body.pattern;
    if (body.matchType !== undefined) updateData.match_type = body.matchType;
    if (body.caseSensitive !== undefined) updateData.case_sensitive = body.caseSensitive;
    if (body.score !== undefined) updateData.score = body.score;
    if (body.confidence !== undefined) updateData.confidence = body.confidence;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.config !== undefined) updateData.config = body.config;
    if (body.groupId !== undefined) updateData.group_id = body.groupId;
    if (body.suggestion !== undefined) updateData.suggestion = body.suggestion;

    const updated = await update('detection_rules', ruleId, updateData);

    // 清除检测缓存
    clearPolicyCache();

    return NextResponse.json({ success: true, data: updated.data });
  } catch (error) {
    console.error('更新规则失败:', error);
    return NextResponse.json(
      { success: false, error: '更新规则失败' },
      { status: 500 }
    );
  }
}

// 删除规则
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    const { id, ruleId } = await params;

    // 检查规则是否存在
    const existing = await query('detection_rules', {
      filter: { id: ruleId, dimensionId: id },
      single: true
    });

    if (existing.error || !existing.data) {
      return NextResponse.json(
        { success: false, error: '规则不存在' },
        { status: 404 }
      );
    }

    await remove('detection_rules', ruleId);

    // 清除检测缓存
    clearPolicyCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除规则失败:', error);
    return NextResponse.json(
      { success: false, error: '删除规则失败' },
      { status: 500 }
    );
  }
}
