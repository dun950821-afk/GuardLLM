import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 设为默认策略
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = getDb();

    // 检查策略是否存在
    const { data: policy, error: fetchError } = await client
      .from('policy_profiles')
      .select('id, is_active')
      .eq('id', id)
      .single();

    if (fetchError || !policy) {
      return NextResponse.json(
        { success: false, error: '策略不存在' },
        { status: 404 }
      );
    }

    if (!policy.is_active) {
      return NextResponse.json(
        { success: false, error: '不能将禁用的策略设为默认' },
        { status: 400 }
      );
    }

    // 取消现有默认策略
    await client
      .from('policy_profiles')
      .update({ is_default: false })
      .eq('is_default', true);

    // 设为默认
    const { error } = await client
      .from('policy_profiles')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '已设为默认策略',
    });
  } catch (error) {
    console.error('Error setting default policy:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to set default policy' },
      { status: 500 }
    );
  }
}
