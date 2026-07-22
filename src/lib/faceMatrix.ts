export type FaceSubject = {
  id: string;
  box: { x: number; y: number; width: number; height: number };
  age: number;
  gender: "male" | "female";
  genderProb: number;
  expression: string;
  expressionScore: number;
  expressions: Record<string, number>;
  landmarks?: { x: number; y: number }[];
  score: number;
};

export function isFaceModelsLoaded() {
  return false;
}

export async function loadFaceModels() {
  /* stub */
}

export async function detectSubjects() {
  return [] as FaceSubject[];
}

export function smoothSubjects(prev: FaceSubject[]) {
  return prev;
}

export function expressionBars() {
  return [] as { name: string; score: number }[];
}

export function drawMatrixHud() {
  /* stub */
}
