/**
 * 策略升级配置API
 * 用于获取和更新策略的升级配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { policyProfiles } from '@/storage/database/shared/schema';
import { eq } from 'drizzle-orm';

/**
 * GET - 获取策略升级配置
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;

    const policies = await db
      .select({
        escalationEnabled: policyProfiles.escalationEnabled,
        escalationThreshold: policyProfiles.escalationThreshold,
        escalationTargetPolicyId: policyProfiles.escalationTargetPolicyId,
        deescalationThreshold: policyProfiles.deescalationThreshold,
        escalationCooldownMinutes: policyProfiles.escalationCooldownMinutes,
      })
      .from(policyProfiles)
      .where(eq(policyProfiles.id, policyId))
      .limit(1);

    if (policies.length === 0) {
      return NextResponse.json(
        { success: false, error: '策略不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: policies[0],
    });
  } catch (error: any) {
    console.error('[策略升级配置API] GET失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取配置失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT - 更新策略升级配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: policyId } = await params;
    const body = await request.json();

    const {
      escalationEnabled,
      escalationThreshold,
      escalationTargetPolicyId,
      deescalationThreshold,
      escalationCooldownMinutes,
    } = body;

    // 验证参数
    if (escalationThreshold !== undefined && (escalationThreshold < 1 || escalationThreshold > 20)) {
      return NextResponse.json(
        { success: false, error: '升级阈值必须在1-20之间' },
        { status: 400 }
      );
    }

    if (deescalationThreshold !== undefined && (deescalationThreshold < 1 || deescalationThreshold > 10)) {
      return NextResponse.json(
        { success: false, error: '降级阈值必须在1-10之间' },
        { status: 400 }
      );
    }

    if (escalationCooldownMinutes !== undefined && (escalationCooldownMinutes < 0 || escalationCooldownMinutes > 1440)) {
      return NextResponse.json(
        { success: false, error: '冷却期必须在0-1440分钟之间，0表示满足条件立即降级' },
        { status: 400 }
      );
    }

    // 检查目标策略是否存在（如果指定了）
    if (escalationTargetPolicyId) {
      const targetPolicies = await db
        .select()
        .from(policyProfiles)
        .where(eq(policyProfiles.id, escalationTargetPolicyId))
        .limit(1);

      if (targetPolicies.length === 0) {
        return NextResponse.json(
          { success: false, error: '目标策略不存在' },
          { status: 400 }
        );
      }

      // 不能升级到自己
      if (escalationTargetPolicyId === policyId) {
        return NextResponse.json(
          { success: false, error: '不能将策略升级到自身' },
          { status: 400 }
        );
      }
    }

    // 更新配置
    await db
      .update(policyProfiles)
      .set({
        escalationEnabled: escalationEnabled ?? false,
        escalationThreshold: escalationThreshold ?? 5,
        escalationTargetPolicyId: escalationTargetPolicyId ?? null,
        deescalationThreshold: deescalationThreshold ?? 1,
        escalationCooldownMinutes: escalationCooldownMinutes ?? 30,
        updatedAt: new Date(),
      })
      .where(eq(policyProfiles.id, policyId));

    return NextResponse.json({
      success: true,
      message: '策略升级配置已更新',
    });
  } catch (error: any) {
    console.error('[策略升级配置API] PUT失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '更新配置失败' },
      { status: 500 }
    );
  }
}