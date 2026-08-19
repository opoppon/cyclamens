(() => {
  const timerDisplay = document.getElementById("timer-display");
  const timerView = document.getElementById("timer-view");
  const tempView = document.getElementById("temp-view");
  const tempInput = document.getElementById("temp-input");
  const saveConfirm = document.getElementById("save-confirm");

  const btnToggle = document.getElementById("btn-toggle");
  const btnReset = document.getElementById("btn-reset");
  const btnSaveTemp = document.getElementById("btn-save-temp");

  const chartSvg = document.getElementById("chart-svg");
  const chartEmpty = document.getElementById("chart-empty");
  const rangeButtons = document.querySelectorAll(".range-btn");
  let currentRange = "7";

  // ---------- Minuteur ----------

  function setToggleState(running) {
    btnToggle.innerHTML = running
      ? '<span class="icon-pause"><span></span><span></span></span>'
      : '<span class="icon-play"></span>';
    btnToggle.setAttribute("aria-label", running ? "Pause" : "Démarrer");
  }

  Timer.init({
    onTick: (text) => { timerDisplay.textContent = text; },
    onDone: () => {
      setToggleState(false);
      timerView.hidden = true;
      tempView.hidden = false;
      tempInput.value = "";
      tempInput.focus();
    },
  });

  btnToggle.addEventListener("click", () => {
    if (Timer.isRunning()) {
      Timer.pause();
      setToggleState(false);
    } else {
      Timer.start();
      setToggleState(true);
    }
  });

  btnReset.addEventListener("click", () => {
    Timer.reset();
    setToggleState(false);
  });

  btnSaveTemp.addEventListener("click", async () => {
    const value = parseFloat(tempInput.value);
    if (Number.isNaN(value)) {
      tempInput.focus();
      return;
    }
    await DB.addReading(value);

    tempView.hidden = true;
    timerView.hidden = false;
    saveConfirm.textContent = `Enregistré : ${value.toFixed(1)} °C`;
    saveConfirm.hidden = false;
    setTimeout(() => { saveConfirm.hidden = true; }, 2500);

    Timer.reset();
    setToggleState(false);

    if (!document.getElementById("page-chart").hidden) refreshChart();
  });

  // ---------- Histogramme ----------

  async function refreshChart() {
    const readings = await DB.getAll();
    const { empty } = Chart.render(chartSvg, readings, currentRange);
    chartEmpty.hidden = !empty;
    chartSvg.style.display = empty ? "none" : "block";
  }

  chartSvg.addEventListener("click", async (e) => {
    const bar = e.target.closest(".bar");
    if (!bar) return;

    if (!bar.dataset.date) {
      alert('Passez en vue "7j", "15j" ou "30j" pour modifier une valeur précise.');
      return;
    }

    const input = prompt(`Modifier la température du ${bar.dataset.label} :`, bar.dataset.value);
    if (input === null) return;
    const value = parseFloat(input.replace(",", "."));
    if (Number.isNaN(value)) return;

    await DB.updateReadingForDate(bar.dataset.date, value);
    refreshChart();
  });

  rangeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      rangeButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentRange = btn.dataset.range;
      refreshChart();
    });
  });
  rangeButtons[0].classList.add("active");

  // ---------- Navigation ----------

  const pages = {
    timer: document.getElementById("page-timer"),
    chart: document.getElementById("page-chart"),
  };
  const navButtons = document.querySelectorAll(".nav-btn");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.page;
      navButtons.forEach((b) => b.classList.toggle("active", b === btn));
      Object.entries(pages).forEach(([name, el]) => { el.hidden = name !== target; });
      if (target === "chart") refreshChart();
    });
  });

  // ---------- Service worker (fonctionnement hors-ligne) ----------

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js");
    });
  }
})();
