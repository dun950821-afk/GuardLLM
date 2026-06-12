import { NextResponse } from 'next/server';
import { sql, db } from '@/lib/db';

export async function GET() {
  try {
    // 执行简单查询测试数据库连接
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      connected: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DB Health Check] 连接失败:', error);

    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : '数据库连接失败',
      timestamp: new Date().toISOString()
    });
  }
}
