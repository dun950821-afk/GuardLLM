import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET - 导出检测记录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const riskType = searchParams.get('riskType');
    const action = searchParams.get('action');

    const client = getDb();

    let query = client
      .from('detection_sessions')
      .select(`
        *,
        records:detection_records(
          *,
          findings:risk_findings(*)
        )
      `)
      .order('createdAt', { ascending: false });

    // 日期筛选
    if (startDate) {
      query = query.gte('createdAt', startDate);
    }
    if (endDate) {
      query = query.lte('createdAt', endDate);
    }

    // 动作筛选
    if (action) {
      query = query.eq('finalAction', action);
    }

    const { data: sessions, error } = await query.limit(1000);

    if (error) {
      throw error;
    }

    // 风险类型筛选（需要在应用层过滤）
    let filteredSessions = sessions || [];
    if (riskType) {
      filteredSessions = filteredSessions.filter((session: any) => 
        session.records?.some((record: any) =>
          record.findings?.some((finding: any) => finding.dimension === riskType)
        )
      );
    }

    if (format === 'csv') {
      // 生成 CSV
      const headers = [
        'ID',
        '用户输入',
        '输入动作',
        '输入风险分',
        '输出动作',
        '输出风险分',
        '最终动作',
        '策略ID',
        '创建时间',
      ];

      const rows = filteredSessions.map((session: any) => [
        session.id,
        `"${(session.userPrompt || '').replace(/"/g, '""')}"`,
        session.inputAction || '',
        session.inputScore || '',
        session.outputAction || '',
        session.outputScore || '',
        session.finalAction || '',
        session.policyId || '',
        session.createdAt || '',
      ]);

      const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="detection_records_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'markdown') {
      // 生成 Markdown 报告
      const report = generateMarkdownReport(filteredSessions);
      
      return new NextResponse(report, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="detection_report_${new Date().toISOString().split('T')[0]}.md"`,
        },
      });
    } else {
      // 默认 JSON
      return NextResponse.json({
        success: true,
        data: filteredSessions,
        exportedAt: new Date().toISOString(),
        totalCount: filteredSessions.length,
      });
    }
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { success: false, error: '导出失败' },
      { status: 500 }
    );
  }
}

function generateMarkdownReport(sessions: any[]): string {
  const total = sessions.length;
  const blocked = sessions.filter(s => s.finalAction === 'block').length;
  const warned = sessions.filter(s => s.finalAction === 'warn').length;
  const allowed = sessions.filter(s => s.finalAction === 'allow').length;

  const avgScore = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + (s.inputScore || 0), 0) / sessions.length).toFixed(1)
    : '0';

  let markdown = `# 大模型安全护栏检测报告

## 概览

- **报告生成时间**: ${new Date().toLocaleString('zh-CN')}
- **总检测次数**: ${total}
- **拒绝次数**: ${blocked} (${total > 0 ? ((blocked / total) * 100).toFixed(1) : 0}%)
- **警告次数**: ${warned} (${total > 0 ? ((warned / total) * 100).toFixed(1) : 0}%)
- **放行次数**: ${allowed} (${total > 0 ? ((allowed / total) * 100).toFixed(1) : 0}%)
- **平均风险分**: ${avgScore}

## 风险分布

| 风险维度 | 命中次数 |
|---------|---------|
`;

  // 统计风险维度分布
  const dimensionCounts: Record<string, number> = {};
  sessions.forEach(session => {
    session.records?.forEach((record: any) => {
      record.findings?.forEach((finding: any) => {
        if (finding.score > 30) {
          dimensionCounts[finding.dimension] = (dimensionCounts[finding.dimension] || 0) + 1;
        }
      });
    });
  });

  const dimensionNames: Record<string, string> = {
    prompt_injection: '提示词注入',
    pii_leak: 'PII泄露',
    malicious_code: '恶意代码',
    violence_hate: '暴力仇恨',
    illegal_content: '非法内容',
  };

  Object.entries(dimensionCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([dimension, count]) => {
      markdown += `| ${dimensionNames[dimension] || dimension} | ${count} |\n`;
    });

  markdown += `
## 最近检测记录

| 时间 | 用户输入 | 动作 | 风险分 |
|------|---------|------|--------|
`;

  sessions.slice(0, 20).forEach(session => {
    const inputPreview = (session.userPrompt || '').substring(0, 50);
    const actionEmoji = session.finalAction === 'block' ? '❌' : 
                        session.finalAction === 'warn' ? '⚠️' : '✅';
    markdown += `| ${new Date(session.createdAt).toLocaleString('zh-CN')} | ${inputPreview}... | ${actionEmoji} ${session.finalAction} | ${session.inputScore || '-'} |\n`;
  });

  markdown += `
## 详细记录

`;

  sessions.slice(0, 10).forEach((session, idx) => {
    markdown += `### ${idx + 1}. ${session.userPrompt?.substring(0, 30) || '无标题'}...

**用户输入**: ${session.userPrompt || '-'}

**输入检测结果**:
- 动作: ${session.inputAction || '-'}
- 风险分: ${session.inputScore || '-'}
- 摘要: ${session.inputSummary || '-'}

`;

    if (session.outputAction) {
      markdown += `**输出检测结果**:
- 动作: ${session.outputAction}
- 风险分: ${session.outputScore || '-'}
- 摘要: ${session.outputSummary || '-'}

`;
    }

    markdown += `**最终动作**: ${session.finalAction}

---

`;
  });

  return markdown;
}
