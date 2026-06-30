export const READY_THRESHOLD = 0.35;
export const URGENT_THRESHOLD = 0.7;
export const CRITICAL_THRESHOLD = 0.9;

export const TASK_DEFINITIONS = [
  {
    id: "plant",
    key: "1",
    icon: "🌱",
    name: "Plant Bulbs",
    shortName: "Bulbs",
    baseDuration: 15000,
    color: "#44a971",
    warning: "Bulbs are withering",
  },
  {
    id: "water",
    key: "2",
    icon: "💧",
    name: "Water Flowers",
    shortName: "Water",
    baseDuration: 13500,
    color: "#3e93cf",
    warning: "Flowers are drooping",
  },
  {
    id: "harvest",
    key: "3",
    icon: "🍓",
    name: "Harvest Fruit",
    shortName: "Fruit",
    baseDuration: 16500,
    color: "#cf5372",
    warning: "Fruit is spoiling",
  },
  {
    id: "clear",
    key: "4",
    icon: "🍂",
    name: "Clear Leaves",
    shortName: "Leaves",
    baseDuration: 15000,
    color: "#c98942",
    warning: "Leaves are piling up",
  },
];

export const EVENT_DEFINITIONS = [
  {
    id: "rain",
    icon: "🌧️",
    name: "Light Rain",
    text: "Flowers sip slowly, bulbs wake afterwards.",
    durationRange: [7000, 9500],
    effects: { water: 0.45 },
    afterEffects: [{ taskId: "plant", multiplier: 1.65, duration: 9000 }],
    nudges: [{ taskId: "plant", progress: 0.18 }],
  },
  {
    id: "sun",
    icon: "☀️",
    name: "Hot Sunshine",
    text: "Flowers grow thirsty in the warm glow.",
    durationRange: [6500, 9000],
    effects: { water: 2.25 },
    nudges: [{ taskId: "water", progress: 0.62 }],
  },
  {
    id: "wind",
    icon: "🍃",
    name: "Wind Gust",
    text: "Leaves swirl across the pale stone paths.",
    durationRange: [6500, 9000],
    effects: { clear: 2.35 },
    nudges: [{ taskId: "clear", progress: 0.66 }],
  },
  {
    id: "fairy",
    icon: "🧚",
    name: "Fairy Bloom",
    text: "Berry bushes shimmer and ripen together.",
    durationRange: [6500, 8500],
    effects: { harvest: 2.3, plant: 1.18 },
    nudges: [
      { taskId: "harvest", progress: 0.74 },
      { taskId: "water", progress: 0.48 },
    ],
  },
  {
    id: "spring",
    icon: "🌸",
    name: "Spring Growth",
    text: "Fresh bulbs surface all through the garden.",
    durationRange: [7000, 9500],
    effects: { plant: 2.2, water: 1.25 },
    nudges: [
      { taskId: "plant", progress: 0.76 },
      { taskId: "clear", progress: 0.44 },
    ],
  },
];

export const OBSTACLE_DEFINITIONS = [
  {
    id: "rock",
    label: "rock",
    className: "obstacle-rock",
    kind: "ground",
    width: 52,
    height: 42,
    score: 12,
  },
  {
    id: "fallen-log",
    label: "fallen log",
    className: "obstacle-log",
    kind: "ground",
    width: 86,
    height: 40,
    score: 14,
  },
  {
    id: "stream",
    label: "stream",
    className: "obstacle-stream",
    kind: "ground",
    width: 96,
    height: 24,
    score: 16,
  },
  {
    id: "mushrooms",
    label: "mushrooms",
    className: "obstacle-mushrooms",
    kind: "ground",
    width: 64,
    height: 42,
    score: 12,
  },
  {
    id: "low-branch",
    label: "low branch",
    className: "obstacle-branch",
    kind: "air",
    width: 104,
    height: 34,
    score: 18,
  },
  {
    id: "stone-wall",
    label: "broken wall",
    className: "obstacle-wall",
    kind: "ground",
    width: 72,
    height: 54,
    score: 18,
  },
  {
    id: "flower-pot",
    label: "flower pot",
    className: "obstacle-pot",
    kind: "ground",
    width: 48,
    height: 48,
    score: 12,
  },
  {
    id: "hedge",
    label: "hedge",
    className: "obstacle-hedge",
    kind: "ground",
    width: 88,
    height: 50,
    score: 16,
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
  return clamp(260 + seconds * 6.2, 260, 585);
}

export function getSpawnDelay(elapsedMs, rng = Math.random) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const ease = clamp(seconds / 90, 0, 1);
  const min = 1.85 - ease * 0.98;
  const max = 2.75 - ease * 1.18;
  return randomBetween(min, max, rng) * 1000;
}

export function getEventDelay(elapsedMs, rng = Math.random) {
  const seconds = Math.max(0, elapsedMs) / 1000;
  const ease = clamp(seconds / 120, 0, 1);
  return randomBetween(14500 - ease * 2800, 23000 - ease * 5000, rng);
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
  const difficultyMultiplier = 1 + Math.min(level - 1, 12) * 0.065;
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
    return 70;
  }

  if (task.progress < CRITICAL_THRESHOLD) {
    return 48;
  }

  return 24;
}

export function resetTask(task, rng = Math.random) {
  return {
    ...task,
    progress: 0,
    pulse: 460,
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
