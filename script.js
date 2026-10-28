// script.js

// ---- config ----
const DAILY_GOAL = 1;
const PST_TIMEZONE = "America/Los_Angeles";
const LS_KEY_SAT_DAILY = "smartScroll_satVerbalDaily_v1";
const SAT_DAILY_GOAL = 1;


// storage keys
const LS_KEY_DAILY = "smartScroll_daily_v2";
const LS_KEY_STREAK = "smartScroll_goalStreak_v2";

// dom
const tagEl = document.getElementById("card-tag");
const questionEl = document.getElementById("card-question");
const optionsContainer = document.getElementById("options-container");
const cardEl = document.getElementById("card");
const nextBtn = document.getElementById("next-btn");

const modeButtons = {
  all: document.getElementById("type-all"),
  sat: document.getElementById("type-sat"),
  chem: document.getElementById("type-chem")
};

const todayCorrectEl = document.getElementById("today-correct");
const dailyGoalEl = document.getElementById("daily-goal");
const progressFillEl = document.getElementById("progress-fill");
const streakDaysEl = document.getElementById("streak-days");

const gyrosSection = document.getElementById("gyros-section");
const gyroArena = document.getElementById("gyros-arena");
const gyroShip = document.getElementById("gyro-ship");
const gyroLockBtn = document.getElementById("gyro-lock-btn"); // will be "fire" button now
const gyroScoreEl = document.getElementById("gyro-score");

const confettiLayer = document.getElementById("confetti-layer");

// view routing
const viewEls = {
  home: document.getElementById("view-home"),
  core: document.getElementById("view-core"),
  sat: document.getElementById("view-sat"),
};

const brandHomeEl = document.getElementById("brand-home");
const goCoreBtn = document.getElementById("go-core");
const goSatBtn = document.getElementById("go-sat");

let currentView = "home"; // "home" | "core" | "sat"

// sat verbal dom
const satContextEl = document.getElementById("sat-context");
const satQuestionEl = document.getElementById("sat-question");
const satTagEl = document.getElementById("sat-card-tag");
const satOptionsContainer = document.getElementById("sat-options-container");
const satNextBtn = document.getElementById("sat-next-btn");
const satTodayCorrectEl = document.getElementById("sat-today-correct");
const satProgressFillEl = document.getElementById("sat-progress-fill");


// state

let currentSatCard = null;
let currentSatOptions = [];
let currentSatCorrectIndex = -1;
let satAnsweringLocked = false;


let currentFilter = "all"; // "all" | "sat" | "chem"

let currentCard = null;
let currentOptions = [];
let correctOptionIndex = -1;
let answeringLocked = false;

// gyros state (mini gyruss)
let gyrussLastTs = null;
let gyrussShipAngle = 0; // degrees, 0 = up
let gyrussShipSpeed = 200; // deg/s when held/tapped
let gyrussBullets = [];
let gyrussEnemies = [];
let gyrussSpawnTimer = 0;
let gyrussSpawnInterval = 1.2; // seconds
let gyrussScore = 0;
let gyrussBaseEnemySpeed = 20; // px/s outward
let gyrussRunning = false;

// ---- helpers: time + storage ----

function loadSatDaily() {
  try {
    const raw = localStorage.getItem(LS_KEY_SAT_DAILY);
    const today = getPstDateString();
    if (!raw) return { date: today, correct: 0 };
    const obj = JSON.parse(raw);
    if (obj.date !== today) return { date: today, correct: 0 };
    return obj;
  } catch (e) {
    return { date: getPstDateString(), correct: 0 };
  }
}

function saveSatDaily(obj) {
  localStorage.setItem(LS_KEY_SAT_DAILY, JSON.stringify(obj));
}

function refreshSatStatsUI() {
  const satDaily = loadSatDaily();
  satTodayCorrectEl.textContent = satDaily.correct.toString();
  const pct = Math.min(1, satDaily.correct / SAT_DAILY_GOAL);
  satProgressFillEl.style.width = `${pct * 100}%`;

  if (satDaily.correct >= SAT_DAILY_GOAL) {
    const updatedStreak = maybeUpdateStreakAfterGoalHit(satDaily.date);
    streakDaysEl.textContent = updatedStreak.streakDays.toString();
    gyrosSection.classList.remove("hidden");
    gyrussRunning = true;
  }
}

function setView(viewName) {
  currentView = viewName;
  Object.entries(viewEls).forEach(([k, el]) => {
    if (!el) return;
    if (k === viewName) el.classList.remove("hidden");
    else el.classList.add("hidden");
  });

  if (viewName === "core") {
    // ensure core deck is active if you still use deckButtons
    currentDeck = "core";
    loadNewCard();
  } else if (viewName === "sat") {
    refreshSatStatsUI();
    loadSatQuestion();
  }
}

