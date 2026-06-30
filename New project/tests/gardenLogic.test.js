import test from "node:test";
import assert from "node:assert/strict";
import {
  READY_THRESHOLD,
  TASK_DEFINITIONS,
  canCompleteTask,
  createTaskState,
  getDifficultyLevel,
  getSpawnDelay,
  getTaskCompletionScore,
  getTaskStatus,
  rectsOverlap,
  resetTask,
  updateTaskProgress,
} from "../src/gameLogic.js";

const fixedRandom = () => 0.5;

test("difficulty increases every twenty seconds", () => {
  assert.equal(getDifficultyLevel(0), 1);
  assert.equal(getDifficultyLevel(19999), 1);
  assert.equal(getDifficultyLevel(20000), 2);
  assert.equal(getDifficultyLevel(62500), 4);
});

test("garden task progress fills over time and becomes ready", () => {
  const task = createTaskState(TASK_DEFINITIONS[0], fixedRandom);
  const updated = updateTaskProgress(task, 6000, 0);

  assert.ok(updated.progress > READY_THRESHOLD);
  assert.equal(getTaskStatus(updated.progress), "ready");
  assert.equal(canCompleteTask(updated), true);
});

test("garden event multipliers speed up only affected tasks", () => {
  const waterTask = createTaskState(TASK_DEFINITIONS[1], fixedRandom);
  const normal = updateTaskProgress(waterTask, 2000, 0);
  const hotSun = updateTaskProgress(waterTask, 2000, 0, { water: 2 });

  assert.ok(hotSun.progress > normal.progress * 1.9);
});

test("earlier task completion earns more points", () => {
  const task = createTaskState(TASK_DEFINITIONS[2], fixedRandom);
  const ready = { ...task, progress: 0.42 };
  const urgent = { ...task, progress: 0.82 };
  const critical = { ...task, progress: 0.95 };

  assert.ok(getTaskCompletionScore(ready) > getTaskCompletionScore(urgent));
  assert.ok(getTaskCompletionScore(urgent) > getTaskCompletionScore(critical));
});

test("resetting a task clears progress but keeps its identity", () => {
  const task = { ...createTaskState(TASK_DEFINITIONS[3], fixedRandom), progress: 0.8 };
  const reset = resetTask(task, fixedRandom);

  assert.equal(reset.id, task.id);
  assert.equal(reset.progress, 0);
  assert.ok(reset.pulse > 0);
});

test("obstacle spawn delay tightens as the run gets longer", () => {
  const early = getSpawnDelay(0, fixedRandom);
  const late = getSpawnDelay(120000, fixedRandom);

  assert.ok(late < early);
});

test("rectangle overlap detects runner collisions", () => {
  assert.equal(
    rectsOverlap(
      { x: 10, y: 10, width: 30, height: 40 },
      { x: 34, y: 20, width: 30, height: 30 },
    ),
    true,
  );
  assert.equal(
    rectsOverlap(
      { x: 10, y: 10, width: 30, height: 40 },
      { x: 44, y: 20, width: 30, height: 30 },
    ),
    false,
  );
});
