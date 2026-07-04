import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { ProgrammingLanguage } from '../../types/programmingTestTypes';

interface CodeEditorProps {
    language: ProgrammingLanguage;
    value: string;
    onChange: (value: string) => void;
    height?: string;
    readOnly?: boolean;
    theme?: 'light' | 'dark';
}

const MONACO_LANGUAGE_MAP: Record<ProgrammingLanguage, string> = {
    python: 'python',
    c: 'c',
    cpp: 'cpp',
    java: 'java'
};

const CodeEditor: React.FC<CodeEditorProps> = ({
    language,
    value,
    onChange,
    height = '500px',
    readOnly = false,
    theme
}) => {
    const editorRef = useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;

        editor.updateOptions({
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'off',
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            autoIndent: 'full',
            formatOnPaste: true,
            formatOnType: true,
            readOnly: false,
            domReadOnly: false
        });
    };

    const handleEditorChange = (value: string | undefined) => {
        onChange(value || '');
    };

    const editorTheme = theme === 'dark' ||
        (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'vs-dark'
        : 'vs';

    return (
        <Editor
            height={height}
            language={MONACO_LANGUAGE_MAP[language]}
            value={value}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme={editorTheme}
            options={{
                selectOnLineNumbers: true,
                roundedSelection: false,
                cursorStyle: 'line',
                automaticLayout: true,
                glyphMargin: false,
                folding: true,
                lineNumbersMinChars: 3,
                lineDecorationsWidth: 0,
                lineNumbers: 'on',
                readOnly: false,
                domReadOnly: false,
                scrollbar: {
                    vertical: 'visible',
                    horizontal: 'visible',
                    useShadows: false,
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10
                }
            }}
            loading={
                <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading editor...</p>
                    </div>
                </div>
            }
        />
    );
};

export default CodeEditor;
