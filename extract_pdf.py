#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import PyPDF2
import sys

def extract_pdf_text(pdf_path):
    """提取PDF文件中的文本内容"""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text_content = []
            
            # 提取每一页的文本
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()
                if text.strip():
                    text_content.append(f"\n=== 第 {page_num + 1} 页 ===\n")
                    text_content.append(text)
            
            return '\n'.join(text_content)
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    pdf_path = "/workspace/projects/assets/国舜技术部 Vibe Coding 实战竞赛 · AI 安全创新专题（新增交易反欺诈）(2).pdf"
    text = extract_pdf_text(pdf_path)
    print(text)
