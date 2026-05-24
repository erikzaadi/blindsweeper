import type {
  BoardPoint,
  BoardSize,
  CellCoord,
  LevelState,
  MarkHint,
  MarkResult,
  MinefieldConfig,
  ProximityResult,
} from "./types";

export type DifficultyCurve = {
  baseRows: number;
  baseCols: number;
  baseMineCount: number;
  mineIncrement: number;
  maxDensity: number;
  boardGrowthRows: number;
  boardGrowthCols: number;
  proximityRadiusCells: number;
};

export const DEFAULT_DIFFICULTY_CURVE: DifficultyCurve = {
  baseRows: 10,
  baseCols: 10,
  baseMineCount: 6,
  mineIncrement: 1,
  maxDensity: 0.16,
  boardGrowthRows: 2,
  boardGrowthCols: 2,
  proximityRadiusCells: 4,
};

export function buildMinefieldConfig(
  levelNumber: number,
  seed: string,
  curve: DifficultyCurve = DEFAULT_DIFFICULTY_CURVE,
): MinefieldConfig {
  assertPositiveInteger(levelNumber, "levelNumber");
  validateDifficultyCurve(curve);

  let rows = curve.baseRows;
  let cols = curve.baseCols;
  let mineCount = curve.baseMineCount;

  for (let currentLevel = 2; currentLevel <= levelNumber; currentLevel += 1) {
    const nextMineCount = mineCount + curve.mineIncrement;
    const maxMinesForBoard = Math.floor(rows * cols * curve.maxDensity);

    if (nextMineCount <= maxMinesForBoard) {
      mineCount = nextMineCount;
    } else {
      rows += curve.boardGrowthRows;
      cols += curve.boardGrowthCols;
      mineCount = nextMineCount;
    }
  }

  return {
    rows,
    cols,
    mineCount,
    levelNumber,
    seed,
    generatorVersion: 1,
    proximityRadiusCells: curve.proximityRadiusCells,
  };
}

export function generateMineCells(config: MinefieldConfig): CellCoord[] {
  validateMinefieldConfig(config);

  const cells: CellCoord[] = [];
  for (let row = 0; row < config.rows; row += 1) {
    for (let col = 0; col < config.cols; col += 1) {
      cells.push({ row, col });
    }
  }

  const random = createSeededRandom(`${config.seed}:v${config.generatorVersion}:${config.rows}x${config.cols}:${config.mineCount}`);
  for (let index = cells.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = cells[index];
    const swap = cells[swapIndex];
    cells[index] = swap;
    cells[swapIndex] = current;
  }

  return cells.slice(0, config.mineCount).sort(compareCells);
}

export function pointToCell(point: BoardPoint, board: BoardSize, config: MinefieldConfig): CellCoord {
  validateBoardSize(board);
  validateMinefieldConfig(config);

  const col = clamp(Math.floor((point.x / board.width) * config.cols), 0, config.cols - 1);
  const row = clamp(Math.floor((point.y / board.height) * config.rows), 0, config.rows - 1);

  return { row, col };
}

export function computeProximity(
  point: BoardPoint,
  board: BoardSize,
  config: MinefieldConfig,
  mines: CellCoord[],
  markedCells: CellCoord[] = [],
): ProximityResult {
  validateBoardSize(board);
  validateMinefieldConfig(config);

  const activeMines = mines.filter((mine) => !containsCell(markedCells, mine));
  if (activeMines.length === 0) {
    return {
      distanceCells: Number.POSITIVE_INFINITY,
      intensity: 0,
    };
  }

  const fractionalCol = (clamp(point.x, 0, board.width) / board.width) * config.cols;
  const fractionalRow = (clamp(point.y, 0, board.height) / board.height) * config.rows;

  let nearestMine = activeMines[0];
  let nearestDistance = distanceToMineCenter(fractionalRow, fractionalCol, nearestMine);

  for (const mine of activeMines.slice(1)) {
    const distance = distanceToMineCenter(fractionalRow, fractionalCol, mine);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestMine = mine;
    }
  }

  return {
    nearestMine,
    distanceCells: nearestDistance,
    intensity: clamp(1 - nearestDistance / config.proximityRadiusCells, 0, 1),
  };
}

export function resolveDragCollision(
  cell: CellCoord,
  mines: CellCoord[],
  markedCells: CellCoord[] = [],
): { exploded: boolean; cell?: CellCoord } {
  if (containsCell(mines, cell) && !containsCell(markedCells, cell)) {
    return {
      exploded: true,
      cell,
    };
  }

  return {
    exploded: false,
  };
}

