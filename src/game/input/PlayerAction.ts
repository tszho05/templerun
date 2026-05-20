export type PlayerAction =
  | { type: "moveLeft" }
  | { type: "moveRight" }
  | { type: "jump" }
  | { type: "answer"; choice: string }
  | { type: "restart" };
