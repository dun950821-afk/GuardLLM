import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { whitelistRules, policyProfiles } from '@/lib/db';
import { sql, eq } from 'drizzle-orm';

// 获取默认策略ID
async function getDefaultPolicyId(): Promise<string | null> {
  try {
    // 优先查找 is_default 为 true 的策略
    const defaultPolicies = await db.select()
      .from(policyProfiles)
      .where(eq(policyProfiles.isDefault, true))
      .limit(1);
    
    if (defaultPolicies.length > 0) {
      return defaultPolicies[0].id;
    }
    
    // 如果没有默认策略，获取第一个策略
    const allPolicies = await db.select()
      .from(policyProfiles)
      .limit(1);
    
    if (allPolicies.length > 0) {
      return allPolicies[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('获取默认策略失败:', error);
    return null;
  }
}

// GET: 获取所有白名单规则
export async function GET() {
  try {
    // 尝试从数据库获取白名单规则
    const rules = await db.select().from(whitelistRules);

    // 如果数据库为空，返回友好提示
    if (rules.length === 0) {
      // 检查是否需要初始化
      return NextResponse.json({ 
        success: true, 
        data: [],
        message: '白名单规则为空。请访问 /api/init-database 初始化数据库，或在白名单管理页面添加规则。'
      });
    }

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('获取白名单规则失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取白名单规则失败，请检查数据库连接。请确保已运行数据库迁移。' 
      },
      { status: 500 }
    );
  }
}

// POST: 创建白名单规则
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { policyId, dimensionId, pattern, matchType, caseSensitive, description, enabled } = body;

    if (!pattern) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: pattern' },
        { status: 400 }
      );
    }

    // 如果没有传入 policyId，从数据库获取默认策略
    if (!policyId) {
      policyId = await getDefaultPolicyId();
      if (!policyId) {
        return NextResponse.json(
          { success: false, error: '未找到可用策略，请先创建策略' },
          { status: 400 }
        );
      }
    }

    // 使用 gen_random_uuid() 生成 UUID
    const result = await db.insert(whitelistRules).values({
      policyId,
      dimensionId: dimensionId || null,
      pattern,
      matchType: matchType || 'contains',
      caseSensitive: caseSensitive ?? false,
      description: description || null,
      enabled: enabled ?? true,
    }).returning();

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('创建白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '创建白名单规则失败' },
      { status: 500 }
    );
  }
}
