'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
  Target,
  GitMerge,
  Eye,
  Shield,
  AlertCircle
} from 'lucide-react';

// 裁判模型结果类型
export interface JudgeModelResultData {
  used: boolean;
  score?: number;
  confidence?: number;
  suggestedAction?: 'allow' | 'warn' | 'block';
  reason?: string;
  latencyMs?: number;
  error?: string;
}

// 决策追踪类型
export interface DecisionTraceData {
  ruleScore: number;
  ruleAction: 'allow' | 'warn' | 'block';
  judgeScore?: number;
  judgeAction?: 'allow' | 'warn' | 'block';
  decisionMode: string;
  finalScore: number;
  finalAction: 'allow' | 'warn' | 'block';
  reasoning: string;
}

// 维度判断结果类型
export interface JudgeDimensionResultItem {
  dimensionCode: string;
  dimensionName: string;
  hasRisk: boolean;
  score: number;
  confidence: number;
  reason: string;
}

// 规则复核类型
export interface RuleReviewData {
  agreeWithRules: boolean;
  falsePositiveSuspected: boolean;
  falseNegativeSuspected: boolean;
  explanation: string;
}

interface JudgeModelResultCardProps {
  judgeModelResult?: JudgeModelResultData;
  decisionTrace?: DecisionTraceData;
  dimensionResults?: JudgeDimensionResultItem[];
  ruleReview?: RuleReviewData;
  defaultExpanded?: boolean;
  displayMode?: 'compact' | 'standard' | 'full';
}

// 决策模式名称映射
const DECISION_MODE_NAMES: Record<string, string> = {
  conservative: '保守模式',
  balanced: '平衡模式',
  review_only: '复核模式',
};

// 决策模式说明
const DECISION_MODE_DESC: Record<string, string> = {
  conservative: '取规则检测和裁判模型的更高风险结果',
  balanced: '规则检测和裁判模型结果加权融合',
  review_only: '裁判模型只提供建议，不改变最终动作',
};

// 动作名称映射
const ACTION_NAMES: Record<string, string> = {
  allow: '放行',
  warn: '警告',
  block: '拦截',
};

// 动作颜色映射
const getActionColor = (action: string) => {
  switch (action) {
    case 'block':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warn':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-green-100 text-green-800 border-green-200';
  }
};

// 评分颜色
const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-red-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-green-600';
};

// 评分条颜色
const getScoreBarColor = (score: number) => {
  if (score >= 70) return 'bg-red-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-green-500';
};

