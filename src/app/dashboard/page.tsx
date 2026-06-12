'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, Shield, Eye, Clock, TrendingUp, BarChart3, RefreshCw, XCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface StatsData {
  totalDetections: number;
  todayDetections: number;
  actionDistribution: {
    allow: number;
    warn: number;
    block: number;
    mask: number;
    rewrite: number;
  };
  riskDistribution: Record<string, number>;
  avgScore: number | null;
  avgLatency: number | null;
  blockRate: string;
  trend: Array<{ date: string; count: number }>;
}

interface InterceptionItem {
  id: string;
  inputText: string;
  action: string;
  inputScore: number | null;
  createdAt: string;
  findings: Array<{
    dimension: string;
    dimensionName: string;
    score: number;
    severity: string;
  }>;
}

const dimensionLabels: Record<string, string> = {
  malicious_code: '恶意代码',
  violence_hate: '暴力仇恨',
  illegal_content: '非法内容',
  spam_detection: '垃圾信息',
  ad_detection: '广告检测',
  prompt_injection: '提示词注入',
  sensitive_compliance: '敏感合规',
  adult_content: '成人内容',
  self_harm: '自我伤害',
  credential_secret_leak: '密钥泄露',
  fraud_scam: '诈骗欺诈',
  misinformation: '虚假信息',
  copyright_risk: '版权风险',
  business_sensitive: '商业敏感',
  output_leak: '输出泄露',
  pii_leak: 'PII泄露',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [interceptions, setInterceptions] = useState<InterceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行获取统计数据和拦截列表
      const [statsRes, interceptionsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/history?action=block&limit=10')
      ]);
      
      const statsResult = await statsRes.json();
      const interceptionsResult = await interceptionsRes.json();
      
      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        setError(statsResult.error || '获取统计数据失败');
      }
      
      if (interceptionsResult.success && interceptionsResult.data) {
        setInterceptions(interceptionsResult.data.sessions || []);
      }
    } catch (err) {
      setError('加载数据失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const totalActions = Object.values(stats.actionDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">检测看板</h1>
        <p className="text-muted-foreground mt-2">安全护栏运行状态与风险分析</p>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总检测次数</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDetections}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今日 {stats.todayDetections} 次
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">拦截率</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blockRate}</div>
            <p className="text-xs text-muted-foreground mt-1">
              阻断 {stats.actionDistribution.block} 次
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均风险分</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgScore !== null ? stats.avgScore.toFixed(1) : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              分数范围 0-100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均延迟</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgLatency !== null ? `${stats.avgLatency.toFixed(0)}ms` : '--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              检测响应时间
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 处理动作分布 & 风险维度分布 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 处理动作分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              处理动作分布
            </CardTitle>
            <CardDescription>各类处理动作的执行次数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { key: 'allow', label: '放行', color: 'bg-green-500', icon: CheckCircle },
                { key: 'block', label: '拦截', color: 'bg-red-500', icon: AlertCircle },
                { key: 'warn', label: '警告', color: 'bg-yellow-500', icon: AlertTriangle },
                { key: 'mask', label: '脱敏', color: 'bg-blue-500', icon: Eye },
              ].map(({ key, label, color, icon: Icon }) => {
                const count = stats.actionDistribution[key as keyof typeof stats.actionDistribution] || 0;
                const percentage = totalActions > 0 ? (count / totalActions) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-20">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="w-16 text-right text-sm text-muted-foreground">
                      {count} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 风险维度分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              风险维度分布
            </CardTitle>
            <CardDescription>各维度风险检出次数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {Object.entries(stats.riskDistribution)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([dimension, count]) => (
                  <div key={dimension} className="flex items-center justify-between">
                    <span className="text-sm">{dimensionLabels[dimension] || dimension}</span>
                    <Badge variant="outline">{count} 次</Badge>
                  </div>
                ))}
              {Object.values(stats.riskDistribution).every(c => c === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  暂无风险检出记录
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>检测趋势</CardTitle>
          <CardDescription>最近7天检测次数变化</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => {
                    const d = new Date(date + 'T00:00:00');
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  allowDecimals={false}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelFormatter={(date) => {
                    const d = new Date(date + 'T00:00:00');
                    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                  formatter={(value: number) => [`${value} 次`, '检测次数']}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  fill="url(#colorCount)"
                  name="检测次数"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 实时拦截列表 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                实时拦截列表
              </CardTitle>
              <CardDescription>最近被拦截的请求</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {interceptions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无拦截记录
            </div>
          ) : (
            <div className="space-y-3">
              {interceptions.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          已拦截
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                        {item.inputScore !== null && (
                          <Badge variant="outline" className="text-xs">
                            风险分: {item.inputScore}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm truncate" title={item.inputText}>
                        {item.inputText}
                      </p>
                      {item.findings && item.findings.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.findings.slice(0, 3).map((finding, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {dimensionLabels[finding.dimension] || finding.dimensionName || finding.dimension}
                            </Badge>
                          ))}
                          {item.findings.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.findings.length - 3} 更多
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
