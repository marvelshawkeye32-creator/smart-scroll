// script.js

let currentCard = null;
let currentFilter = "all"; // "all" | "sat" | "chem"

const questionEl = document.getElementById("question");
const answerEl = document.getElementById("answer");
const tagEl = document.getElementById("tag");

const showAnswerBtn = document.getElementById("show-answer-btn");
const hardBtn = document.getElementById("hard-btn");
const easyBtn = document.getElementById("easy-btn");

const typeButtons = {
  all: document.getElementById("type-all"),
  sat: document.getElementById("type-sat"),
  chem: document.getElementById("type-chem")
};

const streakValueEl = document.getElementById("streak-value");
const todayCountEl = document.getElementById("today-count");

// simple localStorage keys
const LS_KEY_HISTORY = "smartScroll_history_v1";
const LS_KEY_STREAK = "smartScroll_streak_v1";

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_KEY_HISTORY);
    return raw ? JSON.parse(raw) : { todayDate: null, todayCount: 0 };
  } catch (e) {
    return { todayDate: null, todayCount: 0 };
  }
}

function saveHistory(history) {
  localStorage.setItem(LS_KEY_HISTORY, JSON.stringify(history));
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(LS_KEY_STREAK);
    return raw ? JSON.parse(raw) : { lastDate: null, streak: 0 };
  } catch (e) {
    return { lastDate: null, streak: 0 };
  }
}

function saveStreak(streakObj) {
  localStorage.setItem(LS_KEY_STREAK, JSON.stringify(streakObj));
}

function getTodayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // "yyyy-mm-dd"
}

function updateStatsOnReview() {
  const today = getTodayStr();
  let history = loadHistory();

  if (history.todayDate !== today) {
    history.todayDate = today;
    history.todayCount = 0;
  }
  history.todayCount += 1;
  saveHistory(history);
  todayCountEl.textContent = history.todayCount.toString();

  let streak = loadStreak();
  if (!streak.lastDate) {
    streak.lastDate = today;
    streak.streak = 1;
  } else if (streak.lastDate === today) {
    // same day, streak unchanged
  } else {
    // check if yesterday
    const last = new Date(streak.lastDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      streak.streak += 1;
    } else {
      streak.streak = 1; // reset
    }
    streak.lastDate = today;
  }
  saveStreak(streak);
  streakValueEl.textContent = streak.streak.toString();
}

function initStatsUI() {
  const today = getTodayStr();
  let history = loadHistory();
  if (history.todayDate !== today) {
    history.todayDate = today;
    history.todayCount = 0;
    saveHistory(history);
  }
  todayCountEl.textContent = history.todayCount.toString();

  const streak = loadStreak();
  streakValueEl.textContent = (streak.streak || 0).toString();
}

function getFilteredCards() {
  if (currentFilter === "all") return CARDS;
  return CARDS.filter(c => c.type === currentFilter);
}

function pickRandomCard() {
  const pool = getFilteredCards();
  if (pool.length === 0) {
    return null;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

function showNewCard() {
  currentCard = pickRandomCard();
  if (!currentCard) {
    questionEl.textContent = "no cards of this type yet.";
    answerEl.textContent = "";
    answerEl.classList.add("hidden");
    tagEl.textContent = "";
    return;
  }

  questionEl.textContent = currentCard.question;
  answerEl.textContent = currentCard.answer;
  answerEl.classList.add("hidden");
  tagEl.textContent = currentCard.type === "sat" ? "sat verbal" : "biochem";
}

function handleShowAnswer() {
  answerEl.classList.remove("hidden");
}

function handleMark(difficulty) {
  // for now we just track stats; later you could weight selection by 'hard'
  updateStatsOnReview();
  showNewCard();
}

function setFilter(newFilter) {
  currentFilter = newFilter;
  Object.entries(typeButtons).forEach(([key, btn]) => {
    if (key === newFilter) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  showNewCard();
}

// event listeners
showAnswerBtn.addEventListener("click", handleShowAnswer);
hardBtn.addEventListener("click", () => handleMark("hard"));
easyBtn.addEventListener("click", () => handleMark("easy"));

typeButtons.all.addEventListener("click", () => setFilter("all"));
typeButtons.sat.addEventListener("click", () => setFilter("sat"));
typeButtons.chem.addEventListener("click", () => setFilter("chem"));

// init
initStatsUI();
showNewCard();
