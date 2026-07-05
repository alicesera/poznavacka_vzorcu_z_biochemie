const molecules = window.MOLECULES || [];

const els = {
  score: document.querySelector("#score"),
  position: document.querySelector("#position"),
  total: document.querySelector("#total"),
  formulaImage: document.querySelector("#formulaImage"),
  formulaStage: document.querySelector(".formula-stage"),
  imageStatus: document.querySelector("#imageStatus"),
  imageFallback: document.querySelector("#imageFallback"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  source: document.querySelector("#source"),
  next: document.querySelector("#next"),
  restart: document.querySelector("#restart"),
  mistakesMode: document.querySelector("#mistakesMode"),
  clearMistakes: document.querySelector("#clearMistakes"),
  zoomOut: document.querySelector("#zoomOut"),
  zoomReset: document.querySelector("#zoomReset"),
  zoomIn: document.querySelector("#zoomIn"),
  mistakesList: document.querySelector("#mistakesList"),
  sizeButtons: [...document.querySelectorAll("[data-size]")],
};

const storageKey = "wikiskripta-biochemie-mistakes";

let roundSize = 20;
let mistakesOnly = false;
let queue = [];
let currentIndex = 0;
let score = 0;
let answered = false;
let imageTimer = 0;
let zoom = 1;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function readMistakes() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "[]");
  } catch {
    return [];
  }
}

function writeMistakes(items) {
  localStorage.setItem(storageKey, JSON.stringify([...new Set(items)]));
  renderMistakes();
}

function getPool() {
  if (!mistakesOnly) return molecules;
  const missed = new Set(readMistakes());
  const pool = molecules.filter((item) => missed.has(item.answer));
  return pool.length ? pool : molecules;
}

function newRound() {
  const pool = shuffle(getPool());
  const size = roundSize === "all" ? pool.length : Math.min(Number(roundSize), pool.length);
  queue = pool.slice(0, size);
  currentIndex = 0;
  score = 0;
  answered = false;
  els.total.textContent = String(queue.length);
  els.score.textContent = "0";
  renderQuestion();
}

function buildOptions(answer) {
  const distractors = shuffle(molecules.filter((item) => item.answer !== answer))
    .slice(0, 3)
    .map((item) => item.answer);
  return shuffle([answer, ...distractors]);
}

function renderQuestion() {
  const item = queue[currentIndex];
  if (!item) {
    els.feedback.className = "feedback good";
    els.feedback.textContent = `Hotovo: ${score}/${queue.length}`;
    els.options.replaceChildren();
    els.next.disabled = true;
    return;
  }

  answered = false;
  els.position.textContent = String(currentIndex + 1);
  els.feedback.className = "feedback";
  els.feedback.textContent = "Vyber odpověď";
  els.next.disabled = true;
  els.source.href = item.sourceUrl;
  els.imageFallback.href = item.image;
  els.formulaStage.classList.remove("loaded");
  els.formulaImage.classList.remove("missing");
  els.imageStatus.textContent = "Načítám vzorec";
  clearTimeout(imageTimer);
  imageTimer = window.setTimeout(() => {
    if (!els.formulaImage.complete) {
      els.feedback.className = "feedback";
      els.feedback.textContent = "Obrázek se načítá pomalu";
      els.imageStatus.textContent = "Obrázek se načítá pomalu";
    }
  }, 4500);
  els.formulaImage.src = item.image;

  const buttons = buildOptions(item.answer).map((label) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => chooseAnswer(button, label, item.answer));
    return button;
  });
  els.options.replaceChildren(...buttons);
}

function setZoom(value) {
  zoom = Math.max(0.75, Math.min(2.25, value));
  els.formulaStage.style.setProperty("--zoom", zoom);
  els.zoomReset.textContent = `${Math.round(zoom * 100)}%`;
}

function chooseAnswer(button, chosen, answer) {
  if (answered) return;
  answered = true;

  const correct = chosen === answer;
  if (correct) {
    score += 1;
    els.score.textContent = String(score);
    els.feedback.className = "feedback good";
    els.feedback.textContent = "Správně";
    writeMistakes(readMistakes().filter((item) => item !== answer));
  } else {
    els.feedback.className = "feedback bad";
    els.feedback.textContent = `Správně: ${answer}`;
    button.classList.add("wrong");
    writeMistakes([...readMistakes(), answer]);
  }

  [...els.options.children].forEach((option) => {
    option.disabled = true;
    if (option.textContent === answer) option.classList.add("correct");
  });

  els.next.disabled = false;
  els.next.focus();
}

function renderMistakes() {
  const mistakes = readMistakes();
  els.mistakesList.textContent = mistakes.length ? mistakes.slice(0, 8).join(", ") : "Žádné chyby";
  els.mistakesMode.textContent = mistakesOnly ? "Všechny" : `Chyby (${mistakes.length})`;
}

els.next.addEventListener("click", () => {
  currentIndex += 1;
  renderQuestion();
});

els.restart.addEventListener("click", newRound);

els.mistakesMode.addEventListener("click", () => {
  mistakesOnly = !mistakesOnly;
  renderMistakes();
  newRound();
});

els.clearMistakes.addEventListener("click", () => {
  writeMistakes([]);
  if (mistakesOnly) newRound();
});

els.zoomOut.addEventListener("click", () => setZoom(zoom - 0.25));
els.zoomReset.addEventListener("click", () => setZoom(1));
els.zoomIn.addEventListener("click", () => setZoom(zoom + 0.25));

els.sizeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    roundSize = button.dataset.size;
    els.sizeButtons.forEach((item) => item.classList.toggle("active", item === button));
    newRound();
  });
});

document.addEventListener("keydown", (event) => {
  const number = Number(event.key);
  if (!answered && number >= 1 && number <= 4) {
    els.options.children[number - 1]?.click();
  }
  if (answered && event.key === "Enter") {
    els.next.click();
  }
});

els.formulaImage.addEventListener("load", () => {
  clearTimeout(imageTimer);
  els.formulaStage.classList.add("loaded");
  if (!answered) {
    els.feedback.className = "feedback";
    els.feedback.textContent = "Vyber odpověď";
  }
});

els.formulaImage.addEventListener("error", () => {
  clearTimeout(imageTimer);
  els.formulaStage.classList.remove("loaded");
  els.formulaImage.classList.add("missing");
  els.imageStatus.textContent = "Obrázek nejde načíst, zkus odkaz Otevřít obrázek";
  els.feedback.className = "feedback bad";
  els.feedback.textContent = "Obrázek nejde načíst";
});

setZoom(1);
renderMistakes();
newRound();
