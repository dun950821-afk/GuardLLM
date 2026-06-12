import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { llmProviders } from '@/lib/db';
import { and, eq } from 'drizzle-orm';

/**
 * 获取支持 OCR 的模型列表
 * 从模型供应商管理中获取 useCase='ocr' 的模型
 */
export async function GET() {
  try {
    // 从数据库获取 useCase='ocr' 且已启用的模型
    const ocrProviders = await db
      .select()
      .from(llmProviders)
      .where(
        and(
          eq(llmProviders.useCase, 'ocr'),
          eq(llmProviders.isEnabled, true)
        )
      );

    const models = ocrProviders.map((provider) => ({
      id: provider.id,
      modelId: provider.defaultModel || provider.name,
      name: provider.displayName,
      providerName: provider.name,
      description: `模型: ${provider.defaultModel || '未指定'}`,
      baseUrl: provider.baseUrl,
      recommended: provider.isDefaultTarget,
    }));

    return NextResponse.json({
      success: true,
      data: {
        models,
        hasOcrModels: models.length > 0,
        defaultModelId: models.find((m) => m.recommended)?.id || models[0]?.id || null,
      },
    });
  } catch (error) {
    console.error('获取 OCR 模型列表失败:', error);
    return NextResponse.json(
      { success: false, error: '获取 OCR 模型列表失败' },
      { status: 500 }
    );
  }
}
