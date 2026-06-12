/**
 * 策略状态API
 * 用于获取、管理和重置用户策略状态
 */

import { NextRequest, NextResponse } from 'next/server';
import {
	getUserPolicyState,
	resetSessionPolicyState,
	getEffectivePolicyId,
} from '@/lib/policy/escalation-service';

/**
 * GET - 获取用户当前策略状态
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get('userId') || 'anonymous';
		const sessionId = searchParams.get('sessionId');
		const defaultPolicyId = searchParams.get('defaultPolicyId');

		if (!sessionId) {
			return NextResponse.json(
				{ success: false, error: '缺少sessionId参数' },
				{ status: 400 }
			);
		}

		// 获取用户策略状态
		const state = await getUserPolicyState(userId, sessionId);

		// 获取当前生效策略
		let effectivePolicyId = defaultPolicyId || '';
		if (state) {
			effectivePolicyId = state.currentPolicyId;
		}

		return NextResponse.json({
			success: true,
			data: {
				state,
				effectivePolicyId,
				hasState: !!state,
			},
		});
	} catch (error: any) {
		console.error('[策略状态API] GET失败:', error);
		return NextResponse.json(
			{ success: false, error: error.message || '获取策略状态失败' },
			{ status: 500 }
		);
	}
}

/**
 * POST - 重置用户策略状态（用于会话结束/刷新页面）
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, sessionId, action } = body;

		if (!sessionId) {
			return NextResponse.json(
				{ success: false, error: '缺少sessionId参数' },
				{ status: 400 }
			);
		}

		const effectiveUserId = userId || 'anonymous';

		if (action === 'reset') {
			// 重置会话策略状态
			const result = await resetSessionPolicyState(effectiveUserId, sessionId);
			return NextResponse.json({
				success: result.success,
				message: result.success ? '策略状态已重置' : '重置失败',
			});
		}

		return NextResponse.json(
			{ success: false, error: '未知操作类型' },
			{ status: 400 }
		);
	} catch (error: any) {
		console.error('[策略状态API] POST失败:', error);
		return NextResponse.json(
			{ success: false, error: error.message || '操作失败' },
			{ status: 500 }
		);
	}
}