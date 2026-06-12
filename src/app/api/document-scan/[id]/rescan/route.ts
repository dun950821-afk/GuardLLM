/**
 * 重新检测 API
 * POST /api/document-scan/:taskId/rescan
 * 重新执行文档检测（使用已解析的文本）
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentScanTasks, documentScanFindings } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { createChunks, type DocumentChunk } from '@/lib/document/parser';
import { detectDocument } from '@/lib/document/detector';
import { highlightEvidenceInHtml, sanitizeHighlightedHtml, type FindingForHighlight } from '@/lib/document/highlighter';

// Node.js 运行时配置（必须）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // 查询任务
    const [task] = await db.select()
      .from(documentScanTasks)
      .where(eq(documentScanTasks.id, id))
      .limit(1);

    if (!task) {
      return NextResponse.json(
        { success: false, error: '任务不存在' },
        { status: 404 }
      );
    }

    // 检查是否有已解析的文本
    if (!task.extractedText) {
      return NextResponse.json(
        { success: false, error: '无法重新检测：未找到已解析的文本内容' },
        { status: 400 }
      );
    }

    // 更新任务状态
    await db.update(documentScanTasks)
      .set({
        status: 'detecting',
        statusMessage: '正在重新检测...',
        updatedAt: new Date(),
      })
      .where(eq(documentScanTasks.id, id));

    // 删除旧的检测结果
    await db.delete(documentScanFindings)
      .where(eq(documentScanFindings.taskId, id));

    // 使用已解析的文本重新切片
    const chunks: DocumentChunk[] = task.parsedChunks || createChunks(task.extractedText);
    
    // 获取 plainLines 用于精确定位
    const plainLines = task.plainLines || [];

    // 重新检测
    const result = await detectDocument({
      taskId: id,
      chunks,
      policyId: task.policyId,
      fileName: task.fileName,
      plainLines,
    });

    // 重新生成高亮 HTML
    let highlightedPreviewHtml = task.previewHtml;
    if (task.previewHtml && result.findings.length > 0) {
      // 从原始预览 HTML 开始（需要存储原始的，或者从当前中提取）
      // 这里使用原始 previewHtml 重新生成高亮
      const findingsForHighlight: FindingForHighlight[] = result.findings.map(f => ({
        id: f.id,
        evidence: f.evidence,
        maskedEvidence: f.maskedEvidence,
        severity: f.severity,
        locationStatus: f.locationStatus,
      }));

      // 使用原始文本生成基础 HTML（如果没有原始 previewHtml）
      const baseHtml = task.previewHtml || `<pre>${task.extractedText}</pre>`;
      
      const highlightResult = highlightEvidenceInHtml({
        previewHtml: baseHtml,
        findings: findingsForHighlight,
      });

      highlightedPreviewHtml = sanitizeHighlightedHtml(highlightResult.highlightedHtml);

      // 更新高亮 HTML
      await db.update(documentScanTasks)
        .set({
          previewHtml: highlightedPreviewHtml,
          updatedAt: new Date(),
        })
        .where(eq(documentScanTasks.id, id));
    }

    return NextResponse.json({
      success: true,
      data: {
        taskId: id,
        status: 'completed',
        findingsCount: result.findings.length,
        overallScore: result.overallScore,
        finalAction: result.finalAction,
      },
      message: '重新检测完成',
    });
  } catch (error) {
    console.error('重新检测失败:', error);
    
    // 更新任务状态为失败
    await db.update(documentScanTasks)
      .set({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : '重新检测失败',
        statusMessage: '重新检测失败',
        updatedAt: new Date(),
      })
      .where(eq(documentScanTasks.id, id));
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '重新检测失败' },
      { status: 500 }
    );
  }
}
