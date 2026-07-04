import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Question {
  id: string;
  question: string;
  questionType?: 'text' | 'image' | 'code';
  imageUrl?: string;
  codeContent?: string;
  codeLanguage?: string;
  options: string[];
  correctAnswer: number;
}

interface TestResultData {
  score: number;
  totalQuestions: number;
  answers: Record<string, number>;
  detailedAnswers?: Record<string, { index: number; value: string; isCorrect: boolean }>;
  completedAt: string;
  timeSpent: number;
}

interface Test {
  title: string;
  description: string;
  duration: number;
}

// Generate markdown content for the test results
export function generateMarkdownContent(
  test: Test,
  result: TestResultData,
  questions: Question[]
): string {
  const percentage = Math.round((result.score / result.totalQuestions) * 100);
  const completedDate = new Date(result.completedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  let markdown = `# ${test.title}\n\n`;
  markdown += `**Test Results**\n\n`;
  markdown += `**Score:** ${result.score}/${result.totalQuestions} (${percentage}%)\n\n`;
  markdown += `**Completed:** ${completedDate}\n\n`;
  markdown += `**Time Spent:** ${formatTime(result.timeSpent)}\n\n`;
  markdown += `---\n\n`;

  // Add questions and answers
  questions.forEach((question, index) => {
    const questionNumber = index + 1;
    markdown += `## ${questionNumber}. ${question.question}\n\n`;

    // Add options
    question.options.forEach((option, optionIndex) => {
      const letter = String.fromCharCode(65 + optionIndex); // A, B, C, D
      const isCorrectAnswer = optionIndex === question.correctAnswer;
      const userAnswerInfo = getUserAnswerInfo(question.id, result);
      const isUserAnswer = userAnswerInfo && userAnswerInfo.index === optionIndex;

      if (isCorrectAnswer) {
        // Correct answer in bold
        markdown += `**${letter}) ${option}**`;
        if (isUserAnswer) {
          markdown += ` ✓`;
        }
        markdown += `\n\n`;
      } else {
        markdown += `${letter}) ${option}`;
        if (isUserAnswer) {
          markdown += ` ❌`;
        }
        markdown += `\n\n`;
      }
    });

    // Add answer status
    if (userAnswerInfo) {
      if (userAnswerInfo.isCorrect) {
        markdown += `*Your answer: Correct* ✓\n\n`;
      } else {
        markdown += `*Your answer: ${String.fromCharCode(65 + userAnswerInfo.index)}) ${userAnswerInfo.value}* ❌\n\n`;
        markdown += `*Correct answer: ${String.fromCharCode(65 + question.correctAnswer)}) ${question.options[question.correctAnswer]}* ✓\n\n`;
      }
    } else {
      markdown += `*Your answer: Not answered*\n\n`;
      markdown += `*Correct answer: ${String.fromCharCode(65 + question.correctAnswer)}) ${question.options[question.correctAnswer]}* ✓\n\n`;
    }

    markdown += `---\n\n`;
  });

  return markdown;
}

// Helper function to get user answer information
function getUserAnswerInfo(questionId: string, result: TestResultData) {
  // Use detailed answers if available (new format)
  if (result?.detailedAnswers && result.detailedAnswers[questionId]) {
    const detailed = result.detailedAnswers[questionId];
    return {
      index: detailed.index,
      value: detailed.value,
      isCorrect: detailed.isCorrect
    };
  }

  // Fallback to legacy format
  if (result?.answers && result.answers[questionId] !== undefined) {
    const answerIndex = result.answers[questionId];
    return {
      index: answerIndex,
      value: `Option ${String.fromCharCode(65 + answerIndex)}`,
      isCorrect: false // We'll determine this separately
    };
  }

  return null;
}

// Helper function to format time
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

// Convert markdown to HTML
export function markdownToHtml(markdown: string): string {
  // Simple markdown to HTML conversion
  let html = markdown
    // Headers
    .replace(/^# (.*$)/gm, '<h1 style="font-size: 24px; margin-bottom: 16px; color: #1f2937;">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size: 18px; margin-bottom: 12px; margin-top: 20px; color: #374151;">$1</h2>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    // Horizontal rules
    .replace(/---/g, '<hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">')
    // Checkmarks and X marks
    .replace(/✓/g, '<span style="color: #10b981;">✓</span>')
    .replace(/❌/g, '<span style="color: #ef4444;">❌</span>');

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 800px; margin: 0 auto; padding: 20px;">
      ${html}
    </div>
  `;
}

// Generate and download PDF
export async function generateAndDownloadPDF(
  test: Test,
  result: TestResultData,
  questions: Question[]
): Promise<void> {
  try {
    // Generate markdown content
    const markdown = generateMarkdownContent(test, result, questions);
    
    // Convert to HTML
    const html = markdownToHtml(markdown);
    
    // Create a temporary div to render HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '0';
    tempDiv.style.width = '800px';
    document.body.appendChild(tempDiv);

    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 800,
      height: tempDiv.scrollHeight
    });

    // Remove temporary div
    document.body.removeChild(tempDiv);

    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 10; // 10mm top margin

    // Add first page
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 20); // Account for margins

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);
    }

    // Generate filename with test title and date
    const sanitizedTitle = test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date(result.completedAt).toISOString().split('T')[0];
    const filename = `${sanitizedTitle}_results_${dateStr}.pdf`;

    // Download the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

// Alternative simpler PDF generation using jsPDF text methods
export async function generateSimplePDF(
  test: Test,
  result: TestResultData,
  questions: Question[]
): Promise<void> {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    const lineHeight = 7;
    const margin = 20;

    // Helper function to add text with word wrap
    const addWrappedText = (text: string, x: number, fontSize = 12, isBold = false) => {
      if (isBold) {
        pdf.setFont('helvetica', 'bold');
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.setFontSize(fontSize);
      
      const splitText = pdf.splitTextToSize(text, pageWidth - 2 * margin);
      const textHeight = splitText.length * lineHeight;
      
      // Check if we need a new page
      if (yPosition + textHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.text(splitText, x, yPosition);
      yPosition += textHeight + 3;
    };

    // Title
    addWrappedText(test.title, margin, 16, true);
    addWrappedText('Test Results', margin, 14, true);
    
    // Results summary
    const percentage = Math.round((result.score / result.totalQuestions) * 100);
    const completedDate = new Date(result.completedAt).toLocaleDateString();
    
    addWrappedText(`Score: ${result.score}/${result.totalQuestions} (${percentage}%)`, margin);
    addWrappedText(`Completed: ${completedDate}`, margin);
    addWrappedText(`Time Spent: ${formatTime(result.timeSpent)}`, margin);
    
    // Add separator
    yPosition += 10;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Questions and answers
    questions.forEach((question, index) => {
      const questionNumber = index + 1;
      addWrappedText(`${questionNumber}. ${question.question}`, margin, 12, true);
      
      question.options.forEach((option, optionIndex) => {
        const letter = String.fromCharCode(65 + optionIndex);
        const isCorrectAnswer = optionIndex === question.correctAnswer;
        const userAnswerInfo = getUserAnswerInfo(question.id, result);
        const isUserAnswer = userAnswerInfo && userAnswerInfo.index === optionIndex;
        
        let optionText = `${letter}) ${option}`;
        if (isCorrectAnswer) {
          optionText += ' ✓';
        }
        if (isUserAnswer && !isCorrectAnswer) {
          optionText += ' (Your Answer)';
        }
        
        addWrappedText(optionText, margin + 10, 10, isCorrectAnswer);
      });
      
      yPosition += 5;
    });

    // Generate filename
    const sanitizedTitle = test.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date(result.completedAt).toISOString().split('T')[0];
    const filename = `${sanitizedTitle}_results_${dateStr}.pdf`;

    // Download the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating simple PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}