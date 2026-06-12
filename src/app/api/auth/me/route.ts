import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import { getDb } from '@/lib/db';

const JWT_SECRET = process.env.JWT_SECRET || 'guardllm-secret-key-2024';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    const decoded = verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: string;
    };

    // 从数据库获取完整用户信息
    const client = getDb();
    const { data: users, error } = await client
      .from('users')
      .select('id, username, nickname, email, phone, department, role')
      .eq('id', decoded.userId)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    const user = users[0];

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  }
}