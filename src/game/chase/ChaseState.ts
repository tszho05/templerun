export type MonsterDistanceLevel = "far" | "near" | "caught";

export type ChaseState = {
  isInWrongAnswerDanger: boolean;
  pressure: number;
  monsterDistanceLevel: MonsterDistanceLevel;
  speedModifier: number;
};