export function resolveMark(level: LevelState, cell: CellCoord, now: string): MarkResult {
  if (level.status !== "active") {
    return {
      outcome: "ignored",
      cell,
      level,
    };
  }

  if (!isCellInBounds(cell, level.config)) {
    return {
      outcome: "ignored",
      cell,
      level,
    };
  }

  if (containsCell(level.markedCells, cell)) {
    return {
      outcome: "ignored",
      cell,
      level,
    };
  }

  const markedCells = [...level.markedCells, cell].sort(compareCells);
  const markHints = [...(level.markHints ?? []), buildMarkHint(cell, level.mines, level.config)].sort((a, b) => (
    compareCells(a.cell, b.cell)
  ));
  const completed = areAllMinesMarked(level.mines, markedCells);

  return {
    outcome: completed ? "completed" : "marked",
    cell,
    level: {
      ...level,
      markedCells,
      markHints,
      status: completed ? "completed" : "active",
      updatedAt: now,
      completedAt: completed ? now : undefined,
    },
  };
}

export function buildMarkHint(cell: CellCoord, mines: CellCoord[], config: MinefieldConfig): MarkHint {
  validateMinefieldConfig(config);

  if (mines.length === 0) {
    return {
      cell,
      distanceCells: Number.POSITIVE_INFINITY,
      intensity: 0,
    };
  }

  let nearestMine = mines[0];
  let nearestDistance = distanceToMineCenter(cell.row + 0.5, cell.col + 0.5, nearestMine);

  for (const mine of mines.slice(1)) {
    const distance = distanceToMineCenter(cell.row + 0.5, cell.col + 0.5, mine);
    if (distance < nearestDistance) {
      nearestMine = mine;
      nearestDistance = distance;
    }
  }

  return {
    cell,
    nearestMine,
    distanceCells: nearestDistance,
    intensity: clamp(1 - nearestDistance / config.proximityRadiusCells, 0, 1),
  };
}

export function isSameCell(a: CellCoord, b: CellCoord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function containsCell(cells: CellCoord[], target: CellCoord): boolean {
  return cells.some((cell) => isSameCell(cell, target));
}

export function areAllMinesMarked(mines: CellCoord[], markedCells: CellCoord[]): boolean {
  return mines.every((mine) => containsCell(markedCells, mine));
}

export function isCellInBounds(cell: CellCoord, config: MinefieldConfig): boolean {
  return cell.row >= 0 && cell.row < config.rows && cell.col >= 0 && cell.col < config.cols;
}

function validateMinefieldConfig(config: MinefieldConfig): void {
  assertPositiveInteger(config.rows, "rows");
  assertPositiveInteger(config.cols, "cols");
  assertPositiveInteger(config.mineCount, "mineCount");
  assertPositiveInteger(config.levelNumber, "levelNumber");
  assertPositiveInteger(config.generatorVersion, "generatorVersion");

  if (config.mineCount >= config.rows * config.cols) {
    throw new Error("mineCount must be lower than total cell count");
  }

  if (config.proximityRadiusCells <= 0) {
    throw new Error("proximityRadiusCells must be greater than 0");
  }
}

function validateDifficultyCurve(curve: DifficultyCurve): void {
  assertPositiveInteger(curve.baseRows, "baseRows");
  assertPositiveInteger(curve.baseCols, "baseCols");
  assertPositiveInteger(curve.baseMineCount, "baseMineCount");
  assertPositiveInteger(curve.mineIncrement, "mineIncrement");
  assertPositiveInteger(curve.boardGrowthRows, "boardGrowthRows");
  assertPositiveInteger(curve.boardGrowthCols, "boardGrowthCols");

  if (curve.maxDensity <= 0 || curve.maxDensity >= 1) {
    throw new Error("maxDensity must be between 0 and 1");
  }

  if (curve.proximityRadiusCells <= 0) {
    throw new Error("proximityRadiusCells must be greater than 0");
  }
}

function validateBoardSize(board: BoardSize): void {
  if (board.width <= 0 || board.height <= 0) {
    throw new Error("board width and height must be greater than 0");
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function compareCells(a: CellCoord, b: CellCoord): number {
  if (a.row !== b.row) {
    return a.row - b.row;
  }

  return a.col - b.col;
}

function distanceToMineCenter(row: number, col: number, mine: CellCoord): number {
  const rowDelta = row - (mine.row + 0.5);
  const colDelta = col - (mine.col + 0.5);

  return Math.sqrt(rowDelta * rowDelta + colDelta * colDelta);
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
