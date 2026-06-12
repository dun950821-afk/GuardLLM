import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { clearPolicyCache } from '@/lib/detection/dynamic-engine';

// 启用/禁用策略
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isActive 必须是布尔值' },
        { status: 400 }
      );
    }

    const client = getDb();

    const { error } = await client
      .from('policy_profiles')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 清除检测缓存
    clearPolicyCache(id);

    return NextResponse.json({
      success: true,
      message: isActive ? '策略已启用' : '策略已禁用',
    });
  } catch (error) {
    console.error('Error toggling policy:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to toggle policy' },
      { status: 500 }
    );
  }
}