function getPstDateString() {
  const now = new Date();
  const pstString = now.toLocaleDateString("en-CA", { timeZone: PST_TIMEZONE });
  return pstString;
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysBetween(d1, d2) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((t2 - t1) / msPerDay);
}

function loadDaily() {
  try {
    const raw = localStorage.getItem(LS_KEY_DAILY);
    if (!raw) {
      return { date: getPstDateString(), correct: 0 };
    }
    const obj = JSON.parse(raw);
    const today = getPstDateString();
    if (obj.date !== today) {
      return { date: today, correct: 0 };
    }
    return obj;
  } catch (e) {
    return { date: getPstDateString(), correct: 0 };
  }
}

function saveDaily(daily) {
  localStorage.setItem(LS_KEY_DAILY, JSON.stringify(daily));
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(LS_KEY_STREAK);
    if (!raw) {
      return { lastDate: null, streakDays: 0 };
    }
    return JSON.parse(raw);
  } catch (e) {
    return { lastDate: null, streakDays: 0 };
  }
}

function saveStreak(streak) {
  localStorage.setItem(LS_KEY_STREAK, JSON.stringify(streak));
}

function maybeUpdateStreakAfterGoalHit(dateStr) {
  let streak = loadStreak();

  if (streak.lastDate === dateStr) {
    return streak;
  }

  const today = parseDate(dateStr);

  if (!streak.lastDate) {
    streak.lastDate = dateStr;
    streak.streakDays = 1;
  } else {
    const last = parseDate(streak.lastDate);
    const diff = daysBetween(last, today);
    if (diff === 1) {
      streak.streakDays += 1;
      streak.lastDate = dateStr;
    } else if (diff > 1) {
      streak.streakDays = 1;
      streak.lastDate = dateStr;
    }
  }

  saveStreak(streak);
  return streak;
}

// ---- ui: stats / progress ----

function refreshStatsUI() {
  const daily = loadDaily();
  const streak = loadStreak();

  todayCorrectEl.textContent = daily.correct.toString();
  dailyGoalEl.textContent = DAILY_GOAL.toString();

  const pct = Math.min(1, daily.correct / DAILY_GOAL);
  progressFillEl.style.width = `${pct * 100}%`;

  streakDaysEl.textContent = (streak.streakDays || 0).toString();

  if (daily.correct >= DAILY_GOAL) {
    gyrosSection.classList.remove("hidden");
    gyrussRunning = true;
  } else {
    gyrosSection.classList.add("hidden");
    gyrussRunning = false;
  }
}

// ---- cards + mcqs ----

function pickRandomSatVerbalCard() {
  if (!SAT_VERBAL_CARDS || SAT_VERBAL_CARDS.length === 0) return null;
  const idx = Math.floor(Math.random() * SAT_VERBAL_CARDS.length);
  return SAT_VERBAL_CARDS[idx];
}

function loadSatQuestion() {
  currentSatCard = pickRandomSatVerbalCard();
  renderSatQuestion();
}

function renderSatQuestion() {
  satAnsweringLocked = false;
  satOptionsContainer.innerHTML = "";

  if (!currentSatCard) {
    satContextEl.innerHTML = "<p>no sat verbal cards yet.</p>";
    satQuestionEl.textContent = "";
    satTagEl.textContent = "";
    return;
  }

  satContextEl.innerHTML = currentSatCard.contextHtml || "";
  satQuestionEl.textContent = currentSatCard.question;
  satTagEl.textContent = currentSatCard.skill || "sat verbal";

  currentSatOptions = currentSatCard.choices.map((text, i) => ({
    text,
    correct: "ABCD"[i] === currentSatCard.correct
  }));
  currentSatCorrectIndex = currentSatOptions.findIndex(o => o.correct);

  currentSatOptions.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.index = i.toString();

    const labelSpan = document.createElement("span");
    labelSpan.className = "option-label";
    labelSpan.textContent = ["a","b","c","d"][i];

    const textSpan = document.createElement("span");
    textSpan.className = "option-text";
    textSpan.textContent = opt.text;

    btn.appendChild(labelSpan);
    btn.appendChild(textSpan);

    btn.addEventListener("click", () => handleSatOptionClick(i, btn));

    satOptionsContainer.appendChild(btn);
  });
}

function getFilteredCards() {
  if (currentFilter === "all") return CARDS;
  return CARDS.filter(c => c.type === currentFilter);
}

