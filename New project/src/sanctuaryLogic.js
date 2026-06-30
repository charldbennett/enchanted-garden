export const READY_THRESHOLD = 0.35;
export const URGENT_THRESHOLD = 0.7;
export const CRITICAL_THRESHOLD = 0.9;

export const TASK_DEFINITIONS = [
  {
    id: "egg",
    key: "1",
    figure: "egg",
    iconLabel: "egg",
    name: "Place Egg",
    shortName: "Egg",
    baseDuration: 15000,
    color: "#d89f67",
    warning: "The egg is getting cold",
  },
  {
    id: "feed",
    key: "2",
    figure: "hatchling",
    iconLabel: "hatchling",
    name: "Feed Hatchling",
    shortName: "Feed",
    baseDuration: 13600,
    color: "#69a998",
    warning: "A hatchling is hungry",
  },
  {
    id: "groom",
    key: "3",
    figure: "dragon",
    iconLabel: "young dragon",
    name: "Groom Dragon",
    shortName: "Groom",
    baseDuration: 16300,
    color: "#9d91cf",
    warning: "A dragon is restless",
  },
  {
    id: "tidy",
    key: "4",
    figure: "nest",
    iconLabel: "nest",
    name: "Tidy Nest",
    shortName: "Nest",
    baseDuration: 14800,
    color: "#c6a35a",
    warning: "The nests are messy",
  },
];

export const EVENT_DEFINITIONS = [
  {
    id: "zoomies",
    icon: "\u{1F30B}",
    name: "Dragon Zoomies",
    text: "Little dragons skitter between nests.",
    durationRange: [6500, 9000],
    effects: { tidy: 2.4, groom: 1.25 },
    nudges: [
      { taskId: "tidy", progress: 0.7 },
      { taskId: "groom", progress: 0.48 },
    ],
  },
  {
    id: "meteor",
    icon: "\u{1F320}",
    name: "Meteor Shower",
    text: "Stardust warms several eggs at once.",
    durationRange: [7000, 9400],
    effects: { egg: 2.25, feed: 1.12 },
    afterEffects: [{ taskId: "egg", multiplier: 1.45, duration: 8000 }],
    nudges: [{ taskId: "egg", progress: 0.76 }],
  },
  {
    id: "butterflies",
    icon: "\u{1F98B}",
    name: "Butterfly Migration",
    text: "Curious dragons need extra attention.",
    durationRange: [6500, 8500],
    effects: { groom: 2.35, tidy: 1.18 },
    nudges: [
      { taskId: "groom", progress: 0.72 },
      { taskId: "tidy", progress: 0.42 },
    ],
  },
  {
    id: "moonlight",
    icon: "\u{1F319}",
    name: "Moonlight Festival",
    text: "The tiny dragons work up a moonlit appetite.",
    durationRange: [6500, 9200],
    effects: { feed: 2.3 },
    nudges: [{ taskId: "feed", progress: 0.68 }],
  },
  {
    id: "spring",
    icon: "\u{1F33F}",
    name: "Spring Bloom",
    text: "The whole sanctuary hums with new life.",
    durationRange: [7000, 9800],
    effects: { egg: 1.45, feed: 1.35, groom: 1.35, tidy: 1.35 },
    nudges: [
      { taskId: "egg", progress: 0.52 },
      { taskId: "feed", progress: 0.46 },
      { taskId: "groom", progress: 0.42 },
    ],
  },
];

