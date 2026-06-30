import {
  EVENT_DEFINITIONS,
  OBSTACLE_DEFINITIONS,
  TASK_DEFINITIONS,
  canCompleteTask,
  chooseRandom,
  clamp,
  createTaskState,
  formatTime,
  getDifficultyLevel,
  getEventDelay,
  getSpawnDelay,
  getSpeed,
  getTaskCompletionScore,
  getTaskStatus,
  neglectTask,
  randomBetween,
  rectsOverlap,
  resetTask,
  updateTaskProgress,
} from "./gameLogic.js";

const BEST_SCORE_KEY = "enchanted-garden-best-score";
const TUTORIAL_KEY = "enchanted-garden-tutorial-seen";
const MOTION_KEY = "enchanted-garden-reduce-motion";
const TASK_ICONS = {
  plant: "\u{1F331}",
  water: "\u{1F4A7}",
  harvest: "\u{1F353}",
  clear: "\u{1F342}",
};
const EVENT_ICONS = {
  rain: "\u{1F327}\uFE0F",
  sun: "\u2600\uFE0F",
  wind: "\u{1F343}",
  fairy: "\u{1F9DA}",
  spring: "\u{1F338}",
};

class AudioManager {
  constructor() {
    this.context = null;
    this.enabled = true;
  }

