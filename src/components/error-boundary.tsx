'use client'

import { Component, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
    
    // 可以在这里上报错误
    // reportError(error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-red-700">页面出错了</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">抱歉，页面遇到了一些问题</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-mono">
                  {this.state.error?.message || '未知错误'}
                </p>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="p-3 bg-gray-100 border rounded-lg">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    开发者信息
                  </summary>
                  <pre className="mt-2 text-xs text-gray-600 overflow-auto max-h-40">
                    {this.state.error?.stack}
                    {'\n\n'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2">
                <Button onClick={this.handleReset} variant="outline" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重试
                </Button>
                <Button onClick={this.handleGoHome} className="flex-1">
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * API错误处理
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }

  static fromResponse(response: Response, message?: string): APIError {
    return new APIError(
      message || `请求失败: ${response.status} ${response.statusText}`,
      response.status
    )
  }

  isNetworkError(): boolean {
    return this.statusCode === 0
  }

  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500
  }

  isServerError(): boolean {
    return this.statusCode >= 500
  }
}

/**
 * 错误提示组件
 */
interface ErrorAlertProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorAlert({ title = '操作失败', message, onRetry, onDismiss }: ErrorAlertProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">{title}</h4>
            <p className="text-sm text-red-600 mt-1">{message}</p>
          </div>
          <div className="flex gap-2">
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                重试
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                关闭
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 错误处理Hook
 */
export function useErrorHandler() {
  const handleError = (error: unknown, context?: string) => {
    console.error(`[${context || 'App'}] Error:`, error)
    
    // 如果是API错误，显示特定消息
    if (error instanceof APIError) {
      return {
        title: '请求失败',
        message: error.message,
        statusCode: error.statusCode
      }
    }
    
    // 如果是普通错误
    if (error instanceof Error) {
      return {
        title: '操作失败',
        message: error.message,
        statusCode: 500
      }
    }
    
    // 未知错误
    return {
      title: '未知错误',
      message: '发生了一个意外错误，请稍后重试',
      statusCode: 500
    }
  }

  return { handleError }
}