function pickRandomCoreCard() {
  const pool = getFilteredCards();
  if (!pool.length) return null;
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

function buildMcqOptionsForCard(card) {
  const all = getFilteredCards();
  const wrongPool = all.filter(c => c !== card && c.answer && c.answer.trim().length > 0);

  const numWrongNeeded = Math.min(3, wrongPool.length);
  const wrongs = [];
  const usedIndexes = new Set();

  while (wrongs.length < numWrongNeeded && wrongPool.length > 0) {
    const idx = Math.floor(Math.random() * wrongPool.length);
    if (usedIndexes.has(idx)) continue;
    usedIndexes.add(idx);
    wrongs.push(wrongPool[idx].answer.trim());
  }

  const options = [];
  options.push({ text: card.answer.trim(), correct: true });

  wrongs.forEach(w => {
    options.push({ text: w, correct: false });
  });

  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

function letterForIndex(idx) {
  return ["a", "b", "c", "d"][idx] || "?";
}


function loadNewCard() {
  currentCard = pickRandomCoreCard();
  renderCoreCard();
}

function renderCoreCard() {
  cardEl.classList.remove("correct", "wrong");
  optionsContainer.innerHTML = "";
  answeringLocked = false;

  if (!currentCard) {
    questionEl.textContent = "no cards of this type yet.";
    tagEl.textContent = "";
    return;
  }

  questionEl.textContent = currentCard.question;
  tagEl.textContent = currentCard.type === "sat" ? "sat verbal" : "biochem / phys";

  currentOptions = buildMcqOptionsForCard(currentCard);
  correctOptionIndex = currentOptions.findIndex(o => o.correct);

  currentOptions.forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.dataset.index = i.toString();

    const labelSpan = document.createElement("span");
    labelSpan.className = "option-label";
    labelSpan.textContent = letterForIndex(i);

    const textSpan = document.createElement("span");
    textSpan.className = "option-text";
    textSpan.textContent = opt.text;

    btn.appendChild(labelSpan);
    btn.appendChild(textSpan);

    btn.addEventListener("click", () => handleOptionClick(i, btn));

    optionsContainer.appendChild(btn);
  });
}

// ---- confetti ----

function handleSatOptionClick(index, btn) {
  if (satAnsweringLocked) return;
  satAnsweringLocked = true;

  const allBtns = satOptionsContainer.querySelectorAll(".option-btn");
  allBtns.forEach(b => b.classList.add("disabled"));

  const clickedCorrect = index === currentSatCorrectIndex;

  if (clickedCorrect) {
    btn.classList.add("correct");
    cardEl?.classList?.add("correct");

    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const satDaily = loadSatDaily();
    satDaily.correct += 1;
    saveSatDaily(satDaily);
    refreshSatStatsUI();
    spawnConfettiBurst(cx, cy);

    // auto-advance to next sat verbal card
    setTimeout(() => {
      cardEl?.classList?.remove("correct", "wrong");
      loadSatQuestion();
    }, 450);
  } else {
    btn.classList.add("wrong");
    cardEl?.classList?.add("wrong");
    if (currentSatCorrectIndex >= 0 && currentSatCorrectIndex < allBtns.length) {
      allBtns[currentSatCorrectIndex].classList.add("correct");
    }
    // wrong: pause so you can see correct answer; use "next sat question" if you want to move on
  }
}



