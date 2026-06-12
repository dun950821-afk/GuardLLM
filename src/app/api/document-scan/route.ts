/**
 * 文档扫描任务 API
 * POST: 上传文档并创建检测任务（同步处理）
 * GET: 获取任务列表
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documentScanTasks } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { parseDocument, createChunks, isSupported, getFileCategory, needsOcr, type DocumentChunk, type PlainLine } from '@/lib/document/parser';
import { detectDocument, type DocumentFinding } from '@/lib/document/detector';
import { highlightEvidenceInHtml, sanitizeHighlightedHtml, type FindingForHighlight } from '@/lib/document/highlighter';

// Node.js 运行时配置（必须）
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ============================================
// GET: 获取任务列表
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const policyId = searchParams.get('policyId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 构建查询条件
    const conditions = [];
    if (policyId) {
      conditions.push(eq(documentScanTasks.policyId, policyId));
    }
    if (status) {
      conditions.push(eq(documentScanTasks.status, status));
    }

    // 执行查询
    const tasks = await db.select()
      .from(documentScanTasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documentScanTasks.createdAt))
      .limit(limit)
      .offset(offset);

    // 获取总数
    const countResult = await db.select({ count: sql`count(*)` })
      .from(documentScanTasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + tasks.length < total,
      },
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取任务列表失败' },
      { status: 500 }
    );
  }
}

// ============================================
// POST: 上传文档并创建检测任务（同步处理）
// ============================================
export async function POST(request: NextRequest) {
  let taskId: string | null = null;
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const policyId = formData.get('policyId') as string;
    const ocrEnabled = formData.get('ocrEnabled') === 'true';
    const ocrModel = formData.get('ocrModel') as string | null;

    // 参数校验
    if (!file) {
      return NextResponse.json(
        { success: false, error: '请上传文件' },
        { status: 400 }
      );
    }

    if (!policyId) {
      return NextResponse.json(
        { success: false, error: '请选择检测策略' },
        { status: 400 }
      );
    }

    // 获取文件类型
    const fileName = file.name;
    const fileType = fileName.split('.').pop()?.toLowerCase() || '';
    const fileCategory = getFileCategory(fileType);

    // 检查文件类型是否支持
    if (!isSupported(fileType)) {
      return NextResponse.json(
        { success: false, error: `不支持的文件类型: ${fileType}` },
        { status: 400 }
      );
    }

    // 图片文件必须开启 OCR
    if (fileCategory === 'image') {
      if (!ocrModel) {
        return NextResponse.json(
          { success: false, error: '图片文件必须使用 OCR 识别文字内容，请先选择 OCR 模型' },
          { status: 400 }
        );
      }
    }

    // 创建任务记录
    const [task] = await db.insert(documentScanTasks).values({
      fileName,
      fileType,
      fileSize: file.size,
      policyId,
      status: 'pending',
      statusMessage: '任务已创建，等待处理',
      ocrEnabled: fileCategory === 'image' ? true : ocrEnabled,
    }).returning();
    
    taskId = task.id;

    // 同步处理文档（不使用 fire-and-forget）
    const result = await processDocument(taskId, file, policyId, fileCategory, ocrModel);

    return NextResponse.json({
      success: true,
      data: result,
      message: '文档检测完成',
    });
  } catch (error) {
    console.error('上传文档失败:', error);
    
    // 更新任务状态为失败
    if (taskId) {
      await updateTaskError(taskId, error instanceof Error ? error.message : '处理失败');
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '上传文档失败' },
      { status: 500 }
    );
  }
}

// ============================================
// 处理文档（同步）
// ============================================
async function processDocument(
  taskId: string,
  file: File,
  policyId: string,
  fileCategory: 'text' | 'document' | 'image' | 'ebook' | 'unknown',
  ocrModel?: string | null
): Promise<{ taskId: string; status: string; findingsCount: number }> {
  // 阶段1：解析中
  await db.update(documentScanTasks)
    .set({
      status: 'parsing',
      statusMessage: '正在解析文档内容...',
      updatedAt: new Date(),
    })
    .where(eq(documentScanTasks.id, taskId));

  // 解析文档内容
  let extractedText = '';
  let previewHtml: string | undefined;
  let plainLines: PlainLine[] = [];
  let chunks: DocumentChunk[] = [];
  let parseMeta: any = {};

  try {
    if (fileCategory === 'image') {
      // 图片必须使用 OCR
      if (!ocrModel) {
        throw new Error('图片文件需要 OCR 模型才能识别文字');
      }
      extractedText = await performOcr(file, ocrModel);
      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('OCR 未能识别到文字内容，请确认图片包含清晰的文字');
      }
      plainLines = buildPlainLines(extractedText);
      chunks = createChunks(extractedText);
      previewHtml = `<div class="ocr-preview"><pre>${escapeHtml(extractedText)}</pre></div>`;
      parseMeta = { hasTables: false, hasImages: true, totalLines: plainLines.length, totalChars: extractedText.length };
      
    } else {
      // 文本和文档类型使用统一的解析器
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const parsed = await parseDocument(buffer, file.name.split('.').pop()?.toLowerCase() || '', file.name);
      
      extractedText = parsed.extractedText;
      previewHtml = parsed.previewHtml;
      plainLines = parsed.plainLines;
      chunks = createChunks(extractedText);
      parseMeta = {
        hasTables: parsed.metadata.hasTables,
        hasImages: parsed.metadata.hasImages,
        totalLines: plainLines.length,
        totalChars: extractedText.length,
      };

      if (!extractedText || extractedText.trim().length === 0) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          throw new Error('PDF 文档未检测到文字内容，可能是扫描件。如需识别扫描件，请将其转换为图片后上传并启用 OCR');
        }
        throw new Error('无法从文档中提取文本内容，请确认文档包含可识别的文字');
      }
    }

    // 保存解析结果
    await db.update(documentScanTasks)
      .set({
        extractedText,
        previewHtml,
        plainLines,
        parsedChunks: chunks,
        parseMeta,
        updatedAt: new Date(),
      })
      .where(eq(documentScanTasks.id, taskId));

  } catch (error) {
    await updateTaskError(taskId, error instanceof Error ? error.message : '文档解析失败');
    throw error;
  }

  // 阶段2：检测中
  await db.update(documentScanTasks)
    .set({
      status: 'detecting',
      statusMessage: `文档解析完成，正在检测 ${chunks.length} 个文本片段...`,
      updatedAt: new Date(),
    })
    .where(eq(documentScanTasks.id, taskId));

  // 执行检测
  try {
    const result = await detectDocument({
      taskId,
      chunks,
      policyId,
      fileName: file.name,
      plainLines, // 传递 plainLines 用于精确定位
    });

    // 生成高亮 HTML
    let highlightedPreviewHtml = previewHtml;
    if (previewHtml && result.findings.length > 0) {
      const findingsForHighlight: FindingForHighlight[] = result.findings.map(f => ({
        id: f.id,
        evidence: f.evidence,
        maskedEvidence: f.maskedEvidence,
        severity: f.severity,
        locationStatus: f.locationStatus,
      }));

      const highlightResult = highlightEvidenceInHtml({
        previewHtml,
        findings: findingsForHighlight,
      });

      highlightedPreviewHtml = sanitizeHighlightedHtml(highlightResult.highlightedHtml);

      // 更新高亮 HTML 到数据库
      await db.update(documentScanTasks)
        .set({
          previewHtml: highlightedPreviewHtml,
          updatedAt: new Date(),
        })
        .where(eq(documentScanTasks.id, taskId));
    }

    return {
      taskId,
      status: 'completed',
      findingsCount: result.findings.length,
    };
  } catch (error) {
    await updateTaskError(taskId, error instanceof Error ? error.message : '检测失败');
    throw error;
  }
}

// ============================================
// 构建纯文本行（用于图片 OCR 场景）
// ============================================
function buildPlainLines(text: string): PlainLine[] {
  const lines: PlainLine[] = [];
  const textLines = text.split('\n');
  let currentOffset = 0;

  for (let i = 0; i < textLines.length; i++) {
    const lineText = textLines[i];
    lines.push({
      lineNumber: i + 1,
      text: lineText,
      startOffset: currentOffset,
      endOffset: currentOffset + lineText.length,
    });
    currentOffset += lineText.length + 1; // +1 for newline
  }

  return lines;
}

// ============================================
// OCR 识别
// ============================================
async function performOcr(file: File, modelId: string): Promise<string> {
  try {
    const { LLMClient, Config } = await import('coze-coding-dev-sdk');
    
    const config = new Config();
    const client = new LLMClient(config);
    
    // 将文件转换为 base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/png';
    const imageUrl = `data:${mimeType};base64,${base64}`;
    
    // 调用多模态模型
    const response = await client.invoke(
      [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl },
            },
            {
              type: 'text',
              text: '请识别图片中的所有可见文字，保持原始顺序输出。不要总结，不要改写，不要解释，只输出识别到的文字。如果图片中没有文字，返回空字符串。',
            },
          ],
        },
      ],
      { model: modelId }
    );
    
    return response.content || '';
  } catch (error) {
    console.error('OCR 识别失败:', error);
    throw new Error(`OCR 识别失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ============================================
// HTML 转义
// ============================================
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================
// 更新任务错误状态
// ============================================
async function updateTaskError(taskId: string, errorMessage: string): Promise<void> {
  try {
    await db.update(documentScanTasks)
      .set({
        status: 'failed',
        errorMessage,
        statusMessage: '处理失败',
        updatedAt: new Date(),
      })
      .where(eq(documentScanTasks.id, taskId));
  } catch (error) {
    console.error('更新任务错误状态失败:', error);
  }
}
