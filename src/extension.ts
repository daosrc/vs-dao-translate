import * as vscode from 'vscode';
import { TranslationProvider } from './translation';

export function activate(context: vscode.ExtensionContext) {
    console.log('VS DAO Translate 插件已激活');

    const translationProvider = new TranslationProvider();

    // 注册翻译命令
    const translateCommand = vscode.commands.registerCommand(
        'vs-dao-translate.translate',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('没有活动的编辑器');
                return;
            }

            let textToTranslate = '';

            // 获取选中的文本
            if (editor.selection.isEmpty) {
                // 如果没有选中任何内容，尝试获取当前单词
                const cursorPosition = editor.selection.active;
                const wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
                if (wordRange) {
                    textToTranslate = editor.document.getText(wordRange);
                }
            } else {
                // 使用选中的文本
                textToTranslate = editor.document.getText(editor.selection);
            }

            if (!textToTranslate.trim()) {
                vscode.window.showInformationMessage('请选择要翻译的文本');
                return;
            }

            try {
                const result = await translationProvider.translate(textToTranslate);
                if (result) {
                    vscode.window.showInformationMessage(`翻译结果: ${result}`);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`翻译失败: ${(error as Error).message}`);
            }
        }
    );

    // 注册悬停提供程序
    const hoverProvider = vscode.languages.registerHoverProvider(
        { pattern: '**' }, // 所有文件类型
        {
            async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
                const enableHover = vscode.workspace.getConfiguration('vs-dao-translate').get('enableHoverTranslation');
                if (!enableHover) {
                    return null;
                }

                const wordRange = document.getWordRangeAtPosition(position);
                if (!wordRange) {
                    return null;
                }

                const word = document.getText(wordRange);
                if (word.length < 2) { // 避免翻译单个字符
                    return null;
                }

                try {
                    const translation = await translationProvider.translate(word);
                    if (translation) {
                        const hoverContent = new vscode.MarkdownString();
                        hoverContent.appendMarkdown(`**翻译:** ${translation}\n\n`);
                        return new vscode.Hover(hoverContent);
                    }
                } catch (error) {
                    console.error('悬停翻译失败:', error);
                }

                return null;
            }
        }
    );

    // 注册文档选择改变事件来处理划词翻译
    const selectionChangeListener = vscode.window.onDidChangeTextEditorSelection(async (event: vscode.TextEditorSelectionChangeEvent) => {
        const enableSelection = vscode.workspace.getConfiguration('vs-dao-translate').get('enableSelectionTranslation');
        if (!enableSelection) {
            return;
        }

        const editor = event.textEditor;
        const selections = event.selections;

        // 检查是否有非空选择
        for (const selection of selections) {
            if (!selection.isEmpty) {
                const selectedText = editor.document.getText(selection);
                if (selectedText.trim().length > 0) {
                    try {
                        const translation = await translationProvider.translate(selectedText);
                        if (translation) {
                            // 显示翻译结果的通知
                            const result = await vscode.window.showInformationMessage(
                                `翻译: "${selectedText}" -> "${translation}"`,
                                '插入翻译', '复制到剪贴板'
                            );

                            if (result === '插入翻译') {
                                // 在当前位置插入翻译结果
                                const currentPosition = selection.end;
                                editor.edit((editBuilder: vscode.TextEditorEdit) => {
                                    editBuilder.insert(currentPosition, ` /* ${translation} */`);
                                });
                            } else if (result === '复制到剪贴板') {
                                vscode.env.clipboard.writeText(translation);
                            }
                        }
                    } catch (error) {
                        console.error('划词翻译失败:', error);
                    }
                }
            }
        }
    });

    context.subscriptions.push(translateCommand, hoverProvider, selectionChangeListener);

    console.log('VS DAO Translate 功能已注册');
}

export function deactivate() {
    console.log('VS DAO Translate 插件已停用');
}