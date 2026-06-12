/**
 * LLM Gateway - 大模型接入网关
 * 
 * 功能：
 * 1. 管理多个 LLM Provider
 * 2. 提供 Provider 适配器
 * 3. 连接池管理
 * 4. 重试机制
 * 5. 超时控制
 */

import type {
  LLMProvider,
  LLMChatRequest,
  LLMChatResponse,
  LLMTestConnectionResult,
  IProviderAdapter,
  LLMGatewayConfig,
} from './types';
import { DEFAULT_GATEWAY_CONFIG } from './types';
import { OpenAICompatibleAdapter } from './providers/openai-compatible';

export class LLMGateway {
  private providers: Map<string, IProviderAdapter> = new Map();
  private config: LLMGatewayConfig;

  constructor(config?: Partial<LLMGatewayConfig>) {
    this.config = { ...DEFAULT_GATEWAY_CONFIG, ...config };
  }

  /**
   * 注册 Provider
   */
  registerProvider(provider: LLMProvider): void {
    const adapter = this.createAdapter(provider);
    this.providers.set(provider.id, adapter);
  }

  /**
   * 批量注册 Providers
   */
  registerProviders(providers: LLMProvider[]): void {
    providers.forEach(provider => this.registerProvider(provider));
  }

  /**
   * 移除 Provider
   */
  removeProvider(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * 获取 Provider
   */
  getProvider(providerId: string): IProviderAdapter | undefined {
    return this.providers.get(providerId);
  }

  /**
   * 列出所有 Providers
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * 调用 LLM（带重试和超时）
   */
  async chat(
    providerId: string,
    request: LLMChatRequest
  ): Promise<LLMChatResponse> {
    const adapter = this.providers.get(providerId);
    if (!adapter) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // 带重试的调用
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        // 带超时的调用
        const response = await this.withTimeout(
          adapter.chat(request),
          this.config.timeoutMs
        );
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // 如果是最后一次尝试，直接抛出错误
        if (attempt === this.config.maxRetries) {
          break;
        }

        // 等待后重试
        await this.delay(this.config.retryDelayMs * attempt);
      }
    }

    throw lastError || new Error('Failed to call LLM after retries');
  }

  /**
   * 测试 Provider 连接
   */
  async testConnection(providerId: string): Promise<LLMTestConnectionResult> {
    const adapter = this.providers.get(providerId);
    if (!adapter) {
      return {
        success: false,
        message: `Provider not found: ${providerId}`,
      };
    }

    try {
      return await adapter.testConnection();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * 创建 Provider 适配器
   */
  private createAdapter(provider: LLMProvider): IProviderAdapter {
    switch (provider.providerType) {
      case 'openai_compatible':
      case 'deepseek':
      case 'kimi':
      case 'doubao':
      case 'qwen':
      case 'glm':
        return new OpenAICompatibleAdapter(
          provider.name,
          provider.baseUrl,
          provider.apiKey || '',
          provider.defaultModel
        );

      // TODO: 其他类型的适配器
      case 'ollama':
        return new OpenAICompatibleAdapter(
          provider.name,
          provider.baseUrl || 'http://localhost:11434',
          '', // Ollama 不需要 API Key
          provider.defaultModel
        );

      case 'coze':
        // TODO: 实现 Coze Adapter
        throw new Error('Coze adapter not implemented yet');

      case 'custom':
        // TODO: 实现自定义 Adapter
        throw new Error('Custom adapter not implemented yet');

      default:
        throw new Error(`Unknown provider type: ${provider.providerType}`);
    }
  }

  /**
   * 带超时的 Promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 单例实例
let gatewayInstance: LLMGateway | null = null;

/**
 * 获取 LLM Gateway 实例
 */
export function getLLMGateway(config?: Partial<LLMGatewayConfig>): LLMGateway {
  if (!gatewayInstance) {
    gatewayInstance = new LLMGateway(config);
  }
  return gatewayInstance;
}

/**
 * 重置 LLM Gateway 实例（用于测试）
 */
export function resetLLMGateway(): void {
  gatewayInstance = null;
}
