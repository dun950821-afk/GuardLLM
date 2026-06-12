/**
 * API 限流中间件
 * 基于 IP 地址和请求路径的限流控制
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  /** 时间窗口（毫秒） */
  windowMs: number
  /** 窗口内最大请求数 */
  maxRequests: number
  /** 是否跳过成功请求（只计算失败请求） */
  skipSuccessfulRequests?: boolean
  /** 自定义键生成函数 */
  keyGenerator?: (request: NextRequest) => string
  /** 自定义处理函数 */
  handler?: (request: NextRequest) => NextResponse
}

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// 内存存储（单实例有效）
// 生产环境建议使用 Redis
const store: RateLimitStore = {}

/**
 * 清理过期记录
 */
function cleanupStore() {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}

// 定期清理
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupStore, 60000) // 每分钟清理一次
}

/**
 * 默认键生成器
 * 基于 IP + 路径
 */
function defaultKeyGenerator(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for') 
    || request.headers.get('x-real-ip') 
    || 'unknown'
  const path = request.nextUrl.pathname
  return `${ip}:${path}`
}

/**
 * 默认限流处理器
 */
function defaultHandler(request: NextRequest): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: '请求过于频繁，请稍后重试',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    { status: 429 }
  )
}

/**
 * 创建限流中间件
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    skipSuccessfulRequests = false,
    keyGenerator = defaultKeyGenerator,
    handler = defaultHandler
  } = config

  return async function rateLimiter(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(request)
    const now = Date.now()

    // 获取或创建记录
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }

    // 检查是否超限
    if (store[key].count >= maxRequests) {
      const resetTimeSeconds = Math.ceil((store[key].resetTime - now) / 1000)
      const response = handler(request)
      response.headers.set('X-RateLimit-Limit', String(maxRequests))
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', String(resetTimeSeconds))
      return response
    }

    // 执行请求
    const response = await next()

    // 根据配置决定是否计数
    if (!skipSuccessfulRequests || response.status >= 400) {
      store[key].count++
    }

    // 设置响应头
    response.headers.set('X-RateLimit-Limit', String(maxRequests))
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - store[key].count)))
    response.headers.set('X-RateLimit-Reset', String(Math.ceil((store[key].resetTime - now) / 1000)))

    return response
  }
}

/**
 * 预设配置
 */

// 检测API限流（每分钟20次）
export const detectRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    return `detect:${ip}`
  }
})

// 策略API限流（每分钟30次）
export const policyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    return `policy:${ip}`
  }
})

// 历史记录API限流（每分钟60次）
export const historyRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    return `history:${ip}`
  }
})

// Provider API限流（每分钟10次）
export const providerRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    return `provider:${ip}`
  }
})

// 全局限流（每分钟100次）
export const globalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  keyGenerator: (request) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    return `global:${ip}`
  }
})

/**
 * 组合多个中间件
 */
export function composeMiddleware(
  ...middlewares: Array<(req: NextRequest, next: () => Promise<NextResponse>) => Promise<NextResponse>>
) {
  return async function composedMiddleware(request: NextRequest): Promise<NextResponse> {
    let index = 0

    async function next(): Promise<NextResponse> {
      const middleware = middlewares[index++]
      if (middleware) {
        return middleware(request, next)
      }
      // 如果没有更多中间件，返回一个空响应（实际不会被调用）
      return NextResponse.next()
    }

    return next()
  }
}

/**
 * 应用限流到路由处理器
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limiter: (req: NextRequest, next: () => Promise<NextResponse>) => Promise<NextResponse>
) {
  return async function rateLimitedHandler(request: NextRequest): Promise<NextResponse> {
    return limiter(request, () => handler(request))
  }
}
