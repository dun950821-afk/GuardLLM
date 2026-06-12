import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const workflowType = searchParams.get('workflowType');
    const sessionId = searchParams.get('sessionId');

    const supabase = getDb();
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('agent_traces')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (workflowType) {
      query = query.eq('workflow_name', workflowType);
    }
    if (sessionId) {
      query = query.eq('record_id', sessionId);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: '获取日志失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        items: data || [],
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('获取Agent日志失败:', error);
    return NextResponse.json({ success: false, error: '获取日志失败' }, { status: 500 });
  }
}