// 动画数字组件
function AnimatedNumber({ value, duration = 300 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current !== value) {
      const startValue = previousValue.current;
      const diff = value - startValue;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + diff * easeProgress);
        setDisplayValue(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          previousValue.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  return <>{displayValue}</>;
}

export default function JudgeModelResultCard({
  judgeModelResult,
  decisionTrace,
  dimensionResults,
  ruleReview,
  defaultExpanded = false,
  displayMode = 'standard',
}: JudgeModelResultCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || displayMode === 'full');
  const [isAnimating, setIsAnimating] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // 判断是否可以展开（compact 和 standard 模式可以切换）
  const canExpand = displayMode !== 'full';
  // 判断是否显示详细信息（full 模式默认显示，或者已展开）
  const showDetails = displayMode === 'full' || expanded;

  // 处理展开/折叠动画
  const handleToggle = () => {
    if (!canExpand) return;

    if (!expanded) {
      // 展开：先设置高度为0，然后过渡到实际高度
      setContentHeight(0);
      setIsAnimating(true);
      setExpanded(true);

      requestAnimationFrame(() => {
        if (contentRef.current) {
          setContentHeight(contentRef.current.scrollHeight);
        }
      });
    } else {
      // 折叠：先设置当前高度，然后过渡到0
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
      setIsAnimating(true);

      requestAnimationFrame(() => {
        setContentHeight(0);
      });
    }
  };

  // 动画结束处理
  const handleTransitionEnd = () => {
    if (!expanded) {
      setIsAnimating(false);
    } else {
      setIsAnimating(false);
      setContentHeight(undefined);
    }
  };

  // 未调用裁判模型
  if (!judgeModelResult?.used) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 text-gray-500">
          <Bot className="h-5 w-5" />
          <span className="text-sm font-medium">裁判模型未启用或未触发</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          当前检测仅使用规则引擎，未调用裁判模型进行语义增强判断
        </p>
      </div>
    );
  }

  // 调用失败
  if (judgeModelResult.error) {
    return (
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <div className="flex items-center gap-2 text-yellow-700">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">裁判模型调用失败</span>
        </div>
        <p className="text-xs text-yellow-600 mt-1">
          {judgeModelResult.error}，已降级使用规则检测结果
        </p>
      </div>
    );
  }

  // 渲染紧凑模式的评分对比
  const renderCompactScoreComparison = () => (
    <div className="flex items-center gap-3">
      {/* 规则检测 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
        <Shield className="h-4 w-4 text-blue-600" />
        <span className="text-xs text-blue-600">规则</span>
        <span className="text-lg font-bold text-blue-700">
          {decisionTrace?.ruleScore ?? '-'}
        </span>
      </div>

      {/* 箭头 */}
      <GitMerge className="h-4 w-4 text-gray-400" />

      {/* 裁判模型 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg border border-purple-100">
        <Bot className="h-4 w-4 text-purple-600" />
        <span className="text-xs text-purple-600">裁判</span>
        <span className={`text-lg font-bold ${getScoreColor(decisionTrace?.judgeScore ?? 0)}`}>
          {decisionTrace?.judgeScore ?? '-'}
        </span>
      </div>

      {/* 箭头 */}
      <span className="text-gray-400">→</span>

      {/* 最终结果 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg border border-gray-200">
        <span className="text-xs text-gray-600">最终</span>
        <span className={`text-lg font-bold ${getScoreColor(decisionTrace?.finalScore ?? 0)}`}>
          <AnimatedNumber value={decisionTrace?.finalScore ?? 0} />
        </span>
        <Badge className={getActionColor(decisionTrace?.finalAction ?? 'allow')}>
          {ACTION_NAMES[decisionTrace?.finalAction ?? 'allow']}
        </Badge>
      </div>
    </div>
  );

  // 渲染标准/完整模式的评分对比
  const renderFullScoreComparison = () => (
    <div className="grid grid-cols-2 gap-4">
      {/* 规则检测 */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">规则检测</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-blue-700">
            <AnimatedNumber value={decisionTrace?.ruleScore ?? 0} />
          </span>
          <Badge className={getActionColor(decisionTrace?.ruleAction ?? 'allow')}>
            {ACTION_NAMES[decisionTrace?.ruleAction ?? 'allow']}
          </Badge>
        </div>
        <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(decisionTrace?.ruleScore ?? 0, 100)}%` }}
          />
        </div>
      </div>

      {/* 裁判模型 */}
      <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">裁判模型</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-2xl font-bold ${getScoreColor(decisionTrace?.judgeScore ?? 0)}`}>
            {decisionTrace?.judgeScore !== undefined ? (
              <AnimatedNumber value={decisionTrace.judgeScore} />
            ) : '-'}
          </span>
          <Badge className={getActionColor(decisionTrace?.judgeAction ?? 'allow')}>
            {ACTION_NAMES[decisionTrace?.judgeAction ?? 'allow']}
          </Badge>
        </div>
        {decisionTrace?.judgeScore !== undefined && (
          <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
            <div
              className={`${getScoreBarColor(decisionTrace.judgeScore)} h-2 rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(decisionTrace.judgeScore, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );

  // 渲染决策融合结果
  const renderDecisionFusion = () => (
    <div className={`p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 transition-all duration-300 hover:shadow-sm ${
      displayMode === 'compact' ? '' : 'mt-4'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <GitMerge className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">决策融合</span>
        <Badge variant="outline" className="text-xs">
          {DECISION_MODE_NAMES[decisionTrace?.decisionMode || ''] || decisionTrace?.decisionMode}
        </Badge>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">最终评分</div>
          <div className={`text-xl font-bold ${getScoreColor(decisionTrace?.finalScore ?? 0)}`}>
            <AnimatedNumber value={decisionTrace?.finalScore ?? 0} />
          </div>
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">最终动作</div>
          <Badge className={`${getActionColor(decisionTrace?.finalAction ?? 'allow')} text-base px-3 py-1`}>
            {ACTION_NAMES[decisionTrace?.finalAction ?? 'allow']}
          </Badge>
        </div>
        {judgeModelResult?.confidence !== undefined && (
          <div className="flex-1">
            <div className="text-xs text-gray-500 mb-1">置信度</div>
            <div className="text-lg font-semibold text-gray-700">
              {(judgeModelResult.confidence * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      {/* 决策说明 - compact 模式折叠，其他模式展开 */}
      {(displayMode !== 'compact' || expanded) && decisionTrace?.reasoning && (
        <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded transition-all duration-300">
          <span className="font-medium">决策说明：</span>
          {decisionTrace.reasoning}
        </div>
      )}

      {/* 模式说明 */}
      {displayMode !== 'compact' && (
        <div className="text-xs text-gray-500 mt-2">
          {DECISION_MODE_DESC[decisionTrace?.decisionMode || '']}
        </div>
      )}
    </div>
  );

  // 渲染维度判断结果
  const renderDimensionResults = () => {
    if (!dimensionResults || dimensionResults.length === 0) return null;

    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200 transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">维度判断</span>
        </div>
        <div className="space-y-2">
          {dimensionResults.map((dim, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border transition-all duration-300 hover:shadow-sm ${
                dim.hasRisk
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {dim.hasRisk ? (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm font-medium">{dim.dimensionName}</span>
                  <Badge
                    variant="outline"
                    className={
                      dim.hasRisk
                        ? 'border-red-300 text-red-700'
                        : 'border-green-300 text-green-700'
                    }
                  >
                    {dim.hasRisk ? '有风险' : '无风险'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>评分: <strong className={getScoreColor(dim.score)}>{dim.score}</strong></span>
                  <span>置信度: <strong>{(dim.confidence * 100).toFixed(0)}%</strong></span>
                </div>
              </div>
              {dim.reason && (
                <p className="text-xs text-gray-600 mt-1">{dim.reason}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染规则复核
  const renderRuleReview = () => {
    if (!ruleReview) return null;

    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200 transition-all duration-300">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">规则复核</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className={`p-2 rounded text-center transition-colors duration-300 ${ruleReview.agreeWithRules ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="text-xs text-gray-500">认同规则</div>
            <div className={`font-bold ${ruleReview.agreeWithRules ? 'text-green-700' : 'text-red-700'}`}>
              {ruleReview.agreeWithRules ? '✓ 是' : '✗ 否'}
            </div>
          </div>
          <div className={`p-2 rounded text-center transition-colors duration-300 ${ruleReview.falsePositiveSuspected ? 'bg-yellow-100' : 'bg-gray-50'}`}>
            <div className="text-xs text-gray-500">疑似误报</div>
            <div className={`font-bold ${ruleReview.falsePositiveSuspected ? 'text-yellow-700' : 'text-gray-600'}`}>
              {ruleReview.falsePositiveSuspected ? '⚠ 是' : '○ 否'}
            </div>
          </div>
          <div className={`p-2 rounded text-center transition-colors duration-300 ${ruleReview.falseNegativeSuspected ? 'bg-yellow-100' : 'bg-gray-50'}`}>
            <div className="text-xs text-gray-500">疑似漏报</div>
            <div className={`font-bold ${ruleReview.falseNegativeSuspected ? 'text-yellow-700' : 'text-gray-600'}`}>
              {ruleReview.falseNegativeSuspected ? '⚠ 是' : '○ 否'}
            </div>
          </div>
        </div>
        {ruleReview.explanation && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {ruleReview.explanation}
          </div>
        )}
      </div>
    );
  };

  // 渲染裁判理由
  const renderReason = () => {
    if (!judgeModelResult?.reason) return null;

    return (
      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 transition-all duration-300 hover:shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">裁判理由</span>
        </div>
        <p className="text-sm text-gray-700">{judgeModelResult.reason}</p>
      </div>
    );
  };

  // 主渲染逻辑
  return (
    <div className="mt-4">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-white transition-all duration-300 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="h-5 w-5 text-purple-600" />
              裁判模型结果
              <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                {DECISION_MODE_NAMES[decisionTrace?.decisionMode || ''] || decisionTrace?.decisionMode}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {judgeModelResult.latencyMs && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Zap className="h-3 w-3" />
                  {judgeModelResult.latencyMs}ms
                </div>
              )}
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                调用成功
              </Badge>
              {canExpand && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggle}
                  className="h-6 w-6 p-0 transition-transform duration-300"
                >
                  {expanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* 评分对比区域 - 根据模式显示不同样式 */}
          {decisionTrace && (
            <div className="space-y-4">
              {displayMode === 'compact' && !expanded
                ? renderCompactScoreComparison()
                : renderFullScoreComparison()}

              {/* 决策融合结果 */}
              {renderDecisionFusion()}
            </div>
          )}

          {/* 展开详情 - 带动画 */}
          <div
            ref={contentRef}
            style={{
              height: contentHeight,
              overflow: isAnimating || (canExpand && !expanded) ? 'hidden' : 'visible',
              transition: 'height 300ms ease-out',
            }}
            onTransitionEnd={handleTransitionEnd}
          >
            {showDetails && (
              <div className="mt-4 space-y-4">
                {/* 维度判断结果 */}
                {renderDimensionResults()}

                {/* 规则复核 */}
                {renderRuleReview()}

                {/* 裁判理由 */}
                {renderReason()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
