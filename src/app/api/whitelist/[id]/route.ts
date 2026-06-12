import { NextResponse } from 'next/server';
import { query, update, remove } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 获取单个白名单规则
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const result = await query('whitelist_rules', {
      filter: { id }
    });

    if (result.error || !result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return NextResponse.json(
        { success: false, error: '白名单规则不存在' },
        { status: 404 }
      );
    }

    const rule = Array.isArray(result.data) ? result.data[0] : result.data;
    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('获取白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '获取白名单规则失败' },
      { status: 500 }
    );
  }
}

// 更新白名单规则
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dimensionId, pattern, matchType, caseSensitive, description, enabled } = body;

    const updateData: Record<string, unknown> = {};
    if (dimensionId !== undefined) updateData.dimensionId = dimensionId;
    if (pattern !== undefined) updateData.pattern = pattern;
    if (matchType !== undefined) updateData.matchType = matchType;
    if (caseSensitive !== undefined) updateData.caseSensitive = caseSensitive;
    if (description !== undefined) updateData.description = description;
    if (enabled !== undefined) updateData.enabled = enabled;

    const result = await update('whitelist_rules', id, updateData);

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('更新白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '更新白名单规则失败' },
      { status: 500 }
    );
  }
}

// 删除白名单规则
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    await remove('whitelist_rules', id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '删除白名单规则失败' },
      { status: 500 }
    );
  }
}
