(() => {
  const timerDisplay = document.getElementById("timer-display");
  const timerView = document.getElementById("timer-view");
  const tempView = document.getElementById("temp-view");
  const tempInput = document.getElementById("temp-input");
  const saveConfirm = document.getElementById("save-confirm");

  const btnStart = document.getElementById("btn-start");
  const btnPause = document.getElementById("btn-pause");
  const btnReset = document.getElementById("btn-reset");
  const btnSaveTemp = document.getElementById("btn-save-temp");

  const chartSvg = document.getElementById("chart-svg");
  const chartEmpty = document.getElementById("chart-empty");
  const rangeButtons = document.querySelectorAll(".range-btn");
  let currentRange = "7";

  // ---------- Minuteur ----------

  Timer.init({
    onTick: (text) => { timerDisplay.textContent = text; },
    onDone: () => {
      timerView.hidden = true;
      tempView.hidden = false;
      tempInput.value = "";
      tempInput.focus();
    },
  });

  btnStart.addEventListener("click", () => {
    Timer.start();
    btnStart.disabled = true;
    btnPause.disabled = false;
  });

  btnPause.addEventListener("click", () => {
    Timer.pause();
    btnStart.disabled = false;
    btnPause.disabled = true;
  });

  btnReset.addEventListener("click", () => {
    Timer.reset();
    btnStart.disabled = false;
    btnPause.disabled = true;
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
    btnStart.disabled = false;
    btnPause.disabled = true;

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
