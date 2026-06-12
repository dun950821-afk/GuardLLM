/**
 * 风险发现更新 API
 * PATCH: 更新风险发现状态（接受/忽略）
 * GET: 获取单个风险发现详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentScanFindings } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

// Node.js 运行时配置（必须）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const { id: taskId, findingId } = await params;
    const body = await request.json();
    const { status, ignoreReason, ignoreNote } = body;

    // 验证状态
    if (!['open', 'accepted', 'ignored'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的状态值，只支持 open、accepted、ignored' },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'ignored') {
      // 忽略状态：写入忽略原因和备注
      updateData.ignoreReason = ignoreReason || null;
      updateData.ignoreNote = ignoreNote || null;
      updateData.ignoredAt = new Date();
      updateData.acceptedAt = null;
    } else if (status === 'accepted') {
      // 接受状态：清空忽略相关字段
      updateData.acceptedAt = new Date();
      updateData.ignoreReason = null;
      updateData.ignoreNote = null;
      updateData.ignoredAt = null;
    } else if (status === 'open') {
      // 重新打开：清空所有处理相关字段
      updateData.acceptedAt = null;
      updateData.ignoreReason = null;
      updateData.ignoreNote = null;
      updateData.ignoredAt = null;
    }

    // 同时校验 taskId 和 findingId，避免跨任务更新
    const [updated] = await db.update(documentScanFindings)
      .set(updateData)
      .where(
        and(
          eq(documentScanFindings.id, findingId),
          eq(documentScanFindings.taskId, taskId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: '风险发现不存在或不属于该任务' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('更新风险发现失败:', error);
    return NextResponse.json(
      { success: false, error: '更新风险发现失败' },
      { status: 500 }
    );
  }
}

// 获取单个风险发现详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; findingId: string }> }
) {
  try {
    const { id: taskId, findingId } = await params;

    // 同时校验 taskId 和 findingId
    const [finding] = await db.select()
      .from(documentScanFindings)
      .where(
        and(
          eq(documentScanFindings.id, findingId),
          eq(documentScanFindings.taskId, taskId)
        )
      );

    if (!finding) {
      return NextResponse.json(
        { success: false, error: '风险发现不存在或不属于该任务' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: finding,
    });
  } catch (error) {
    console.error('获取风险发现详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取风险发现详情失败' },
      { status: 500 }
    );
  }
}
