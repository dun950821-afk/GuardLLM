'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Headphones, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContactModal({ open, onOpenChange }: ContactModalProps) {
  const copyTemplate = async () => {
    const template = `问题描述：
账号：__________
所属部门：__________
联系方式：__________

问题页面：__________
操作步骤：__________
报错截图/任务编号：__________

期望处理结果：__________`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(template);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = template;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast.success('问题模板已复制到剪贴板');
    } catch {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              <Headphones className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>联系客服</DialogTitle>
              <DialogDescription>
                登录异常、账号权限、平台使用与检测问题，可通过以下方式联系支持人员。
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-lg border bg-gray-50/50">
            <p className="text-xs text-gray-500 mb-1">服务热线</p>
            <p className="text-lg font-semibold text-gray-900">400-696-8096</p>
            <p className="text-xs text-gray-400 mt-2">
              建议用于账号登录、验证码、权限开通等问题。
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-gray-50/50">
            <p className="text-xs text-gray-500 mb-1">服务时间</p>
            <p className="text-lg font-semibold text-gray-900">工作日 09:00 - 18:00</p>
            <p className="text-xs text-gray-400 mt-2">
              紧急安全事件可通过项目支持群或值班人员升级处理。
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-gray-50/50">
            <p className="text-xs text-gray-500 mb-1">技术支持邮箱</p>
            <p className="text-lg font-semibold text-gray-900">support@unisguard.com</p>
            <p className="text-xs text-gray-400 mt-2">
              建议邮件中附带问题截图、浏览器版本和发生时间。
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-gray-50/50">
            <p className="text-xs text-gray-500 mb-1">问题处理范围</p>
            <ul className="text-sm text-gray-700 mt-2 space-y-1">
              <li>• 登录失败、密码找回、验证码异常</li>
              <li>• 检测策略、规则配置、模型接入咨询</li>
              <li>• 检测结果异常、报告导出、历史记录查询</li>
            </ul>
          </div>

          <div className="col-span-2 p-4 rounded-lg border bg-gray-50/50">
            <p className="text-xs text-gray-500 mb-2">提交问题建议携带信息</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• 账号 / 所属部门 / 联系方式</li>
              <li>• 问题页面、操作步骤、报错截图或任务编号</li>
              <li>• 期望处理结果，例如账号开通、权限调整、检测异常排查等</li>
            </ul>
            <div className="flex gap-3 mt-4">
              <button
                onClick={copyTemplate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Copy className="h-4 w-4" />
                复制问题模板
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                查看平台状态
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}