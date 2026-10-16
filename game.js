(() => {
  "use strict";
  const arena = document.getElementById("arena");
  const scoreEl = document.getElementById("score");
  const timerEl = document.getElementById("timer");
  const bestEl = document.getElementById("best");
  const intro = document.getElementById("intro");
  const end = document.getElementById("end");
  const startBtn = document.getElementById("startBtn");
  const againBtn = document.getElementById("againBtn");
  const shareBtn = document.getElementById("shareBtn");
  const shareStatus = document.getElementById("shareStatus");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");
  const resultIcon = document.getElementById("resultIcon");
  const soundBtn = document.getElementById("soundBtn");
  const tipText = document.getElementById("tipText");

  const COLORS = [
    ["#ff5ba7", "💗"], ["#65e7ff", "💎"], ["#ffe66d", "⭐"],
    ["#9b8cff", "✨"], ["#72f0ad", "🍀"], ["#ff9e61", "🔥"]
  ];
  let score = 0, best = Number(localStorage.getItem("lopniBest") || 0);
  let timeLeft = 30, playing = false, soundOn = true, streak = 0;
  let spawnTimer = null, clockTimer = null, difficultyTimer = null;
  let audioCtx = null;
  bestEl.textContent = best;

  function tone(freq = 550, duration = 0.06, type = "sine") {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.045, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  }

  function clearTimers() {
    clearInterval(spawnTimer); clearInterval(clockTimer); clearInterval(difficultyTimer);
    spawnTimer = clockTimer = difficultyTimer = null;
  }
  function clearBubbles() {
    arena.querySelectorAll(".bubble,.float-score").forEach(el => el.remove());
  }
  function setScore(value) {
    score = value; scoreEl.textContent = score;
    if (score > best) {
      best = score; bestEl.textContent = best;
      localStorage.setItem("lopniBest", String(best));
    }
  }
  function random(min, max) { return Math.random() * (max - min) + min; }

  function spawnBubble() {
    if (!playing) return;
    const bounds = arena.getBoundingClientRect();
    const size = random(48, 70);
    const isBomb = Math.random() < 0.19;
    const bubble = document.createElement("button");
    bubble.type = "button";
    bubble.className = "bubble " + (isBomb ? "bomb" : "good");
    bubble.setAttribute("aria-label", isBomb ? "Опасный чёрный пузырь" : "Цветной пузырь");
    bubble.style.width = size + "px";
    bubble.style.height = size + "px";
    bubble.style.left = random(4, Math.max(5, bounds.width - size - 4)) + "px";
    bubble.style.top = random(4, Math.max(5, bounds.height - size - 4)) + "px";
    if (isBomb) {
      bubble.innerHTML = "<span>✹</span>";
    } else {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      bubble.style.background = `radial-gradient(circle at 32% 27%, #ffffff 0%, ${color[0]} 22%, ${color[0]} 68%, #554078 130%)`;
      bubble.innerHTML = `<span>${color[1]}</span>`;
    }
    bubble.addEventListener("click", () => {
      if (!playing || !bubble.isConnected) return;
      const x = bubble.offsetLeft + size / 2;
      const y = bubble.offsetTop + size / 2;
      if (isBomb) {
        streak = 0;
        tone(110, 0.2, "sawtooth");
        endGame(true);
        return;
      }
      streak++;
      const points = streak > 0 && streak % 5 === 0 ? 3 : 1;
      setScore(score + points);
      tone(420 + Math.min(streak, 12) * 35, 0.055);
      showPoints(x, y, "+" + points + (points > 1 ? " СЕРИЯ!" : ""));
      bubble.remove();
      if (streak % 5 === 0) tipText.textContent = "Серия " + streak + "! Следующие попадания приносят бонус.";
      else tipText.textContent = "Отлично! Продолжай, но следи за чёрным пузырём.";
    });
    arena.appendChild(bubble);
    // Bubbles disappear after a short time, keeping the field moving.
    setTimeout(() => { if (bubble.isConnected) bubble.remove(); }, random(1500, 2600));
  }

  function showPoints(x, y, text) {
    const el = document.createElement("span");
    el.className = "float-score"; el.textContent = text;
    el.style.left = Math.max(0, x - 18) + "px";
    el.style.top = Math.max(0, y - 12) + "px";
    arena.appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  function startGame() {
    clearTimers(); clearBubbles();
    score = 0; streak = 0; timeLeft = 30; playing = true;
    scoreEl.textContent = "0"; timerEl.textContent = timeLeft;
    intro.classList.add("hidden"); end.classList.add("hidden");
    shareStatus.textContent = "";
    tipText.textContent = "Лопай цветные пузыри. Чёрный завершит раунд!";
    spawnBubble();
    spawnTimer = setInterval(spawnBubble, 600);
    clockTimer = setInterval(() => {
      timeLeft--; timerEl.textContent = timeLeft;
      if (timeLeft <= 5) tone(260, 0.04);
      if (timeLeft <= 0) endGame(false);
    }, 1000);
    difficultyTimer = setInterval(() => {
      clearInterval(spawnTimer);
      spawnTimer = setInterval(spawnBubble, Math.max(280, 600 - (30 - timeLeft) * 9));
    }, 5000);
  }

  function endGame(hitBomb) {
    if (!playing) return;
    playing = false; clearTimers();
    arena.querySelectorAll(".bubble").forEach(el => el.remove());
    end.classList.remove("hidden");
    resultIcon.textContent = hitBomb ? "💥" : "🏁";
    resultTitle.textContent = hitBomb ? "Бум! Это был он." : "Время вышло!";
    resultText.textContent = `Твой результат: ${score} ${score === 1 ? "очко" : "очков"}. Рекорд: ${best}.`;
    tipText.textContent = hitBomb ? "В следующий раз не трогай чёрный пузырь!" : "Сыграй ещё раз и попробуй побить рекорд.";
    tone(hitBomb ? 130 : 660, 0.15, hitBomb ? "sawtooth" : "triangle");
  }

  async function shareResult() {
    const text = `Я набрал ${score} очков в игре «Лопни не то!». Сможешь больше?`;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Лопни не то!", text, url });
        shareStatus.textContent = "Результат отправлен.";
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text + " " + url);
        shareStatus.textContent = "Текст и ссылка скопированы.";
      } else {
        shareStatus.textContent = text + " " + url;
      }
    } catch (err) {
      if (err && err.name !== "AbortError") shareStatus.textContent = "Не удалось открыть меню отправки. Скопируй ссылку вручную.";
    }
  }

  startBtn.addEventListener("click", startGame);
  againBtn.addEventListener("click", startGame);
  shareBtn.addEventListener("click", shareResult);
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-label", soundOn ? "Выключить звук" : "Включить звук");
    if (soundOn) tone(520);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) {
      // Do not let a background tab silently run down the round.
      clearTimers();
      playing = false;
      end.classList.remove("hidden");
      resultIcon.textContent = "⏸️";
      resultTitle.textContent = "Раунд приостановлен";
      resultText.textContent = "Ты переключился из игры. Начни новый раунд, когда будешь готов.";
      againBtn.textContent = "Начать заново";
    }
  });
})();
