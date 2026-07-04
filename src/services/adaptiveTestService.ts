import { ref, get, set, update } from 'firebase/database';
import { database } from '../lib/firebase';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface AdaptiveQuestion {
  id: string;
  question: string;
  questionType?: 'text' | 'image' | 'code';
  imageUrl?: string;
  codeContent?: string;
  codeLanguage?: string;
  options: string[];
  correctAnswer: number;
  difficulty: DifficultyLevel;
  topic?: string;
  originalCorrectAnswerValue?: string;
}

export interface AdaptiveTestState {
  currentDifficulty: DifficultyLevel;
  correctStreak: number;
  wrongStreak: number;
  askedQuestionIds: string[];
  score: number;
  weightedScore: number;
  difficultyFlow: DifficultyFlowEntry[];
  startedAt: number;
  lastQuestionAt: number;
}

export interface DifficultyFlowEntry {
  timestamp: number;
  difficulty: DifficultyLevel;
  questionId: string;
  wasCorrect: boolean;
  responseTime?: number;
}

// Configuration constants
export const ADAPTIVE_CONFIG = {
  CORRECT_THRESHOLD: 1,  // ✨ Reduced from 2 to 1 - faster promotion
  WRONG_THRESHOLD: 2,    // Keep demotion threshold higher for stability
  WEIGHTS: { easy: 1, medium: 2, hard: 3 } as Record<DifficultyLevel, number>,
  INITIAL_DIFFICULTY: 'medium' as DifficultyLevel,
  MIN_QUESTIONS_PER_DIFFICULTY: 5, // Minimum questions needed per difficulty level
};

export class AdaptiveTestService {
  private static instance: AdaptiveTestService;

  public static getInstance(): AdaptiveTestService {
    if (!AdaptiveTestService.instance) {
      AdaptiveTestService.instance = new AdaptiveTestService();
    }
    return AdaptiveTestService.instance;
  }

  private constructor() { }

  // Difficulty promotion/demotion functions
  promoteDifficulty(difficulty: DifficultyLevel): DifficultyLevel {
    if (difficulty === 'easy') return 'medium';
    if (difficulty === 'medium') return 'hard';
    return 'hard'; // Already at max
  }

  // 🚀 NEW: Progressive difficulty boost for high performers
  shouldSkipLevel(currentState: AdaptiveTestState): boolean {
    // If student has been performing exceptionally well, skip a level
    const recentPerformance = currentState.difficultyFlow.slice(-5); // Last 5 questions
    const correctCount = recentPerformance.filter(entry => entry.wasCorrect).length;

    // If 4 out of last 5 questions are correct AND currently at easy, skip to hard
    return currentState.currentDifficulty === 'easy' &&
      correctCount >= 4 &&
      recentPerformance.length === 5;
  }

  demoteDifficulty(difficulty: DifficultyLevel): DifficultyLevel {
    if (difficulty === 'hard') return 'medium';
    if (difficulty === 'medium') return 'easy';
    return 'easy'; // Already at min
  }

  // 🧠 Smart initial difficulty based on student history
  async determineInitialDifficulty(userId: string): Promise<DifficultyLevel> {
    try {
      // Get student's recent test performance
      const historyRef = ref(database, `adaptiveTestStates/${userId}`);
      const snapshot = await get(historyRef);

      if (!snapshot.exists()) {
        return ADAPTIVE_CONFIG.INITIAL_DIFFICULTY; // New student, start at medium
      }

      const allTests = Object.values(snapshot.val()) as AdaptiveTestState[];
      const recentTests = allTests.slice(-3); // Last 3 tests

      // Calculate average final difficulty
      const avgDifficulty = recentTests.reduce((sum, test) => {
        const difficultyValue = { easy: 1, medium: 2, hard: 3 }[test.currentDifficulty];
        return sum + difficultyValue;
      }, 0) / recentTests.length;

      // Determine starting difficulty based on history
      if (avgDifficulty >= 2.5) return 'hard';   // Strong performer
      if (avgDifficulty >= 1.5) return 'medium'; // Average performer  
      return 'easy'; // Struggling student

    } catch (error) {
      console.error('Error determining initial difficulty:', error);
      return ADAPTIVE_CONFIG.INITIAL_DIFFICULTY;
    }
  }

  // Initialize adaptive test state for a user
  async initializeAdaptiveState(userId: string, testId: string): Promise<AdaptiveTestState> {
    // 🎯 Use smart initial difficulty instead of fixed medium
    const smartInitialDifficulty = await this.determineInitialDifficulty(userId);

    const initialState: AdaptiveTestState = {
      currentDifficulty: smartInitialDifficulty,
      correctStreak: 0,
      wrongStreak: 0,
      askedQuestionIds: [],
      score: 0,
      weightedScore: 0,
      difficultyFlow: [],
      startedAt: Date.now(),
      lastQuestionAt: Date.now(),
    };

    const stateRef = ref(database, `adaptiveTestStates/${userId}/${testId}`);
    await set(stateRef, initialState);

    console.log(`🎯 Student initialized at ${smartInitialDifficulty} difficulty based on history`);
    return initialState;
  }

