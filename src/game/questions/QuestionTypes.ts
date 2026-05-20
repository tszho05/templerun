export type QuestionSet = {
  vocabularyPool: string[];
  questions: Question[];
};

export type Question = {
  id: string;
  sentence: string;
  answer: string;
};

export type PresentedQuestion = {
  id: string;
  sentence: string;
  answer: string;
  choices: string[];
  deadlineAtMs: number;
};

export type AnswerResultStatus = "correct" | "wrong" | "timeout";

export type AnswerResult = {
  status: AnswerResultStatus;
  questionId: string;
  answer: string;
  selectedChoice: string | null;
};
