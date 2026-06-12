/**
 * 重新检测 API
 * POST: 使用已保存的文档内容重新执行检测
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentScanTasks, documentScanFindings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { detectDocument } from '@/lib/document/detector';
import type { DocumentChunk } from '@/lib/document/parser';

export async function POST(
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

    // 检查是否有解析后的内容
    if (!task.extractedText && (!task.parsedChunks || task.parsedChunks.length === 0)) {
      return NextResponse.json(
        { success: false, error: '没有可用的文档内容，请重新上传文件' },
        { status: 400 }
      );
    }

    // 删除旧的检测结果
    await db.delete(documentScanFindings)
      .where(eq(documentScanFindings.taskId, id));

    // 重置任务状态
    await db.update(documentScanTasks)
      .set({
        status: 'detecting',
        statusMessage: '正在重新检测...',
        overallScore: null,
        finalAction: null,
        findingsCount: 0,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(documentScanTasks.id, id));

    // 使用已保存的 chunks 重新检测
    const chunks: DocumentChunk[] = task.parsedChunks && task.parsedChunks.length > 0 
      ? task.parsedChunks.map(chunk => ({
          index: chunk.index,
          content: chunk.content || '',
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        }))
      : [{ index: 0, content: task.extractedText || '', startLine: 1, endLine: 1, startOffset: 0, endOffset: task.extractedText?.length || 0 }];

    // 异步执行检测
    detectDocument({
      taskId: id,
      chunks,
      policyId: task.policyId,
      fileName: task.fileName,
    }).catch(error => {
      console.error('重新检测失败:', error);
      db.update(documentScanTasks)
        .set({
          status: 'failed',
          errorMessage: error.message || '检测失败',
          statusMessage: '检测失败',
          updatedAt: new Date(),
        })
        .where(eq(documentScanTasks.id, id));
    });

    return NextResponse.json({
      success: true,
      message: '已开始重新检测',
    });
  } catch (error) {
    console.error('重新检测失败:', error);
    return NextResponse.json(
      { success: false, error: '重新检测失败' },
      { status: 500 }
    );
  }
}
