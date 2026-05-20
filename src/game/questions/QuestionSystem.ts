import type { RandomSource } from "../shared/random";
import { shuffle } from "../shared/random";
import type { GameConfig } from "../simulation/GameConfig";
import type { AnswerResult, PresentedQuestion, Question, QuestionSet } from "./QuestionTypes";

export class QuestionSystem {
  private readonly questionSet: QuestionSet;
  private readonly random: RandomSource;
  private queue: Question[];

  constructor(questionSet: QuestionSet, random: RandomSource) {
    const validation = validateQuestionSet(questionSet);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    this.questionSet = normalizeQuestionSet(questionSet);
    this.random = random;
    this.queue = [];
    this.refillQueue();
  }

  shouldTriggerQuestion(distanceMeters: number, nextQuestionAtMeters: number): boolean {
    return distanceMeters >= nextQuestionAtMeters;
  }

  presentQuestion(nowMs: number, config: GameConfig): PresentedQuestion {
    if (this.queue.length === 0) {
      this.refillQueue();
    }

    const question = this.queue.shift();
    if (!question) {
      throw new Error("No questions are available.");
    }

    return {
      ...question,
      choices: this.createChoices(question.answer, config.choiceCount),
      deadlineAtMs: nowMs + config.answerTimeLimitSeconds * 1000
    };
  }

  answerQuestion(question: PresentedQuestion, choice: string): AnswerResult {
    return {
      status: choice === question.answer ? "correct" : "wrong",
      questionId: question.id,
      answer: question.answer,
      selectedChoice: choice
    };
  }

  getTimeoutResult(question: PresentedQuestion): AnswerResult {
    return {
      status: "timeout",
      questionId: question.id,
      answer: question.answer,
      selectedChoice: null
    };
  }

  isTimedOut(question: PresentedQuestion, nowMs: number): boolean {
    return nowMs >= question.deadlineAtMs;
  }

  reset(): void {
    this.queue = [];
    this.refillQueue();
  }

  private createChoices(answer: string, choiceCount: number): string[] {
    const distractors = this.questionSet.vocabularyPool.filter((word) => word !== answer);
    const chosenDistractors = shuffle(distractors, this.random).slice(0, choiceCount - 1);
    return shuffle([answer, ...chosenDistractors], this.random);
  }

  private refillQueue(): void {
    this.queue = shuffle(this.questionSet.questions, this.random);
  }
}

export type QuestionSetValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateQuestionSet(questionSet: QuestionSet): QuestionSetValidationResult {
  const vocabulary = new Set(questionSet.vocabularyPool.map((word) => word.trim()).filter(Boolean));

  if (vocabulary.size < 3) {
    return { ok: false, message: "Question vocabularyPool must contain at least 3 unique words." };
  }

  if (questionSet.questions.length === 0) {
    return { ok: false, message: "Question set must include at least one question." };
  }

  for (const question of questionSet.questions) {
    if (!question.id.trim()) {
      return { ok: false, message: "Question id cannot be empty." };
    }
    if (!question.sentence.includes("____")) {
      return { ok: false, message: `Question ${question.id} sentence must include ____.` };
    }
    if (!vocabulary.has(question.answer)) {
      return { ok: false, message: `Question ${question.id} answer is missing from vocabularyPool.` };
    }
  }

  return { ok: true };
}

function normalizeQuestionSet(questionSet: QuestionSet): QuestionSet {
  return {
    vocabularyPool: [...new Set(questionSet.vocabularyPool.map((word) => word.trim()).filter(Boolean))],
    questions: questionSet.questions.map((question) => ({ ...question }))
  };
}