  // Get current adaptive state
  async getAdaptiveState(userId: string, testId: string): Promise<AdaptiveTestState | null> {
    const stateRef = ref(database, `adaptiveTestStates/${userId}/${testId}`);
    const snapshot = await get(stateRef);

    if (snapshot.exists()) {
      return snapshot.val() as AdaptiveTestState;
    }

    return null;
  }

  // Intelligent question fetching strategy
  async fetchNextQuestion(
    testId: string,
    userId: string,
    currentState: AdaptiveTestState
  ): Promise<AdaptiveQuestion | null> {
    const { currentDifficulty, askedQuestionIds } = currentState;

    try {
      // Strategy 1: Try to get questions of current difficulty level
      let questions = await this.getQuestionsByDifficulty(testId, currentDifficulty);

      // Filter out already asked questions
      questions = questions.filter(q => !askedQuestionIds.includes(q.id));

      // Strategy 2: If no questions available at current difficulty, try adjacent levels
      if (questions.length === 0) {
        console.warn(`No questions available at ${currentDifficulty} level, trying fallback`);
        questions = await this.getFallbackQuestions(testId, currentDifficulty, askedQuestionIds);
      }

      // Strategy 3: If still no questions, get any available question from the test
      if (questions.length === 0) {
        console.warn('No questions available with fallback, getting any available question');
        questions = await this.getAnyAvailableQuestions(testId, askedQuestionIds);
      }

      if (questions.length === 0) {
        console.error('No questions available for test');
        return null;
      }

      // Randomly select from available questions to avoid predictable patterns
      const randomIndex = Math.floor(Math.random() * questions.length);
      return questions[randomIndex];

    } catch (error) {
      console.error('Error fetching next question:', error);
      return null;
    }
  }

