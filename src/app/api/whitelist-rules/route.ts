import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { whitelistRules, whitelistRulePolicies, policyProfiles, detectionDimensions } from '@/lib/db';
import { sql, eq, inArray } from 'drizzle-orm';

// 白名单规则创建/更新请求类型
interface WhitelistRuleRequest {
  id?: string;
  name: string;
  description?: string;
  policyScope: 'all' | 'specific';
  policyIds?: string[];
  dimensionScope: 'all' | 'specific';
  dimensionCodes?: string[];
  priority: number;
  pattern: string;
  matchType: 'exact' | 'contains' | 'prefix' | 'suffix' | 'regex';
  caseSensitive: boolean;
  enabled: boolean;
}

// GET: 获取所有白名单规则（包含策略绑定信息）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('policyId');

    // 获取所有白名单规则
    const rules = await db.select().from(whitelistRules).orderBy(sql`${whitelistRules.priority} DESC`);

    // 获取所有策略绑定
    const policyBindings = await db.select().from(whitelistRulePolicies);

    // 获取所有策略信息
    const policies = await db.select().from(policyProfiles);

    // 获取所有维度信息
    const dimensions = await db.select().from(detectionDimensions);

    // 组装返回数据
    const rulesWithBindings = rules.map(rule => {
      const bindings = policyBindings.filter(b => b.whitelistRuleId === rule.id);
      const boundPolicyIds = bindings.map(b => b.policyId);
      const boundPolicies = policies.filter(p => boundPolicyIds.includes(p.id));

      // 获取维度名称
      const dimCodes = rule.dimensionCodes as string[] || [];
      const dimNames = dimCodes.map(code => {
        const dim = dimensions.find(d => d.code === code);
        return dim ? dim.name : code;
      });

      return {
        ...rule,
        policyIds: boundPolicyIds,
        policyNames: boundPolicies.map(p => p.name),
        dimensionNames: dimNames,
      };
    });

    // 如果指定了策略ID，过滤出对该策略生效的白名单
    let filteredRules = rulesWithBindings;
    if (policyId) {
      filteredRules = rulesWithBindings.filter(rule => 
        rule.policyScope === 'all' || rule.policyIds?.includes(policyId)
      );
    }

    return NextResponse.json({ success: true, data: filteredRules });
  } catch (error) {
    console.error('获取白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '获取白名单规则失败' },
      { status: 500 }
    );
  }
}

// POST: 创建白名单规则
export async function POST(request: NextRequest) {
  try {
    const body: WhitelistRuleRequest = await request.json();
    const {
      name,
      description,
      policyScope,
      policyIds = [],
      dimensionScope,
      dimensionCodes = [],
      priority = 100,
      pattern,
      matchType,
      caseSensitive,
      enabled
    } = body;

    // 参数校验
    if (!pattern || !pattern.trim()) {
      return NextResponse.json(
        { success: false, error: '匹配内容不能为空' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: '白名单名称不能为空' },
        { status: 400 }
      );
    }

    if (policyScope === 'specific' && (!policyIds || policyIds.length === 0)) {
      return NextResponse.json(
        { success: false, error: '指定策略模式下必须选择至少一个策略' },
        { status: 400 }
      );
    }

    if (dimensionScope === 'specific' && (!dimensionCodes || dimensionCodes.length === 0)) {
      return NextResponse.json(
        { success: false, error: '指定维度模式下必须选择至少一个维度' },
        { status: 400 }
      );
    }

    // 正则表达式校验
    if (matchType === 'regex') {
      try {
        new RegExp(pattern);
      } catch {
        return NextResponse.json(
          { success: false, error: '正则表达式语法错误' },
          { status: 400 }
        );
      }
    }

    // 创建白名单规则
    const result = await db.insert(whitelistRules).values({
      name,
      description: description || null,
      policyScope,
      dimensionScope,
      dimensionCodes: dimensionCodes as any,
      priority,
      pattern,
      matchType,
      caseSensitive,
      enabled,
    }).returning();

    const newRule = result[0];

    // 如果是指定策略，创建策略绑定
    if (policyScope === 'specific' && policyIds.length > 0) {
      const bindingValues = policyIds.map(policyId => ({
        whitelistRuleId: newRule.id,
        policyId,
      }));
      await db.insert(whitelistRulePolicies).values(bindingValues);
    }

    return NextResponse.json({ success: true, data: newRule });
  } catch (error) {
    console.error('创建白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '创建白名单规则失败' },
      { status: 500 }
    );
  }
}

// PUT: 更新白名单规则
export async function PUT(request: NextRequest) {
  try {
    const body: WhitelistRuleRequest & { id: string } = await request.json();
    const {
      id,
      name,
      description,
      policyScope,
      policyIds = [],
      dimensionScope,
      dimensionCodes = [],
      priority,
      pattern,
      matchType,
      caseSensitive,
      enabled
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少白名单ID' },
        { status: 400 }
      );
    }

    // 参数校验
    if (!pattern || !pattern.trim()) {
      return NextResponse.json(
        { success: false, error: '匹配内容不能为空' },
        { status: 400 }
      );
    }

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: '白名单名称不能为空' },
        { status: 400 }
      );
    }

    // 正则表达式校验
    if (matchType === 'regex') {
      try {
        new RegExp(pattern);
      } catch {
        return NextResponse.json(
          { success: false, error: '正则表达式语法错误' },
          { status: 400 }
        );
      }
    }

    // 更新白名单规则
    const result = await db.update(whitelistRules)
      .set({
        name,
        description: description || null,
        policyScope,
        dimensionScope,
        dimensionCodes: dimensionCodes as any,
        priority,
        pattern,
        matchType,
        caseSensitive,
        enabled,
        updatedAt: new Date(),
      })
      .where(sql`${whitelistRules.id} = ${id}`)
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: '白名单规则不存在' },
        { status: 404 }
      );
    }

    // 删除旧的策略绑定
    await db.delete(whitelistRulePolicies)
      .where(sql`${whitelistRulePolicies.whitelistRuleId} = ${id}`);

    // 创建新的策略绑定
    if (policyScope === 'specific' && policyIds.length > 0) {
      const bindingValues = policyIds.map(policyId => ({
        whitelistRuleId: id,
        policyId,
      }));
      await db.insert(whitelistRulePolicies).values(bindingValues);
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error('更新白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '更新白名单规则失败' },
      { status: 500 }
    );
  }
}

// DELETE: 删除白名单规则
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少白名单ID' },
        { status: 400 }
      );
    }

    // 先删除策略绑定
    await db.delete(whitelistRulePolicies)
      .where(sql`${whitelistRulePolicies.whitelistRuleId} = ${id}`);

    // 再删除白名单规则
    const result = await db.delete(whitelistRules)
      .where(sql`${whitelistRules.id} = ${id}`)
      .returning();

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: '白名单规则不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除白名单规则失败:', error);
    return NextResponse.json(
      { success: false, error: '删除白名单规则失败' },
      { status: 500 }
    );
  }
}
