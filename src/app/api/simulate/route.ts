import { NextRequest, NextResponse } from 'next/server';
import { detectWithDynamicRules, getDefaultPolicyId } from '@/lib/detection/dynamic-engine';
import { initDefaultPolicy } from '@/lib/detection/init-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, policyId, direction = 'input' } = body;

    if (!text) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数: text' },
        { status: 400 }
      );
    }

    // 获取策略ID
    let targetPolicyId = policyId;
    if (!targetPolicyId) {
      targetPolicyId = await getDefaultPolicyId();
    }

    // 如果没有策略，尝试初始化默认策略
    if (!targetPolicyId) {
      console.log('未找到默认策略，尝试初始化...');
      await initDefaultPolicy();
      targetPolicyId = await getDefaultPolicyId();
    }

    if (!targetPolicyId) {
      return NextResponse.json(
        { 
          success: false, 
          error: '未找到策略配置。请先访问 /api/init-database 初始化数据库，或在检测维度管理页面配置检测规则。' 
        },
        { status: 404 }
      );
    }

    // 模拟完整检测链路
    const steps: Array<{
      step: number;
      name: string;
      status: string;
      content: unknown;
      duration: number;
    }> = [];

    const totalStartTime = Date.now();

    // Step 1: 用户输入
    steps.push({
      step: 1,
      name: '用户输入',
      status: 'completed',
      content: text,
      duration: 0,
    });

    // Step 2: 输入护栏检测
    const inputStartTime = Date.now();
    const inputDetection = await detectWithDynamicRules(text, targetPolicyId, 'input');
    steps.push({
      step: 2,
      name: '输入护栏检测',
      status: 'completed',
      content: {
        action: inputDetection.action,
        score: inputDetection.overallScore,
        findings: inputDetection.findings.map(f => ({
          dimension: f.dimension,
          dimensionName: f.dimensionName,
          score: f.score,
          matchedRules: f.matchedRules,
          evidence: f.evidence,
        })),
      },
      duration: Date.now() - inputStartTime,
    });

    // 如果输入被拦截，跳过后续步骤
    if (inputDetection.action === 'block') {
      steps.push({
        step: 3,
        name: 'Target LLM生成',
        status: 'skipped',
        content: '输入已拦截，跳过模型调用',
        duration: 0,
      });
      steps.push({
        step: 4,
        name: '输出护栏检测',
        status: 'skipped',
        content: null,
        duration: 0,
      });
      steps.push({
        step: 5,
        name: '最终响应',
        status: 'completed',
        content: `[已拦截] ${inputDetection.summary || '检测到风险内容'}`,
        duration: Date.now() - totalStartTime,
      });

      return NextResponse.json({
        success: true,
        data: {
          sessionId: null,
          steps,
          summary: {
            inputAction: inputDetection.action,
            inputScore: inputDetection.overallScore,
            outputAction: null,
            outputScore: null,
            finalAction: 'block',
            totalTime: Date.now() - totalStartTime,
          },
        },
      });
    }

    // Step 3: Target LLM生成（模拟）
    steps.push({
      step: 3,
      name: 'Target LLM生成',
      status: 'completed',
      content: '[模拟响应] 这是一个模拟的AI响应内容。',
      duration: 50,
    });

    // Step 4: 输出护栏检测
    const outputStartTime = Date.now();
    const outputDetection = await detectWithDynamicRules('[模拟响应] 这是一个模拟的AI响应内容。', targetPolicyId, 'output');
    steps.push({
      step: 4,
      name: '输出护栏检测',
      status: 'completed',
      content: {
        action: outputDetection.action,
        score: outputDetection.overallScore,
        findings: outputDetection.findings.map(f => ({
          dimension: f.dimension,
          dimensionName: f.dimensionName,
          score: f.score,
          matchedRules: f.matchedRules,
          evidence: f.evidence,
        })),
      },
      duration: Date.now() - outputStartTime,
    });

    // Step 5: 最终响应
    const finalAction = outputDetection.action === 'block' ? 'block' : inputDetection.action;
    steps.push({
      step: 5,
      name: '最终响应',
      status: 'completed',
      content: `[${finalAction === 'allow' ? '放行' : finalAction === 'warn' ? '警告' : '拦截'}] 检测完成`,
      duration: Date.now() - totalStartTime,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: null,
        steps,
        summary: {
          inputAction: inputDetection.action,
          inputScore: inputDetection.overallScore,
          outputAction: outputDetection.action,
          outputScore: outputDetection.overallScore,
          finalAction,
          totalTime: Date.now() - totalStartTime,
        },
      },
    });
  } catch (error) {
    console.error('模拟检测失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '模拟检测服务异常，请检查数据库连接或联系管理员' 
      },
      { status: 500 }
    );
  }
}
