// Histogramme (barres verticales) des températures, avec agrégation
// selon la période choisie pour garder un nombre de barres lisible.
const Chart = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const SVG_HEIGHT = 300;
  const PADDING_TOP = 24;
  const PADDING_BOTTOM = 36;
  const BAR_WIDTH = 28;
  const BAR_GAP = 10;

  function dayKey(date) { return date; } // "YYYY-MM-DD"

  function weekKey(date) {
    const d = new Date(date + "T00:00:00");
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
  }

  function monthKey(date) { return date.slice(0, 7); } // "YYYY-MM"

  function shortLabel(date) {
    const [, m, d] = date.split("-");
    return `${d}/${m}`;
  }

  function monthLabel(key) {
    const [y, m] = key.split("-");
    const names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
    return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
  }

  // Regroupe les relevés (potentiellement plusieurs par jour) en moyenne journalière.
  function groupByDay(readings) {
    const map = new Map();
    for (const r of readings) {
      const bucket = map.get(r.date) || { sum: 0, count: 0 };
      bucket.sum += r.temperature;
      bucket.count += 1;
      map.set(r.date, bucket);
    }
    return [...map.entries()]
      .map(([date, { sum, count }]) => ({ date, value: sum / count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function filterByRange(dailyEntries, range) {
    if (range === "all") return dailyEntries;
    const days = parseInt(range, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    return dailyEntries.filter((e) => e.date >= cutoffKey);
  }

  function granularityFor(range) {
    if (range === "7" || range === "15" || range === "30") return "day";
    if (range === "90" || range === "180") return "week";
    return "month"; // 365 ou all
  }

  function aggregate(dailyEntries, granularity) {
    if (granularity === "day") {
      return dailyEntries.map((e) => ({ label: shortLabel(e.date), value: e.value }));
    }
    const keyFn = granularity === "week" ? weekKey : monthKey;
    const map = new Map();
    for (const e of dailyEntries) {
      const key = keyFn(e.date);
      const bucket = map.get(key) || { sum: 0, count: 0 };
      bucket.sum += e.value;
      bucket.count += 1;
      map.set(key, bucket);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, { sum, count }]) => ({
        label: granularity === "month" ? monthLabel(key) : key.split("-S")[1] ? `S${key.split("-S")[1]}` : key,
        value: sum / count,
      }));
  }

  function clear(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function el(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  }

  function render(svg, readings, range) {
    clear(svg);
    const daily = groupByDay(readings);
    const filtered = filterByRange(daily, range);
    const points = aggregate(filtered, granularityFor(range));

    if (points.length === 0) return { empty: true };

    const plotHeight = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const values = points.map((p) => p.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const range_ = max - min;

    const width = points.length * (BAR_WIDTH + BAR_GAP) + BAR_GAP;
    svg.setAttribute("viewBox", `0 0 ${width} ${SVG_HEIGHT}`);
    svg.setAttribute("width", width);
    svg.setAttribute("height", SVG_HEIGHT);

    svg.appendChild(el("line", {
      class: "axis-line",
      x1: 0, y1: SVG_HEIGHT - PADDING_BOTTOM,
      x2: width, y2: SVG_HEIGHT - PADDING_BOTTOM,
    }));

    points.forEach((p, i) => {
      const x = BAR_GAP + i * (BAR_WIDTH + BAR_GAP);
      const h = ((p.value - min) / range_) * (plotHeight - 10) + 6;
      const y = SVG_HEIGHT - PADDING_BOTTOM - h;

      svg.appendChild(el("rect", {
        class: "bar", x, y, width: BAR_WIDTH, height: h, rx: 4,
      }));

      const valueText = el("text", {
        class: "bar-value", x: x + BAR_WIDTH / 2, y: y - 6, "text-anchor": "middle",
      });
      valueText.textContent = p.value.toFixed(1);
      svg.appendChild(valueText);

      const labelText = el("text", {
        class: "bar-label", x: x + BAR_WIDTH / 2, y: SVG_HEIGHT - PADDING_BOTTOM + 16, "text-anchor": "middle",
      });
      labelText.textContent = p.label;
      svg.appendChild(labelText);
    });

    return { empty: false };
  }

  return { render };
})();