  // Get questions by difficulty level for a specific test
  private async getQuestionsByDifficulty(
    testId: string,
    difficulty: DifficultyLevel
  ): Promise<AdaptiveQuestion[]> {
    const questionsRef = ref(database, `questions/${testId}`);
    const snapshot = await get(questionsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const questionsData = snapshot.val();
    return Object.entries(questionsData)
      .map(([id, data]: [string, any]) => ({
        id,
        ...data,
        difficulty: data.difficulty || 'medium' // Default to medium if not set
      }))
      .filter((q: AdaptiveQuestion) => q.difficulty === difficulty);
  }

  // Fallback strategy: try adjacent difficulty levels
  private async getFallbackQuestions(
    testId: string,
    currentDifficulty: DifficultyLevel,
    askedQuestionIds: string[]
  ): Promise<AdaptiveQuestion[]> {
    const fallbackLevels: DifficultyLevel[] = [];

    // Define fallback order based on current difficulty
    if (currentDifficulty === 'easy') {
      fallbackLevels.push('medium', 'hard');
    } else if (currentDifficulty === 'medium') {
      fallbackLevels.push('easy', 'hard');
    } else if (currentDifficulty === 'hard') {
      fallbackLevels.push('medium', 'easy');
    }

    for (const level of fallbackLevels) {
      const questions = await this.getQuestionsByDifficulty(testId, level);
      const availableQuestions = questions.filter(q => !askedQuestionIds.includes(q.id));

      if (availableQuestions.length > 0) {
        console.log(`Using fallback difficulty: ${level} (original: ${currentDifficulty})`);
        return availableQuestions;
      }
    }

    return [];
  }

  // Last resort: get any available question
  private async getAnyAvailableQuestions(
    testId: string,
    askedQuestionIds: string[]
  ): Promise<AdaptiveQuestion[]> {
    const questionsRef = ref(database, `questions/${testId}`);
    const snapshot = await get(questionsRef);

    if (!snapshot.exists()) {
      return [];
    }

    const questionsData = snapshot.val();
    return Object.entries(questionsData)
      .map(([id, data]: [string, any]) => ({
        id,
        ...data,
        difficulty: (data.difficulty || 'medium') as DifficultyLevel
      }))
      .filter((q: AdaptiveQuestion) => !askedQuestionIds.includes(q.id));
  }

  // Process answer and update adaptive state
  async processAnswer(
    userId: string,
    testId: string,
    questionId: string,
    isCorrect: boolean,
    responseTime?: number
  ): Promise<AdaptiveTestState> {
    const currentState = await this.getAdaptiveState(userId, testId);
    if (!currentState) {
      throw new Error('Adaptive state not found');
    }

    const now = Date.now();
    const actualResponseTime = responseTime || (now - currentState.lastQuestionAt);

    // Update streaks and difficulty
    let newDifficulty = currentState.currentDifficulty;
    let newCorrectStreak = currentState.correctStreak;
    let newWrongStreak = currentState.wrongStreak;

    if (isCorrect) {
      newCorrectStreak += 1;
      newWrongStreak = 0;

      // Check if we should promote difficulty
      if (newCorrectStreak >= ADAPTIVE_CONFIG.CORRECT_THRESHOLD) {
        // 🚀 Check if student qualifies for level skipping
        if (this.shouldSkipLevel(currentState)) {
          newDifficulty = 'hard'; // Skip directly to hard
          console.log(`🚀 Level skipped! Promoted directly to: ${newDifficulty}`);
        } else {
          newDifficulty = this.promoteDifficulty(currentState.currentDifficulty);
          console.log(`Difficulty promoted to: ${newDifficulty}`);
        }
        newCorrectStreak = 0; // Reset streak after promotion
      }

      // Update score
      currentState.score += 1;
      currentState.weightedScore += ADAPTIVE_CONFIG.WEIGHTS[currentState.currentDifficulty];
    } else {
      newWrongStreak += 1;
      newCorrectStreak = 0;

      // Check if we should demote difficulty
      if (newWrongStreak >= ADAPTIVE_CONFIG.WRONG_THRESHOLD) {
        newDifficulty = this.demoteDifficulty(currentState.currentDifficulty);
        newWrongStreak = 0; // Reset streak after demotion
        console.log(`Difficulty demoted to: ${newDifficulty}`);
      }
    }

    // Create difficulty flow entry
    const flowEntry: DifficultyFlowEntry = {
      timestamp: now,
      difficulty: currentState.currentDifficulty,
      questionId,
      wasCorrect: isCorrect,
      responseTime: actualResponseTime,
    };

    // Update state
    const updatedState: AdaptiveTestState = {
      ...currentState,
      currentDifficulty: newDifficulty,
      correctStreak: newCorrectStreak,
      wrongStreak: newWrongStreak,
      askedQuestionIds: [...currentState.askedQuestionIds, questionId],
      difficultyFlow: [...currentState.difficultyFlow, flowEntry],
      lastQuestionAt: now,
    };

    // Save updated state to database
    const stateRef = ref(database, `adaptiveTestStates/${userId}/${testId}`);
    await update(stateRef, updatedState);

    return updatedState;
  }

  // Get difficulty statistics for a test
  async getDifficultyStats(testId: string): Promise<{
    easy: number;
    medium: number;
    hard: number;
    total: number;
  }> {
    const questionsRef = ref(database, `questions/${testId}`);
    const snapshot = await get(questionsRef);

    if (!snapshot.exists()) {
      return { easy: 0, medium: 0, hard: 0, total: 0 };
    }

    const questionsData = snapshot.val();
    const questions = Object.values(questionsData) as AdaptiveQuestion[];

    const stats = {
      easy: questions.filter(q => q.difficulty === 'easy').length,
      medium: questions.filter(q => q.difficulty === 'medium').length,
      hard: questions.filter(q => q.difficulty === 'hard').length,
      total: questions.length,
    };

    return stats;
  }

  // Validate if test has sufficient questions for adaptive testing
  async validateTestForAdaptive(testId: string): Promise<{
    isValid: boolean;
    warnings: string[];
    stats: { easy: number; medium: number; hard: number; total: number };
  }> {
    const stats = await this.getDifficultyStats(testId);
    const warnings: string[] = [];

    if (stats.easy < ADAPTIVE_CONFIG.MIN_QUESTIONS_PER_DIFFICULTY) {
      warnings.push(`Only ${stats.easy} easy questions available (recommended: ${ADAPTIVE_CONFIG.MIN_QUESTIONS_PER_DIFFICULTY}+)`);
    }

    if (stats.medium < ADAPTIVE_CONFIG.MIN_QUESTIONS_PER_DIFFICULTY) {
      warnings.push(`Only ${stats.medium} medium questions available (recommended: ${ADAPTIVE_CONFIG.MIN_QUESTIONS_PER_DIFFICULTY}+)`);
    }

    if (stats.hard < ADAPTIVE_CONFIG.MIN_QUESTIONS_PER_DIFFICULTY) {
      warnings.push(`Only ${stats.hard} hard questions available (recommended: ${ADAPTIVE_CONFIG.MIN_QUESTIONS_PER_DIFFICULTY}+)`);
    }

    const isValid = stats.total > 0 && (stats.easy > 0 || stats.medium > 0 || stats.hard > 0);

    return {
      isValid,
      warnings,
      stats,
    };
  }

  // Get difficulty color for UI display
  getDifficultyColor(difficulty: DifficultyLevel): string {
    const colors = {
      easy: '#10b981', // Green
      medium: '#f59e0b', // Yellow/Orange
      hard: '#ef4444', // Red
    };
    return colors[difficulty];
  }

  // Get difficulty badge style for UI
  getDifficultyBadgeStyle(difficulty: DifficultyLevel): {
    backgroundColor: string;
    color: string;
    borderColor: string;
  } {
    const styles = {
      easy: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        borderColor: '#10b981',
      },
      medium: {
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderColor: '#f59e0b',
      },
      hard: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderColor: '#ef4444',
      },
    };
    return styles[difficulty];
  }
}

// Export singleton instance
export const adaptiveTestService = AdaptiveTestService.getInstance();