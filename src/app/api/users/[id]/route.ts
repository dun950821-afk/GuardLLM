import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { getDb } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'guardllm-secret-key-2024';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 验证登录状态
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json(
        { success: false, error: '登录已过期' },
        { status: 401 }
      );
    }

    // 只能修改自己的信息
    if (decoded.userId !== id) {
      return NextResponse.json(
        { success: false, error: '无权限修改他人信息' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nickname, email, phone, department } = body;

    const client = getDb();

    // 更新用户信息
    const { error } = await client
      .from('users')
      .update({
        nickname,
        email,
        phone,
        department,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('更新用户信息失败:', error);
      return NextResponse.json(
        { success: false, error: '更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: { id, nickname, email, phone, department },
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误' },
      { status: 500 }
    );
  }
}
