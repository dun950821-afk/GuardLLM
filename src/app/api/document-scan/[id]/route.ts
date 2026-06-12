/**
 * 文档扫描任务详情 API
 * GET: 获取任务详情
 * DELETE: 删除任务
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentScanTasks, documentScanFindings } from '@/lib/db';
import { eq, desc, and } from 'drizzle-orm';

// Node.js 运行时配置（必须）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取任务详情
    const [task] = await db.select()
      .from(documentScanTasks)
      .where(eq(documentScanTasks.id, id));

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 获取风险发现列表
    const findings = await db.select()
      .from(documentScanFindings)
      .where(eq(documentScanFindings.taskId, id))
      .orderBy(desc(documentScanFindings.score));

    // 统计信息
    const stats = {
      totalFindings: findings.length,
      bySeverity: {
        critical: findings.filter(f => f.severity === 'critical').length,
        high: findings.filter(f => f.severity === 'high').length,
        medium: findings.filter(f => f.severity === 'medium').length,
        low: findings.filter(f => f.severity === 'low').length,
      },
      byStatus: {
        open: findings.filter(f => f.status === 'open').length,
        accepted: findings.filter(f => f.status === 'accepted').length,
        ignored: findings.filter(f => f.status === 'ignored').length,
      },
      byAction: {
        allow: findings.filter(f => f.action === 'allow').length,
        warn: findings.filter(f => f.action === 'warn').length,
        mask: findings.filter(f => f.action === 'mask').length,
        rewrite: findings.filter(f => f.action === 'rewrite').length,
        block: findings.filter(f => f.action === 'block').length,
      },
      byDimension: {} as Record<string, { count: number; dimensionName: string; maxScore: number }>,
    };

    // 按维度统计
    for (const finding of findings) {
      const code = finding.dimensionCode || 'unknown';
      if (!stats.byDimension[code]) {
        stats.byDimension[code] = {
          count: 0,
          dimensionName: finding.dimensionName || '未知维度',
          maxScore: 0,
        };
      }
      stats.byDimension[code].count++;
      if (finding.score > stats.byDimension[code].maxScore) {
        stats.byDimension[code].maxScore = finding.score;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        task,
        findings,
        stats,
      },
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务详情失败' },
      { status: 500 }
    );
  }
}

// 删除任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 先检查任务是否存在
    const [task] = await db.select()
      .from(documentScanTasks)
      .where(eq(documentScanTasks.id, id));

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 删除关联的风险发现
    await db.delete(documentScanFindings)
      .where(eq(documentScanFindings.taskId, id));

    // 删除任务
    await db.delete(documentScanTasks)
      .where(eq(documentScanTasks.id, id));

    return NextResponse.json({
      success: true,
      message: '任务已删除',
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    return NextResponse.json(
      { success: false, error: '删除任务失败' },
      { status: 500 }
    );
  }
}
