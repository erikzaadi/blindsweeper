export type HealthResponse = {
  ok: true;
  app: "blindsweeper";
  version: string;
};

export type Id = string;

export type IsoTimestamp = string;

export type CellCoord = {
  row: number;
  col: number;
};

export type BoardPoint = {
  x: number;
  y: number;
};

export type BoardSize = {
  width: number;
  height: number;
};

export type Profile = {
  id: Id;
  displayName: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  externalProvider?: "google";
  externalSubject?: string;
};

export type MinefieldConfig = {
  rows: number;
  cols: number;
  mineCount: number;
  levelNumber: number;
  seed: string;
  generatorVersion: 1;
  proximityRadiusCells: number;
};

export type LevelStatus = "active" | "exploded" | "completed";

export type LevelState = {
  id: Id;
  runId: Id;
  levelNumber: number;
  config: MinefieldConfig;
  mines: CellCoord[];
  markedCells: CellCoord[];
  status: LevelStatus;
  explosionCell?: CellCoord;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
};

export type GameRunStatus = "active" | "failed" | "completed";

export type GameRun = {
  id: Id;
  profileId: Id;
  status: GameRunStatus;
  currentLevelId: Id;
  startedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
};

export type MoveEvent = {
  levelId: Id;
  point: BoardPoint;
  cell: CellCoord;
  proximity: ProximityResult;
  createdAt: IsoTimestamp;
};

export type GameEventType = "scan_summary" | "pause" | "resume" | "debug";

export type GameEvent = {
  type: GameEventType;
  levelId: Id;
  createdAt: IsoTimestamp;
  payload?: Record<string, unknown>;
};

export type ProximityResult = {
  nearestMine?: CellCoord;
  distanceCells: number;
  intensity: number;
};

export type MarkOutcome = "marked" | "unmarked" | "exploded" | "completed" | "ignored";

export type MarkResult = {
  outcome: MarkOutcome;
  cell: CellCoord;
  level: LevelState;
};

export type LevelResult = {
  status: LevelStatus;
  level: LevelState;
};

export type PlayerStats = {
  profileId: Id;
  runsStarted: number;
  levelsCompleted: number;
  explosions: number;
  highestLevelCompleted: number;
  currentStreak: number;
  bestStreak: number;
};
