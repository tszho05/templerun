import questionBank from "./questionBank.json";
import { validateQuestionSet } from "../questions/QuestionSystem";
import type { QuestionSet } from "../questions/QuestionTypes";
import { assetManifest, type AssetManifest } from "../../render/loaders/assetManifest";

export type GameContent = {
  questionSet: QuestionSet;
  assetManifest: AssetManifest;
};

export function loadGameContent(): GameContent {
  const questionSet = questionBank as QuestionSet;
  const validation = validateQuestionSet(questionSet);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  return {
    questionSet,
    assetManifest
  };
}