function spawnConfettiBurst(x, y) {
  const colors = ["#22c55e", "#0ea5e9", "#facc15", "#f97316", "#a855f7"];
  const count = 26;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
    piece.style.position = "fixed";
    piece.style.width = "5px";
    piece.style.height = "10px";
    piece.style.background = colors[i % colors.length];
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.opacity = "1";
    piece.style.borderRadius = "2px";
    piece.style.pointerEvents = "none";
    piece.style.zIndex = "999";

    confettiLayer.appendChild(piece);

    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 180;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 80;
    const gravity = 320 + Math.random() * 80;
    const rotation = (Math.random() - 0.5) * 720;

    let start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      const t = (timestamp - start) / 1000;

      const dx = vx * t;
      const dy = vy * t + 0.5 * gravity * t * t;
      piece.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation * t}deg)`;
      piece.style.opacity = String(Math.max(0, 1 - t / 1.2));

      if (t < 1.2) {
        requestAnimationFrame(step);
      } else {
        confettiLayer.removeChild(piece);
      }
    }

    requestAnimationFrame(step);
  }
}

// ---- answer handling ----

function incrementDailyCorrectAndMaybeUnlock(eventClientX, eventClientY) {
  const daily = loadDaily();
  daily.correct += 1;
  saveDaily(daily);

  if (daily.correct >= DAILY_GOAL) {
    const updatedStreak = maybeUpdateStreakAfterGoalHit(daily.date);
    streakDaysEl.textContent = updatedStreak.streakDays.toString();
  }

  refreshStatsUI();

  if (eventClientX != null && eventClientY != null) {
    spawnConfettiBurst(eventClientX, eventClientY);
  }
}

function handleOptionClick(index, btn) {
  if (answeringLocked) return;
  answeringLocked = true;

  const allBtns = optionsContainer.querySelectorAll(".option-btn");
  allBtns.forEach(b => b.classList.add("disabled"));

  const clickedCorrect = index === correctOptionIndex;

  if (clickedCorrect) {
    btn.classList.add("correct");
    cardEl.classList.add("correct");

    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    incrementDailyCorrectAndMaybeUnlock(cx, cy);

    // auto-advance to next core card after short pause
    setTimeout(() => {
      cardEl.classList.remove("correct", "wrong");
      loadNewCard();
    }, 450); // tweak delay if you want
  } else {
    btn.classList.add("wrong");
    cardEl.classList.add("wrong");

    if (correctOptionIndex >= 0 && correctOptionIndex < allBtns.length) {
      allBtns[correctOptionIndex].classList.add("correct");
    }
    // on wrong, stay on card so you can see feedback; click next manually
  }
}



// ---- mode switching ----

function setFilter(filter) {
  currentFilter = filter;
  Object.entries(modeButtons).forEach(([key, btn]) => {
    if (key === filter) btn.classList.add("active");
    else btn.classList.remove("active");
  });
  loadNewCard();
}

// ---- gyruss mini-game logic ----

function resetGyruss() {
  gyrussBullets.forEach(b => b.el.remove());
  gyrussEnemies.forEach(e => e.el.remove());
  gyrussBullets = [];
  gyrussEnemies = [];
  gyrussSpawnTimer = 0;
  gyrussSpawnInterval = 1.2;
  gyrussScore = 0;
  gyrussBaseEnemySpeed = 20;
  gyrussShipAngle = 0;
  gyrussLastTs = null;
  gyroScoreEl.textContent = "0";
}

function gyrussSpawnEnemy() {
  const enemyEl = document.createElement("div");
  enemyEl.className = "gyro-enemy";
  gyroArena.appendChild(enemyEl);

  // start near center, random angle
  const angle = Math.random() * Math.PI * 2;
  const rStart = 6; // px from center
  gyrussEnemies.push({
    el: enemyEl,
    angle,       // radians
    radius: rStart,
    speed: gyrussBaseEnemySpeed // px/s outward
  });
}

function gyrussFireBullet() {
  if (!gyrussRunning) return;
  const bulletEl = document.createElement("div");
  bulletEl.className = "gyro-bullet";
  gyroArena.appendChild(bulletEl);

  // ship is on outer circle
  const arenaRect = gyroArena.getBoundingClientRect();
  const cx = arenaRect.width / 2;
  const cy = arenaRect.height / 2;

  const shipRadius = 80; // px from center, sync with css origin
  const shipRad = (gyrussShipAngle - 90) * (Math.PI / 180); // convert to math angle (0=right)
  const sx = cx + shipRadius * Math.cos(shipRad);
  const sy = cy + shipRadius * Math.sin(shipRad);

  // bullets travel INWARD toward center along line from ship position to center
  const dx = cx - sx;
  const dy = cy - sy;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const vx = (dx / length) * 220; // px/s
  const vy = (dy / length) * 220;

  bulletEl.style.left = `${sx - 2}px`;
  bulletEl.style.top = `${sy - 5}px`;

  gyrussBullets.push({
    el: bulletEl,
    x: sx,
    y: sy,
    vx,
    vy
  });
}

function updateGyrussPositions(dt) {
  if (!gyrussRunning) return;

  const arenaRect = gyroArena.getBoundingClientRect();
  const cx = arenaRect.width / 2;
  const cy = arenaRect.height / 2;

  // move enemies outward
  gyrussEnemies.forEach(e => {
    e.radius += e.speed * dt;
    const ex = cx + e.radius * Math.cos(e.angle);
    const ey = cy + e.radius * Math.sin(e.angle);
    e.el.style.left = `${ex - 5}px`;
    e.el.style.top = `${ey - 5}px`;
  });

  // move bullets inward
  gyrussBullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.el.style.left = `${b.x - 2}px`;
    b.el.style.top = `${b.y - 5}px`;
  });

  // collisions: bullet-enemy
  const newBullets = [];
  const newEnemies = [];
  gyrussEnemies.forEach(e => {
    let hit = false;
    const ex = parseFloat(e.el.style.left) + 5;
    const ey = parseFloat(e.el.style.top) + 5;

    for (let i = 0; i < gyrussBullets.length; i++) {
      const b = gyrussBullets[i];
      const dx = (b.x) - ex;
      const dy = (b.y) - ey;
      if (dx * dx + dy * dy < 12 * 12) {
        // hit
        hit = true;
        b.el.remove();
        gyrussBullets[i]._remove = true;
        gyrussScore += 1;
        gyroScoreEl.textContent = String(gyrussScore);
        // scale difficulty
        gyrussBaseEnemySpeed = 20 + gyrussScore * 1.5;
        gyrussSpawnInterval = Math.max(0.4, 1.2 - gyrussScore * 0.01);
      }
    }

    if (!hit) {
      newEnemies.push(e);
    } else {
      e.el.remove();
    }
  });

  gyrussEnemies = newEnemies;
  gyrussBullets = gyrussBullets.filter(b => !b._remove);

  // remove bullets that reach center or go too far
  gyrussBullets = gyrussBullets.filter(b => {
    const dx = b.x - cx;
    const dy = b.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      b.el.remove();
      return false;
    }
    if (dist > 80) { // overshoot safety
      b.el.remove();
      return false;
    }
    return true;
  });

  // ship position (orbit)
  const shipRadius = 80;
  const shipRad = (gyrussShipAngle - 90) * (Math.PI / 180);
  const sx = cx + shipRadius * Math.cos(shipRad);
  const sy = cy + shipRadius * Math.sin(shipRad);
  gyroShip.style.left = `${sx - 6}px`;
  gyroShip.style.top = `${sy - 8}px`;

  // enemy-ship "hit" detection (for now just flash, not game over)
  gyrussEnemies.forEach(e => {
    const ex = parseFloat(e.el.style.left) + 5;
    const ey = parseFloat(e.el.style.top) + 5;
    const dx = ex - sx;
    const dy = ey - sy;
    if (dx * dx + dy * dy < 14 * 14) {
      // simple feedback: flash ship red
      gyroShip.style.background = "#ef4444";
      setTimeout(() => {
        gyroShip.style.background = "#facc15";
      }, 120);
    }
  });
}

function gyrussLoop(timestamp) {
  if (!gyrussLastTs) gyrussLastTs = timestamp;
  const dt = (timestamp - gyrussLastTs) / 1000;
  gyrussLastTs = timestamp;

  if (gyrussRunning) {
    // spawn enemies
    gyrussSpawnTimer += dt;
    if (gyrussSpawnTimer >= gyrussSpawnInterval) {
      gyrussSpawnTimer = 0;
      gyrussSpawnEnemy();
    }

    updateGyrussPositions(dt);
  }

  requestAnimationFrame(gyrussLoop);
}

// ship controls: tap left/right halves of arena to rotate

function handleArenaTap(event) {
  if (!gyrussRunning) return;
  const rect = gyroArena.getBoundingClientRect();
  const tapX = (event.touches && event.touches[0]?.clientX) || event.clientX;
  if (tapX == null) return;
  const relX = tapX - rect.left;
  const centerX = rect.width / 2;

  // rotate fixed amount per tap
  const delta = 18; // degrees per tap

  if (relX < centerX) {
    // left
    gyrussShipAngle -= delta;
  } else {
    // right
    gyrussShipAngle += delta;
  }
}

// ---- init ----

function init() {
  dailyGoalEl.textContent = DAILY_GOAL.toString();
  refreshStatsUI();

  // view routing
  if (brandHomeEl) brandHomeEl.addEventListener("click", () => setView("home"));
  if (goCoreBtn) goCoreBtn.addEventListener("click", () => setView("core"));
  if (goSatBtn) goSatBtn.addEventListener("click", () => setView("sat"));

  // existing deck/mode listeners (optional, only for core)

  modeButtons.all.addEventListener("click", () => setFilter("all"));
  modeButtons.sat.addEventListener("click", () => setFilter("sat"));
  modeButtons.chem.addEventListener("click", () => setFilter("chem"));

  nextBtn.addEventListener("click", () => {
    loadNewCard();
  });

  if (satNextBtn) satNextBtn.addEventListener("click", () => {
    loadSatQuestion();
  });

  gyroLockBtn.addEventListener("click", handleGyroLock);

  requestAnimationFrame(gyrussLoop);

  // start on home
  setView("home");
}

init();