  async unlock() {
    if (!this.enabled) {
      return;
    }

    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }
  }

  playJump() {
    this.playTone({ frequency: 520, endFrequency: 740, duration: 0.12, type: "sine", volume: 0.035 });
  }

  playTask() {
    this.playArpeggio([520, 660, 780], 0.045, "triangle", 0.028);
  }

  playPoint() {
    this.playTone({ frequency: 880, duration: 0.08, type: "sine", volume: 0.018 });
  }

  playEvent() {
    this.playArpeggio([392, 523, 659, 784], 0.07, "sine", 0.024);
  }

  playCollision() {
    this.playTone({ frequency: 180, endFrequency: 90, duration: 0.24, type: "triangle", volume: 0.045 });
  }

  playNeglect() {
    this.playTone({ frequency: 260, endFrequency: 180, duration: 0.16, type: "sine", volume: 0.026 });
  }

  playTone({ frequency, endFrequency = frequency, duration, type, volume }) {
    if (!this.context || this.context.state !== "running") {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  playArpeggio(notes, step, type, volume) {
    notes.forEach((frequency, index) => {
      window.setTimeout(() => {
        this.playTone({ frequency, duration: step * 1.9, type, volume });
      }, index * step * 1000);
    });
  }
}

class Runner {
  constructor(element, stage) {
    this.element = element;
    this.stage = stage;
    this.width = 54;
    this.height = 86;
    this.duckHeight = 48;
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.velocityY = 0;
    this.grounded = true;
    this.ducking = false;
    this.updateLayout();
  }

  updateLayout() {
    this.stageRect = this.stage.getBoundingClientRect();
    this.groundY = this.stageRect.height * 0.735;
    this.x = Math.max(68, Math.min(152, this.stageRect.width * 0.18));
    this.y = this.groundY - this.height;
    this.render();
  }

  jump() {
    if (!this.grounded || this.ducking) {
      return false;
    }

    this.velocityY = -760;
    this.grounded = false;
    return true;
  }

  setDucking(isDucking) {
    this.ducking = isDucking && this.grounded;
    this.element.classList.toggle("runner--ducking", this.ducking);
  }

  update(deltaMs) {
    const deltaSeconds = deltaMs / 1000;
    const height = this.ducking ? this.duckHeight : this.height;
    const floorY = this.groundY - height;

    if (!this.grounded) {
      this.velocityY += 2200 * deltaSeconds;
      this.y += this.velocityY * deltaSeconds;

      if (this.y >= this.groundY - this.height) {
        this.y = this.groundY - this.height;
        this.velocityY = 0;
        this.grounded = true;
      }
    } else {
      this.y = floorY;
    }

    this.render();
  }

  render() {
    const height = this.ducking ? this.duckHeight : this.height;
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${height}px`;
    this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  }

  getCollisionBox() {
    const height = this.ducking ? this.duckHeight : this.height;
    return {
      x: this.x + 10,
      y: this.y + 8,
      width: this.width - 20,
      height: height - 12,
    };
  }
}

class Obstacle {
  constructor(definition, layer, stage, rng = Math.random) {
    this.definition = definition;
    this.layer = layer;
    this.stage = stage;
    this.x = stage.getBoundingClientRect().width + randomBetween(30, 90, rng);
    this.width = definition.width * randomBetween(0.92, 1.12, rng);
    this.height = definition.height * randomBetween(0.94, 1.1, rng);
    this.passed = false;

    this.element = document.createElement("div");
    this.element.className = `obstacle ${definition.className}`;
    this.element.setAttribute("aria-label", definition.label);
    this.layer.append(this.element);
    this.render();
  }

  update(deltaMs, speed) {
    this.x -= speed * (deltaMs / 1000);
    this.render();
  }

  render() {
    const stageHeight = this.stage.getBoundingClientRect().height;
    const groundY = stageHeight * 0.735;
    const y = this.definition.kind === "air" ? groundY - 140 : groundY - this.height + 5;

    this.y = y;
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
    this.element.style.transform = `translate3d(${this.x}px, ${this.y}px, 0)`;
  }

  getCollisionBox() {
    const padding = this.definition.kind === "air" ? 6 : 8;
    return {
      x: this.x + padding,
      y: this.y + padding,
      width: this.width - padding * 2,
      height: this.height - padding * 2,
    };
  }

  remove() {
    this.element.remove();
  }
}

class ObstacleManager {
  constructor(layer, stage, rng = Math.random) {
    this.layer = layer;
    this.stage = stage;
    this.rng = rng;
    this.obstacles = [];
    this.spawnTimer = 1200;
  }

  reset() {
    this.obstacles.forEach((obstacle) => obstacle.remove());
    this.obstacles = [];
    this.spawnTimer = 1350;
  }

  update(deltaMs, elapsedMs, speed, runnerBox) {
    this.spawnTimer -= deltaMs;

    if (this.spawnTimer <= 0) {
      this.spawn(elapsedMs);
      this.spawnTimer = getSpawnDelay(elapsedMs, this.rng);
    }

    let avoidedScore = 0;
    let hit = null;

    this.obstacles.forEach((obstacle) => {
      obstacle.update(deltaMs, speed);

      if (!obstacle.passed && obstacle.x + obstacle.width < runnerBox.x) {
        obstacle.passed = true;
        avoidedScore += obstacle.definition.score;
      }

      if (!hit && rectsOverlap(runnerBox, obstacle.getCollisionBox())) {
        hit = obstacle;
      }
    });

    this.obstacles = this.obstacles.filter((obstacle) => {
      const keep = obstacle.x + obstacle.width > -120;
      if (!keep) {
        obstacle.remove();
      }
      return keep;
    });

    return { hit, avoidedScore };
  }

  spawn(elapsedMs) {
    const seconds = elapsedMs / 1000;
    const available =
      seconds < 18
        ? OBSTACLE_DEFINITIONS.filter((obstacle) => obstacle.kind === "ground" && obstacle.id !== "stone-wall")
        : OBSTACLE_DEFINITIONS;
    const definition = chooseRandom(available, this.rng);
    this.obstacles.push(new Obstacle(definition, this.layer, this.stage, this.rng));
  }
}

class TaskManager {
  constructor(row, rng = Math.random) {
    this.row = row;
    this.rng = rng;
    this.tasks = TASK_DEFINITIONS.map((definition) => createTaskState(definition, rng));
    this.elements = new Map();
    this.renderShell();
  }

  renderShell() {
    this.row.innerHTML = "";
    this.tasks.forEach((task) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "task-panel";
      button.dataset.task = task.id;
      button.style.setProperty("--task-color", task.color);
      button.setAttribute("aria-label", `${task.name}, key ${task.key}`);
      button.innerHTML = `
        <span class="task-icon" aria-hidden="true">${TASK_ICONS[task.id] ?? task.icon}</span>
        <span class="task-copy">
          <span class="task-name">${task.name}</span>
          <span class="task-state">Calm</span>
        </span>
        <span class="task-key" aria-hidden="true">${task.key}</span>
        <span class="task-meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <span class="task-fill"></span>
        </span>
      `;
      this.row.append(button);
      this.elements.set(task.id, button);
    });
  }

  reset() {
    this.tasks = TASK_DEFINITIONS.map((definition) => createTaskState(definition, this.rng));
    this.render();
  }

  update(deltaMs, elapsedMs, eventMultipliers) {
    const neglected = [];

    this.tasks = this.tasks.map((task) => {
      const nextTask = updateTaskProgress(task, deltaMs, elapsedMs, eventMultipliers);

      if (nextTask.progress >= 1) {
        neglected.push(nextTask);
        return neglectTask(nextTask, this.rng);
      }

      return nextTask;
    });

    return neglected;
  }

  completeByKey(key) {
    const task = this.tasks.find((candidate) => candidate.key === key);

    if (!task || !canCompleteTask(task)) {
      return null;
    }

    const score = getTaskCompletionScore(task);
    this.tasks = this.tasks.map((candidate) =>
      candidate.id === task.id ? resetTask(candidate, this.rng) : candidate,
    );
    return { task, score };
  }

  nudge(taskId, progress) {
    this.tasks = this.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      return {
        ...task,
        progress: Math.max(task.progress, progress),
        pulse: 620,
      };
    });
  }

  applyAfterEffect(taskId, multiplier, duration) {
    this.tasks = this.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      return {
        ...task,
        afterMultiplier: multiplier,
        afterEffectMs: duration,
      };
    });
  }

  render() {
    this.tasks.forEach((task) => {
      const panel = this.elements.get(task.id);
      if (!panel) {
        return;
      }

      const percent = Math.round(task.progress * 100);
      const status = getTaskStatus(task.progress);
      panel.dataset.status = status;
      panel.classList.toggle("task-panel--pulse", task.pulse > 0);
      panel.style.setProperty("--task-progress", `${percent}%`);
      panel.querySelector(".task-state").textContent = formatTaskStatus(status);
      panel.querySelector(".task-meter").setAttribute("aria-valuenow", String(percent));
    });
  }
}

class EventManager {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.active = null;
    this.elapsed = 0;
    this.nextTimer = 17000;
    this.lastEventId = null;
  }

  reset() {
    this.active = null;
    this.elapsed = 0;
    this.nextTimer = 17500;
    this.lastEventId = null;
  }

  update(deltaMs, elapsedMs, taskManager) {
    if (this.active) {
      this.active.remaining -= deltaMs;

      if (this.active.remaining <= 0) {
        this.active.definition.afterEffects?.forEach((effect) => {
          taskManager.applyAfterEffect(effect.taskId, effect.multiplier, effect.duration);
        });
        const finished = this.active.definition;
        this.active = null;
        this.nextTimer = getEventDelay(elapsedMs, this.rng);
        return { started: null, finished };
      }

      return { started: null, finished: null };
    }

    this.nextTimer -= deltaMs;

    if (this.nextTimer <= 0 && elapsedMs > 14000) {
      const definition = this.chooseEvent();
      const [minDuration, maxDuration] = definition.durationRange;
      this.active = {
        definition,
        remaining: randomBetween(minDuration, maxDuration, this.rng),
      };
      this.lastEventId = definition.id;
      definition.nudges?.forEach((nudge) => taskManager.nudge(nudge.taskId, nudge.progress));
      return { started: definition, finished: null };
    }

    return { started: null, finished: null };
  }

  chooseEvent() {
    const options = EVENT_DEFINITIONS.filter((event) => event.id !== this.lastEventId);
    return chooseRandom(options, this.rng);
  }

  getMultipliers() {
    return this.active?.definition.effects ?? {};
  }
}

class UI {
  constructor() {
    this.score = document.querySelector("#score-value");
    this.time = document.querySelector("#time-value");
    this.level = document.querySelector("#level-value");
    this.best = document.querySelector("#best-value");
    this.harmony = document.querySelector("#harmony-fill");
    this.eventBanner = document.querySelector("#event-banner");
    this.eventIcon = document.querySelector("#event-icon");
    this.eventName = document.querySelector("#event-name");
    this.eventText = document.querySelector("#event-text");
    this.startButton = document.querySelector("#start-button");
    this.pauseButton = document.querySelector("#pause-button");
    this.restartButton = document.querySelector("#restart-button");
    this.motionToggle = document.querySelector("#motion-toggle");
    this.tutorial = document.querySelector("#tutorial-overlay");
    this.tutorialButton = document.querySelector("#tutorial-button");
    this.gameOver = document.querySelector("#game-over-overlay");
    this.gameOverReason = document.querySelector("#game-over-reason");
    this.finalScore = document.querySelector("#final-score");
    this.finalTime = document.querySelector("#final-time");
    this.finalBest = document.querySelector("#final-best");
    this.playAgainButton = document.querySelector("#play-again-button");
  }

  renderStatus(game) {
    this.score.textContent = String(Math.max(0, Math.round(game.score)));
    this.time.textContent = formatTime(game.elapsedMs);
    this.level.textContent = String(getDifficultyLevel(game.elapsedMs));
    this.best.textContent = String(game.bestScore);
    this.harmony.style.width = `${clamp(game.harmony, 0, 100)}%`;
    this.harmony.dataset.level = game.harmony < 30 ? "low" : game.harmony < 62 ? "medium" : "high";
    this.pauseButton.disabled = game.state !== "running" && game.state !== "paused";
    this.pauseButton.querySelector("span:last-child").textContent = game.state === "paused" ? "Resume" : "Pause";
    this.startButton.querySelector("span:last-child").textContent = game.state === "ready" ? "Start" : "Restart";
    this.startButton.dataset.mode = game.state === "ready" ? "start" : "restart";
  }

  showEvent(definition) {
    if (!definition) {
      this.eventBanner.hidden = true;
      this.eventBanner.classList.remove("event-banner--active");
      return;
    }

    this.eventIcon.textContent = EVENT_ICONS[definition.id] ?? definition.icon;
    this.eventName.textContent = definition.name;
    this.eventText.textContent = definition.text;
    this.eventBanner.hidden = false;
    this.eventBanner.classList.remove("event-banner--active");
    window.requestAnimationFrame(() => this.eventBanner.classList.add("event-banner--active"));
  }

  showTutorial(show) {
    this.tutorial.hidden = !show;
  }

  showGameOver({ reason, score, elapsedMs, bestScore }) {
    this.gameOverReason.textContent = reason;
    this.finalScore.textContent = String(Math.max(0, Math.round(score)));
    this.finalTime.textContent = formatTime(elapsedMs);
    this.finalBest.textContent = String(bestScore);
    this.gameOver.hidden = false;
  }

  hideGameOver() {
    this.gameOver.hidden = true;
  }
}

class Game {
  constructor() {
    this.stage = document.querySelector("#stage");
    this.runner = new Runner(document.querySelector("#runner"), this.stage);
    this.audio = new AudioManager();
    this.ui = new UI();
    this.taskManager = new TaskManager(document.querySelector("#task-row"));
    this.obstacleManager = new ObstacleManager(document.querySelector("#obstacle-layer"), this.stage);
    this.eventManager = new EventManager();
    this.state = "ready";
    this.elapsedMs = 0;
    this.score = 0;
    this.harmony = 100;
    this.lastTime = 0;
    this.animationId = null;
    this.survivalScoreBank = 0;
    this.bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
    this.reduceMotion = localStorage.getItem(MOTION_KEY) === "true";
  }

  boot() {
    this.seedAmbientParticles();
    this.bindControls();
    this.applyMotionPreference();
    this.taskManager.render();
    this.ui.renderStatus(this);
    this.ui.showTutorial(localStorage.getItem(TUTORIAL_KEY) !== "true");
    window.addEventListener("resize", () => this.runner.updateLayout());
  }

  bindControls() {
    this.ui.startButton.addEventListener("click", () => this.startOrRestart());
    this.ui.restartButton.addEventListener("click", () => this.restart());
    this.ui.pauseButton.addEventListener("click", () => this.togglePause());
    this.ui.playAgainButton.addEventListener("click", () => this.restart());
    this.ui.tutorialButton.addEventListener("click", () => {
      localStorage.setItem(TUTORIAL_KEY, "true");
      this.ui.showTutorial(false);
      this.start();
    });
    this.ui.motionToggle.checked = this.reduceMotion;
    this.ui.motionToggle.addEventListener("change", () => {
      this.reduceMotion = this.ui.motionToggle.checked;
      localStorage.setItem(MOTION_KEY, String(this.reduceMotion));
      this.applyMotionPreference();
    });

    document.querySelector("#task-row").addEventListener("click", (event) => {
      const panel = event.target.closest("[data-task]");
      if (!panel) {
        return;
      }

      const task = this.taskManager.tasks.find((candidate) => candidate.id === panel.dataset.task);
      if (task) {
        this.completeTask(task.key);
      }
    });

    window.addEventListener("keydown", (event) => this.handleKeyDown(event));
    window.addEventListener("keyup", (event) => {
      if (event.code === "ArrowDown") {
        this.runner.setDucking(false);
      }
    });
  }

  async startOrRestart() {
    if (this.state === "ready") {
      await this.start();
      return;
    }

    await this.restart();
  }

  async start() {
    await this.audio.unlock();

    if (this.state !== "ready") {
      return;
    }

    localStorage.setItem(TUTORIAL_KEY, "true");
    this.ui.showTutorial(false);
    this.state = "running";
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  async restart() {
    await this.audio.unlock();
    this.cancelLoop();
    this.elapsedMs = 0;
    this.score = 0;
    this.harmony = 100;
    this.survivalScoreBank = 0;
    this.state = "ready";
    this.runner.reset();
    this.taskManager.reset();
    this.obstacleManager.reset();
    this.eventManager.reset();
    this.ui.hideGameOver();
    this.ui.showEvent(null);
    this.ui.renderStatus(this);
    await this.start();
  }

  togglePause() {
    if (this.state === "ready") {
      this.start();
      return;
    }

    if (this.state === "game-over") {
      return;
    }

    if (this.state === "paused") {
      this.state = "running";
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    } else {
      this.state = "paused";
      this.cancelLoop();
    }

    this.ui.renderStatus(this);
  }

  handleKeyDown(event) {
    if (event.repeat && !["ArrowDown"].includes(event.code)) {
      return;
    }

    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      if (this.state === "ready") {
        this.start();
      }
      if (this.state === "running" && this.runner.jump()) {
        this.audio.playJump();
      }
      return;
    }

    if (event.code === "ArrowDown") {
      event.preventDefault();
      if (this.state === "running") {
        this.runner.setDucking(true);
      }
      return;
    }

    if (event.key >= "1" && event.key <= "4") {
      event.preventDefault();
      this.completeTask(event.key);
      return;
    }

    if (event.key.toLowerCase() === "p" || event.key === "Escape") {
      event.preventDefault();
      this.togglePause();
    }
  }

  completeTask(key) {
    if (this.state === "ready") {
      this.start();
    }

    if (this.state !== "running") {
      return;
    }

    const result = this.taskManager.completeByKey(key);
    if (!result) {
      return;
    }

    this.score += result.score;
    this.harmony = clamp(this.harmony + 2.5, 0, 100);
    this.audio.playTask();
    this.taskManager.render();
    this.ui.renderStatus(this);
  }

  loop(time) {
    if (this.state !== "running") {
      return;
    }

    const deltaMs = Math.min(34, time - this.lastTime);
    this.lastTime = time;
    this.update(deltaMs);
    this.animationId = window.requestAnimationFrame((nextTime) => this.loop(nextTime));
  }

  update(deltaMs) {
    this.elapsedMs += deltaMs;
    const speed = getSpeed(this.elapsedMs);
    const level = getDifficultyLevel(this.elapsedMs);

    this.score += deltaMs * 0.012;
    this.survivalScoreBank += deltaMs;

    if (this.survivalScoreBank >= 5000) {
      this.score += 18 + level * 2;
      this.survivalScoreBank = 0;
    }

    this.runner.update(deltaMs);

    const eventChange = this.eventManager.update(deltaMs, this.elapsedMs, this.taskManager);
    if (eventChange.started) {
      this.audio.playEvent();
      this.ui.showEvent(eventChange.started);
    } else if (eventChange.finished) {
      this.ui.showEvent(null);
    }

    const neglected = this.taskManager.update(
      deltaMs,
      this.elapsedMs,
      this.eventManager.getMultipliers(),
    );

    if (neglected.length > 0) {
      this.score -= neglected.length * 38;
      this.harmony -= neglected.length * 18;
      this.audio.playNeglect();
    }

    const obstacleResult = this.obstacleManager.update(
      deltaMs,
      this.elapsedMs,
      speed,
      this.runner.getCollisionBox(),
    );

    if (obstacleResult.avoidedScore > 0) {
      this.score += obstacleResult.avoidedScore;
      if (obstacleResult.avoidedScore >= 18) {
        this.audio.playPoint();
      }
    }

    if (obstacleResult.hit) {
      this.endGame(`You met a ${obstacleResult.hit.definition.label} on the path.`);
      return;
    }

    if (this.harmony <= 0) {
      this.endGame("Too many garden tasks were neglected at once.");
      return;
    }

    this.taskManager.render();
    this.ui.renderStatus(this);
  }

  endGame(reason) {
    this.state = "game-over";
    this.cancelLoop();
    this.runner.setDucking(false);
    this.audio.playCollision();
    this.score = Math.max(0, Math.round(this.score));
    this.bestScore = Math.max(this.bestScore, this.score);
    localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    this.ui.renderStatus(this);
    this.ui.showGameOver({
      reason,
      score: this.score,
      elapsedMs: this.elapsedMs,
      bestScore: this.bestScore,
    });
  }

  cancelLoop() {
    if (this.animationId !== null) {
      window.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  seedAmbientParticles() {
    const layer = document.querySelector("#pollen-layer");
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < 24; index += 1) {
      const particle = document.createElement("span");
      particle.style.left = `${randomBetween(0, 100)}%`;
      particle.style.top = `${randomBetween(6, 80)}%`;
      particle.style.animationDelay = `${randomBetween(-10, 0)}s`;
      particle.style.animationDuration = `${randomBetween(8, 16)}s`;
      fragment.append(particle);
    }

    layer.append(fragment);
  }

  applyMotionPreference() {
    document.documentElement.classList.toggle("reduce-motion", this.reduceMotion);
  }
}

function formatTaskStatus(status) {
  switch (status) {
    case "critical":
      return "Critical";
    case "urgent":
      return "Urgent";
    case "ready":
      return "Ready";
    default:
      return "Calm";
  }
}

const game = new Game();
game.boot();
