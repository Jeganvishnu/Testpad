import mammoth from 'mammoth';
import { extractTextFromPdf } from './pdfUtils';

/**
 * Unified document text extraction utility
 * Supports PDF, DOC, and DOCX formats
 */
export async function extractTextFromDocument(file: File): Promise<string> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    try {
        // Handle PDF files
        if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
            return await extractTextFromPdf(file);
        }

        // Handle Word documents (.doc, .docx)
        if (
            fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            fileType === 'application/msword' ||
            fileName.endsWith('.docx') ||
            fileName.endsWith('.doc')
        ) {
            return await extractTextFromWord(file);
        }

        throw new Error('Unsupported file format. Please upload a PDF, DOC, or DOCX file.');
    } catch (error) {
        throw new Error(
            `Failed to extract text from document: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Extract text from Word documents using mammoth
 */
async function extractTextFromWord(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });

        if (!result.value || result.value.trim().length === 0) {
            throw new Error('Word document appears to be empty or contains no readable text.');
        }

        return result.value;
    } catch (error) {
        throw new Error(
            `Failed to extract text from Word document: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Validate if a file is a supported document format
 */
export function isSupportedDocumentFormat(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    const supportedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
    ];

    const supportedExtensions = ['.pdf', '.doc', '.docx'];

    return (
        supportedTypes.includes(fileType) ||
        supportedExtensions.some(ext => fileName.endsWith(ext))
    );
}

/**
 * Get user-friendly file type name
 */
export function getDocumentTypeName(file: File): string {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) return 'PDF';
    if (fileName.endsWith('.docx')) return 'Word Document (DOCX)';
    if (fileName.endsWith('.doc')) return 'Word Document (DOC)';

    return 'Document';
}
