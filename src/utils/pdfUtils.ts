import * as pdfjsLib from 'pdfjs-dist';

// Use unpkg CDN with matching version to installed package (5.4.54)
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.4.54/build/pdf.worker.min.mjs';

interface ExtractedQuestion {
  question: string;
  questionType: 'text';
  options: string[];
  correctAnswer: number;
}

export interface PdfExtractionResult {
  questions: ExtractedQuestion[];
  errors: string[];
  totalExtracted: number;
}

/**
 * Enhanced PDF question extraction with multiple pattern recognition
 */
// Re-export this so we can use it in other places like AI upload
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfData = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    let text = '';
    const numPages = pdfData.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfData.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n';
    }
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced PDF question extraction with multiple pattern recognition
 */
export async function extractQuestionsFromPdf(file: File): Promise<PdfExtractionResult> {
  try {
    const text = await extractTextFromPdf(file);
    return parseQuestionsFromText(text);
  } catch (error) {
    console.error('Error extracting PDF:', error);
    return {
      questions: [],
      errors: [`Failed to read PDF: ${error instanceof Error ? error.message : 'Unknown error'}`],
      totalExtracted: 0
    };
  }
}

/**
 * Parse questions from extracted text using multiple patterns
 */
function parseQuestionsFromText(text: string): PdfExtractionResult {
  const questions: ExtractedQuestion[] = [];
  const errors: string[] = [];

  // Clean and normalize text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into potential question blocks
  const blocks = splitIntoQuestionBlocks(cleanText);

  blocks.forEach((block, index) => {
    try {
      const extractedQuestion = extractQuestionFromBlock(block);
      if (extractedQuestion) {
        questions.push(extractedQuestion);
      }
    } catch (error) {
      errors.push(`Error parsing question ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  return {
    questions,
    errors,
    totalExtracted: questions.length
  };
}

/**
 * Split text into potential question blocks using various patterns
 */
function splitIntoQuestionBlocks(text: string): string[] {
  // Multiple question patterns to try
  const questionPatterns = [
    /(?:^|\n)\s*(?:Q\s*\d+[.:]?|\d+[.).:]+|\d+\s?\.|Question\s*\d+[.:]?)\s*(.+?)(?=(?:^|\n)\s*(?:Q\s*\d+[.:]?|\d+[.).:]+|\d+\s?\.|Question\s*\d+[.:]?)|$)/gim,
    /(?:^|\n)\s*(\d+[.)]\s*.+?)(?=(?:^|\n)\s*\d+[.)]|$)/gi
  ];

  let blocks: string[] = [];

  // Try each pattern
  for (const pattern of questionPatterns) {
    const matches = Array.from(text.matchAll(pattern));
    if (matches.length > 0) {
      blocks = matches.map(match => match[0].trim());
      break;
    }
  }

  // If no patterns match, try to split by double newlines
  if (blocks.length === 0) {
    blocks = text.split(/\n\s*\n/).filter(block => block.trim().length > 10);
  }

  return blocks;
}

/**
 * Extract a single question from a text block
 */
function extractQuestionFromBlock(block: string): ExtractedQuestion | null {
  const lines = block.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (lines.length < 2) return null;

  // Find question text (usually the first few lines before options)
  let questionText = '';
  let optionStartIndex = -1;

  // Look for option patterns
  const optionPatterns = [
    /^[A-E][.).]\s*/i,
    /^\([A-E]\)\s*/i,
    /^[1-5][.):]\s*/,
    /^\([1-5]\)\s*/
  ];

  // Find where options start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (optionPatterns.some(pattern => pattern.test(line))) {
      optionStartIndex = i;
      break;
    }
  }

  if (optionStartIndex === -1) {
    // No clear option pattern found, assume last 4 lines are options
    if (lines.length >= 5) {
      optionStartIndex = lines.length - 4;
    } else {
      return null;
    }
  }

  // Extract question text
  questionText = lines.slice(0, optionStartIndex).join(' ');

  // Clean question number from the beginning
  questionText = questionText.replace(/^(?:Q\s*\d+[.:]?|\d+[.)]|Question\s*\d+[.:]?)\s*/i, '').trim();

  if (!questionText) return null;

  // Extract options
  const optionLines = lines.slice(optionStartIndex);
  const options: string[] = [];

  optionLines.forEach(line => {
    // Remove option markers (A), B), 1., etc.
    const cleanOption = line.replace(/^(?:[A-E][.):]|\([A-E]\)|[1-5][.):]|\([1-5]\))\s*/i, '').trim();
    if (cleanOption) {
      options.push(cleanOption);
    }
  });

  // Require at least 2 options
  if (options.length < 2) return null;

  // Trim to a maximum of 5 options
  if (options.length > 5) {
    options.splice(5);
  }

  return {
    question: questionText,
    questionType: 'text',
    options,
    correctAnswer: 0 // Default to first option, admin will need to set correct answer
  };
}

/**
 * Validate extracted questions before adding to the form
 */
export function validateExtractedQuestions(questions: ExtractedQuestion[]): { valid: ExtractedQuestion[], invalid: { question: ExtractedQuestion, reason: string }[] } {
  const valid: ExtractedQuestion[] = [];
  const invalid: { question: ExtractedQuestion, reason: string }[] = [];

  questions.forEach(question => {
    if (!question.question.trim()) {
      invalid.push({ question, reason: 'Empty question text' });
      return;
    }

    if (question.options.filter(opt => opt.trim()).length < 2) {
      invalid.push({ question, reason: 'Insufficient options (need at least 2)' });
      return;
    }

    if (question.question.length < 10) {
      invalid.push({ question, reason: 'Question text too short' });
      return;
    }

    valid.push(question);
  });

  return { valid, invalid };
}
