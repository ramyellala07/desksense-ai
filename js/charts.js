/* ==========================================================================
   DeskSense AI — charts.js
   Thin Chart.js wrappers so every page gets the same dark, glowing look.
   Requires Chart.js 4.x on the page; degrades to a quiet fallback if the
   CDN is unavailable.
   ========================================================================== */
(function () {
  "use strict";

  var PALETTE = {
    accent: "#8B7CC7",
    primary: "#5A3B8C",
    good: "#6FD3A5",
    warn: "#F2C46D",
    bad: "#F27C8D",
    grid: "rgba(201,194,227,.10)",
    ticks: "rgba(201,194,227,.62)"
  };

  var ready = false;

  function initDefaults() {
    if (ready || !window.Chart) return;
    var Chart = window.Chart;
    var family = getComputedStyle(document.body).fontFamily || "Inter, system-ui, sans-serif";

    Chart.defaults.color = PALETTE.ticks;
    Chart.defaults.font.family = family;
    Chart.defaults.font.size = 12;
    Chart.defaults.borderColor = PALETTE.grid;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation = {
      duration: 750,
      easing: "easeOutQuart"
    };
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.legend.labels.boxHeight = 8;
    Chart.defaults.plugins.legend.labels.padding = 18;
    Chart.defaults.plugins.tooltip.backgroundColor = "rgba(22,16,42,.96)";
    Chart.defaults.plugins.tooltip.borderColor = "rgba(201,194,227,.22)";
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 12;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.titleColor = "#fff";
    Chart.defaults.plugins.tooltip.bodyColor = "#C9C2E3";
    Chart.defaults.plugins.tooltip.displayColors = false;

    /* Soft neon glow behind line strokes. */
    Chart.register({
      id: "dsGlow",
      beforeDatasetDraw: function (chart, args) {
        var meta = chart.getDatasetMeta(args.index);
        if (!meta || meta.type !== "line") return;
        chart.ctx.save();
        chart.ctx.shadowColor = "rgba(139,124,199,.55)";
        chart.ctx.shadowBlur = 18;
        chart.ctx.shadowOffsetY = 6;
      },
      afterDatasetDraw: function (chart, args) {
        var meta = chart.getDatasetMeta(args.index);
        if (!meta || meta.type !== "line") return;
        chart.ctx.restore();
      }
    });

    ready = true;
  }

  function hexToRgba(hex, alpha) {
    var h = (hex || "#8B7CC7").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  function gradient(color) {
    return function (context) {
      var chart = context.chart;
      var area = chart.chartArea;
      if (!area) return "transparent";
      var g = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
      g.addColorStop(0, hexToRgba(color, 0.34));
      g.addColorStop(0.75, hexToRgba(color, 0.04));
      g.addColorStop(1, hexToRgba(color, 0));
      return g;
    };
  }

  function canvasFrom(target) {
    if (!target) return null;
    if (typeof target === "string") return document.getElementById(target);
    return target;
  }

  function fallback(el, message) {
    if (!el || !el.parentNode) return;
    el.style.display = "none";
    var box = document.createElement("div");
    box.className = "chart-missing";
    box.textContent = message || "Charts need the Chart.js CDN. Open this page with an internet connection to see the chart.";
    el.parentNode.appendChild(box);
  }

  function make(target, config, opts) {
    var el = canvasFrom(target);
    if (!el) return null;
    if (!window.Chart) {
      fallback(el);
      return null;
    }
    initDefaults();
    var existing = window.Chart.getChart ? window.Chart.getChart(el) : null;
    if (existing) existing.destroy();

    if (opts && opts.heightPx && el.parentNode) {
      el.parentNode.style.height = opts.heightPx + "px";
    }
    return new window.Chart(el.getContext("2d"), config);
  }

  function axisLabel(unit) {
    return function (value) {
      return value + (unit ? " " + unit : "");
    };
  }

  /* ---------------------------------------------------------------- line */
  function line(target, opts) {
    opts = opts || {};
    var labels = opts.labels || [];
    var datasets = (opts.datasets || []).map(function (ds) {
      var color = ds.color || PALETTE.accent;
      return {
        label: ds.label || "Value",
        data: ds.data || [],
        borderColor: color,
        backgroundColor: ds.fill === false ? "transparent" : gradient(color),
        borderWidth: 2.4,
        tension: 0.42,
        fill: ds.fill !== false,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: color,
        spanGaps: true
      };
    });

    return make(target, {
      type: "line",
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: !!opts.showLegend, position: "top", align: "end" },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return (ctx.dataset.label ? ctx.dataset.label + ": " : "") +
                  ctx.formattedValue + (opts.unit ? " " + opts.unit : "");
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: opts.xTicks || 8, color: PALETTE.ticks }
          },
          y: {
            beginAtZero: !!opts.beginAtZero,
            suggestedMin: opts.min,
            suggestedMax: opts.max,
            grid: { color: PALETTE.grid, drawTicks: false },
            border: { display: false },
            ticks: {
              maxTicksLimit: 5,
              padding: 8,
              color: PALETTE.ticks,
              callback: axisLabel(opts.unit)
            }
          }
        }
      }
    });
  }

  /* ----------------------------------------------------------------- bar */
  function bar(target, opts) {
    opts = opts || {};
    var colors = opts.colors || null;
    return make(target, {
      type: "bar",
      data: {
        labels: opts.labels || [],
        datasets: [{
          label: opts.label || "Minutes",
          data: opts.data || [],
          backgroundColor: colors || hexToRgba(PALETTE.accent, 0.55),
          hoverBackgroundColor: colors || PALETTE.accent,
          borderRadius: 9,
          borderSkipped: false,
          maxBarThickness: 38
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.formattedValue + (opts.unit ? " " + opts.unit : "");
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: PALETTE.ticks, maxRotation: 0 }
          },
          y: {
            beginAtZero: true,
            suggestedMax: opts.max,
            grid: { color: PALETTE.grid, drawTicks: false },
            border: { display: false },
            ticks: { maxTicksLimit: 4, padding: 8, color: PALETTE.ticks, callback: axisLabel(opts.unit) }
          }
        }
      }
    });
  }

  /* ---------------------------------------------------------------- radar */
  function radar(target, opts) {
    opts = opts || {};
    return make(target, {
      type: "radar",
      data: {
        labels: opts.labels || [],
        datasets: [{
          label: opts.label || "Comfort",
          data: opts.data || [],
          borderColor: opts.color || PALETTE.accent,
          backgroundColor: hexToRgba(opts.color || PALETTE.accent, 0.18),
          pointBackgroundColor: "#fff",
          pointBorderColor: opts.color || PALETTE.accent,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.formattedValue + " / 100"; }
            }
          }
        },
        scales: {
          r: {
            min: 0,
            max: opts.max || 100,
            beginAtZero: true,
            angleLines: { color: "rgba(201,194,227,.12)" },
            grid: { color: "rgba(201,194,227,.12)", circular: true },
            pointLabels: {
              color: "rgba(201,194,227,.75)",
              font: { size: 11, weight: "500" }
            },
            ticks: { display: false, stepSize: 25 }
          }
        }
      }
    });
  }

  /* --------------------------------------------------------------- ring */
  function ring(target, opts) {
    opts = opts || {};
    var max = opts.max || 100;
    var value = Math.max(0, Math.min(max, opts.value || 0));
    return make(target, {
      type: "doughnut",
      data: {
        labels: [opts.label || "Progress", "Remaining"],
        datasets: [{
          data: [value, Math.max(0, max - value)],
          backgroundColor: [opts.color || PALETTE.accent, "rgba(58,58,82,.55)"],
          borderWidth: 0,
          borderRadius: 40
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "82%",
        rotation: -90,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        }
      }
    });
  }

  function destroy(target) {
    var el = canvasFrom(target);
    if (!el || !window.Chart || !window.Chart.getChart) return;
    var chart = window.Chart.getChart(el);
    if (chart) chart.destroy();
  }

  window.DeskSenseCharts = {
    line: line,
    bar: bar,
    radar: radar,
    ring: ring,
    destroy: destroy,
    colors: PALETTE
  };
})();