export const OBSTACLE_DEFINITIONS = [
  {
    id: "fallen-branch",
    label: "fallen branch",
    className: "obstacle-branch-fallen",
    kind: "ground",
    width: 84,
    height: 34,
    score: 13,
  },
  {
    id: "rock",
    label: "mossy rock",
    className: "obstacle-rock",
    kind: "ground",
    width: 54,
    height: 44,
    score: 12,
  },
  {
    id: "stream",
    label: "small stream",
    className: "obstacle-stream",
    kind: "ground",
    width: 100,
    height: 24,
    score: 16,
  },
  {
    id: "mushrooms",
    label: "mushrooms",
    className: "obstacle-mushrooms",
    kind: "ground",
    width: 66,
    height: 42,
    score: 12,
  },
  {
    id: "sleeping-dragon",
    label: "sleeping dragon",
    className: "obstacle-sleeping-dragon",
    kind: "ground",
    width: 96,
    height: 52,
    score: 18,
  },
  {
    id: "fruit-basket",
    label: "dragon fruit basket",
    className: "obstacle-fruit-basket",
    kind: "ground",
    width: 56,
    height: 48,
    score: 12,
  },
  {
    id: "tree-root",
    label: "tree root",
    className: "obstacle-tree-root",
    kind: "ground",
    width: 88,
    height: 35,
    score: 14,
  },
  {
    id: "broken-bridge",
    label: "low bridge beam",
    className: "obstacle-bridge",
    kind: "air",
    width: 118,
    height: 34,
    score: 19,
  },
];

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function randomBetween(min, max, rng = Math.random) {
  return min + (max - min) * rng();
}

export function chooseRandom(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}

export function formatTime(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function getDifficultyLevel(elapsedMs) {
  return 1 + Math.floor(Math.max(0, elapsedMs) / 20000);
}

export function getSpeed(elapsedMs) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return clamp(255 + seconds * 6.3, 255, 590);
}

export function getSpawnDelay(elapsedMs, rng = Math.random) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const ease = clamp(seconds / 92, 0, 1);
  const min = 1.9 - ease * 1.02;
  const max = 2.82 - ease * 1.22;
  return randomBetween(min, max, rng) * 1000;
}

export function getEventDelay(elapsedMs, rng = Math.random) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const ease = clamp(seconds / 120, 0, 1);
  return randomBetween(14200 - ease * 2800, 22600 - ease * 5000, rng);
}

export function createTaskState(definition, rng = Math.random) {
  return {
    ...definition,
    progress: 0,
    neglected: 0,
    pulse: 0,
    randomFactor: randomBetween(0.86, 1.18, rng),
    afterEffectMs: 0,
    afterMultiplier: 1,
  };
}

export function getTaskStatus(progress) {
  if (progress >= CRITICAL_THRESHOLD) {
    return "critical";
  }

  if (progress >= URGENT_THRESHOLD) {
    return "urgent";
  }

  if (progress >= READY_THRESHOLD) {
    return "ready";
  }

  return "calm";
}

export function getTaskRate(task, elapsedMs, eventMultipliers = {}) {
  const level = getDifficultyLevel(elapsedMs);
  const difficultyMultiplier = 1 + Math.min(level - 1, 12) * 0.066;
  const eventMultiplier = eventMultipliers[task.id] ?? 1;
  const afterMultiplier = task.afterEffectMs > 0 ? task.afterMultiplier : 1;
  const duration = Math.max(6200, task.baseDuration * task.randomFactor);
  return (difficultyMultiplier * eventMultiplier * afterMultiplier) / duration;
}

export function updateTaskProgress(task, deltaMs, elapsedMs, eventMultipliers = {}) {
  const nextTask = { ...task };
  nextTask.progress = clamp(
    nextTask.progress + deltaMs * getTaskRate(nextTask, elapsedMs, eventMultipliers),
    0,
    1,
  );
  nextTask.pulse = Math.max(0, nextTask.pulse - deltaMs);

  if (nextTask.afterEffectMs > 0) {
    nextTask.afterEffectMs = Math.max(0, nextTask.afterEffectMs - deltaMs);
    if (nextTask.afterEffectMs === 0) {
      nextTask.afterMultiplier = 1;
    }
  }

  return nextTask;
}

export function canCompleteTask(task) {
  return task.progress >= READY_THRESHOLD;
}

export function getTaskCompletionScore(task) {
  if (!canCompleteTask(task)) {
    return 0;
  }

  if (task.progress < URGENT_THRESHOLD) {
    return 74;
  }

  if (task.progress < CRITICAL_THRESHOLD) {
    return 50;
  }

  return 24;
}

export function resetTask(task, rng = Math.random) {
  return {
    ...task,
    progress: 0,
    pulse: 500,
    randomFactor: randomBetween(0.86, 1.18, rng),
  };
}

export function neglectTask(task, rng = Math.random) {
  return {
    ...resetTask(task, rng),
    neglected: task.neglected + 1,
  };
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
