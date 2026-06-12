import { NextResponse } from 'next/server';
import { initializeDatabase, initDefaultPolicy } from '@/lib/detection/init-database';

/**
 * POST /api/init-database
 * 初始化数据库 - 插入16个内置检测维度、规则和默认策略
 */
export async function POST() {
  try {
    // 初始化维度和规则
    const result = await initializeDatabase();
    
    // 初始化默认策略
    const policyResult = await initDefaultPolicy();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          dimensions: result.dimensions,
          rules: result.rules,
          whitelist: result.whitelist,
          policy: policyResult.success ? '默认策略已创建' : (policyResult.error || '策略创建失败'),
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.message,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('初始化数据库失败:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '初始化失败',
    }, { status: 500 });
  }
}

/**
 * GET /api/init-database
 * 检查数据库初始化状态
 */
export async function GET() {
  try {
    const { getDb } = await import('@/lib/db');
    const client = getDb();

    const { data: dimensions } = await client
      .from('detection_dimensions')
      .select('id')
      .limit(1);

    const isInitialized = dimensions && dimensions.length > 0;

    return NextResponse.json({
      success: true,
      isInitialized,
      message: isInitialized ? '数据库已初始化' : '数据库未初始化，请调用 POST /api/init-database 进行初始化',
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      isInitialized: false,
      error: error instanceof Error ? error.message : '检查失败',
    });
  }
}
