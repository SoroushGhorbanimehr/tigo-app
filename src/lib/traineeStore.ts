// src/lib/traineeStore.ts

export type TraineeId = string;

const memoryStore: Record<TraineeId, Record<string, string>> = {};

// Get notes for a given trainee (creates empty object if missing)
export function getNotesForTrainee(id: TraineeId): Record<string, string> {
  if (!memoryStore[id]) {
    memoryStore[id] = {};
  }
  return memoryStore[id];
}

// Save notes for a given trainee
export function setNotesForTrainee(id: TraineeId, notes: Record<string, string>) {
  memoryStore[id] = notes;
}