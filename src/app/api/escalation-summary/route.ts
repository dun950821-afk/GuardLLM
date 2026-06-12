import { NextRequest, NextResponse } from 'next/server';
import { handlePolicyEscalationOnce } from '@/lib/policy/escalation-service';

/**
 * 策略升级汇总 API
 * 一次请求（输入+输出）只算一次警告
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      sessionId,
      policyId,
      inputHasRisk,
      outputHasRisk
    } = body;

    if (!sessionId || !policyId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 输入或输出有风险，就触发一次警告计数
    const hasRisk = inputHasRisk || outputHasRisk;

    const result = await handlePolicyEscalationOnce(
      userId || 'anonymous',
      sessionId,
      hasRisk,
      policyId
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[策略升级汇总] 处理失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '处理失败' },
      { status: 500 }
    );
  }
}