// ==UserScript==
// @name         Better Growth Charts
// @author       baul
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  Interactive growth chart for Illyriad
// @match        *://elgea.illyriad.co.uk/*
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/chart.js
// @require      https://cdn.jsdelivr.net/npm/hammerjs/hammer.min.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js
// @updateURL    https://github.com/baul-illy/itools/raw/refs/heads/main/Better-Growth-Charts.user.js
// @downloadURL  https://github.com/baul-illy/itools/raw/refs/heads/main/Better-Growth-Charts.user.js
// ==/UserScript==

(function() {
  'use strict';

  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  window.Chart.register(window.ChartZoom);

  const METRIC_CONFIG = {
    membersGraph: { key: 'Members', label: 'Members', color: '#1d5b05', bg: 'rgba(29, 91, 5, 0.08)' },
    popGraph: { key: 'Pop', label: 'Population', color: '#1d5b05', bg: 'rgba(29, 91, 5, 0.08)' },
    townsGraph: { key: 'Towns', label: 'Towns', color: '#c7b302', bg: 'rgba(199, 179, 2, 0.08)' },
    sovGraph: { key: 'Land', label: 'Land', color: '#a5c40b', bg: 'rgba(165, 196, 11, 0.08)' },
    tradeScoreGraph: { key: 'Trade', label: 'Trade Score', color: '#8611c9', bg: 'rgba(134, 17, 201, 0.08)' },
    techScoreGraph: { key: 'Tech', label: 'Technology Score', color: '#024902', bg: 'rgba(2, 73, 2, 0.08)' },
    diploScoreGraph: { key: 'Diplo', label: 'Diplomatic Score', color: '#db2215', bg: 'rgba(219, 34, 21, 0.08)' },
    atkScoreGraph: { key: 'Atk', label: 'Attack Score', color: '#931b00', bg: 'rgba(147, 27, 0, 0.08)' },
    defScoreGraph: { key: 'Def', label: 'Defense Score', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
    questScoreGraph: { key: 'Quest', label: 'Quest Score', color: '#8c02c7', bg: 'rgba(140, 2, 199, 0.08)' },
    magicScoreGraph: { key: 'Magic', label: 'Magic Score', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
    popScoreGraph: { key: 'Build', label: 'Build Score', color: '#12c702', bg: 'rgba(18, 199, 2, 0.08)' }
  };

  const capturedData = {
    Members: null,
    Pop: null,
    Towns: null,
    Sov: null,
    Trade: null,
    Tech: null,
    Diplo: null,
    Atk: null,
    Def: null,
    Quest: null,
    Magic: null,
    Build: null
  };

  let selectedMetric = 'Members';
  let selectedRightMetric = 'None';
  let chartInstance = null;

  function cleanup() {
    if (chartInstance) {
      try {
        chartInstance.destroy();
      } catch (e) {
        console.warn('[Growth Chart] Error destroying chart instance:', e);
      }
      chartInstance = null;
    }

    const panel = document.getElementById('custom-interactive-panel');
    if (panel) {
      panel.remove();
    }

    for (const key in capturedData) {
      capturedData[key] = null;
    }

    if (document.URL.includes('Alliance')) {
      selectedMetric = 'Members';
    } else {
      selectedMetric = 'Pop';
    }
    selectedRightMetric = 'None';
  }

  win.addEventListener('hashchange', cleanup);
  win.addEventListener('popstate', cleanup);

  function formatTimestamp(ts) {
    if (typeof ts === 'number') {
      const date = new Date(ts > 1e11 ? ts : ts * 1000);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString([], {month: 'numeric', day: 'numeric'}) + ' ' + date.toLocaleTimeString([], { hour: '2-digit',  minute: '2-digit', hour12: false });
      }
    }
    return String(ts);
  }

  function updateChart() {
    const canvas = document.getElementById('customInteractiveCanvas');
    if (!canvas) return;

    if (chartInstance && (chartInstance.canvas !== canvas || !chartInstance.canvas.isConnected)) {
      try {
        chartInstance.destroy();
      } catch (e) {}
      chartInstance = null;
    }

    if (selectedMetric === 'Members' && !document.URL.includes("Alliance")) {
      selectedMetric = 'Pop';
    }
    if (selectedRightMetric === 'Members' && !document.URL.includes("Alliance")) {
      selectedRightMetric = 'None';
    }

    const rawData = capturedData[selectedMetric];
    const cfg = Object.values(METRIC_CONFIG).find(c => c.key === selectedMetric);

    const hasRight = selectedRightMetric && selectedRightMetric !== 'None';
    const cfgRight = hasRight ? Object.values(METRIC_CONFIG).find(c => c.key === selectedRightMetric) : null;
    const rawDataRight = hasRight ? capturedData[selectedRightMetric] : null;
    const hasRightData = Boolean(hasRight && cfgRight && rawDataRight && rawDataRight.length);

    if (!rawData || !rawData.length) {
      if (chartInstance) {
        chartInstance.data.labels = ['No data captured yet'];
        chartInstance.data.datasets = [{
          label: `${cfg.label} (Awaiting Data...)`,
          data: [0]
        }];
        if (chartInstance.options.scales.y1) {
          chartInstance.options.scales.y1.display = false;
        }
        chartInstance.update('none');
      }
      return;
    }

    let rawTimestamps;
    let leftValues;
    let rightValues = null;
    rawTimestamps = new Array(rawData.length);
    leftValues = new Array(rawData.length);
    rightValues = new Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) {
      rawTimestamps[i] = rawData[i][0];
      leftValues[i] = rawData[i][1];
      if (hasRightData) {
        rightValues[i] = rawDataRight[i][1];
      }
    }

    const datasets = [{
      label: cfg.label,
      data: leftValues,
      borderColor: cfg.color,
      backgroundColor: cfg.bg,
      fill: true,
      tension: 0,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 1.5,
      normalized: true,
      spanGaps: true,
      yAxisID: 'y'
    }];

    if (hasRightData) {
      datasets.push({
        label: cfgRight.label,
        data: rightValues,
        borderColor: cfgRight.color,
        backgroundColor: cfgRight.bg,
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 1.5,
        normalized: true,
        spanGaps: true,
        yAxisID: 'y1'
      });
    }

    if (!chartInstance) {
      chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels: rawTimestamps,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          scales: {
            x: {
              ticks: {
                maxTicksLimit: 8,
                maxRotation: 0,
                callback: function(val) {
                  const ts = this.getLabelForValue(val);
                  return formatTimestamp(Number(ts));
                }
              },
            },
            y: {
              position: 'left',
              ticks: {
                callback: (v) => v.toLocaleString()
              }
            },
            y1: {
              position: 'right',
              display: hasRightData,
              grid: {
                drawOnChartArea: false
              },
              ticks: {
                callback: (v) => v.toLocaleString()
              }
            }
          },
          plugins: {
            responsive: true,
            legend: {
              display: false,
              labels: { color: '#334155', font: { size: 12, weight: '600' } }
            },
            tooltip: {
              backgroundColor: '#f2ebcc',
              titleColor: '#000000',
              bodyColor: cfg.color,
              borderColor: '#000000',
              borderWidth: 0,
              padding: 8,
              displayColors: false,
              callbacks: {
                title: (items) => {
                  if (!items.length) return '';
                  return formatTimestamp(Number(items[0].label));
                },
                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y !== null && ctx.parsed.y !== undefined ? ctx.parsed.y.toLocaleString() : ''}`
              }
            },
            zoom: {
              zoom: {
                wheel: {enabled: true},
                pinch: {enabled: true},
                mode: 'x',
              },
              pan: {enabled: true, mode: 'x'}
            }
          }
        }
      });
    } else {
      chartInstance.data.labels = rawTimestamps;
      chartInstance.data.datasets = datasets;
      chartInstance.options.scales.y1.display = hasRightData;
      chartInstance.options.plugins.tooltip.bodyColor = cfg.color;
      chartInstance.update('none');
    }
  }

  let chartUpdatePending = false;

  function scheduleChartUpdate() {
    if (chartUpdatePending) return;
    chartUpdatePending = true;
    requestAnimationFrame(() => {
      chartUpdatePending = false;
      updateChart();
    });
  }

  function mountDashboard(nativeContainer) {
    if (!nativeContainer || !nativeContainer.parentNode) return;

    let panel = document.getElementById('custom-interactive-panel');

    if (panel && (!panel.isConnected || panel.nextElementSibling !== nativeContainer)) {
      panel.remove();
      panel = null;
      if (chartInstance) {
        try {
          chartInstance.destroy();
        } catch (e) {}
        chartInstance = null;
      }
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'custom-interactive-panel';
      panel.style.cssText = `
        display: block;
        width: 100%;
        margin-bottom: 16px;
        padding: 14px;
        box-sizing: border-box;
        background: #fefae8;
        border: 1px solid #c4c1c1;
        border-radius: 0px;
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display: flex; align-items: center; margin-bottom: 12px; justify-content: space-between;';

      const select = document.createElement('select');
      select.id = 'metricDropdownSelect';

      const options = [
        ['Population', 'Pop'],
        ['Towns', 'Towns'],
        ['Land', 'Land'],
        ['Trade', 'Trade'],
        ['Tech', 'Tech'],
        ['Diplomacy', 'Diplo'],
        ['Attack', 'Atk'],
        ['Defense', 'Def'],
        ['Quest', 'Quest'],
        ['Magic', 'Magic'],
        ['Build', 'Build']
      ];

      if (document.URL.includes("Alliance")) {
        options.unshift(['Members', 'Members']);
      }

      for (const [text, val] of options) {
        select.add(new Option(text, val));
      }

      select.value = selectedMetric;
      select.addEventListener('change', (e) => {
        selectedMetric = e.target.value;
        scheduleChartUpdate();
        if (chartInstance) {
          chartInstance.resetZoom();
        }
      });

      const rightSelect = document.createElement('select');
      rightSelect.id = 'rightMetricDropdownSelect';

      rightSelect.add(new Option('None', 'None'));
      for (const [text, val] of options) {
        rightSelect.add(new Option(text, val));
      }

      rightSelect.value = selectedRightMetric;
      rightSelect.addEventListener('change', (e) => {
        selectedRightMetric = e.target.value;
        scheduleChartUpdate();
        // if (chartInstance) {
        //   chartInstance.resetZoom();
        // }
      });

      const selectContainer = document.createElement('div');
      selectContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      selectContainer.appendChild(select);
      selectContainer.appendChild(rightSelect);

      toolbar.appendChild(selectContainer);

      const resetZoomButton = document.createElement('button');
      resetZoomButton.id = 'resetZoomButton';
      resetZoomButton.innerText = 'Reset Zoom';
      resetZoomButton.addEventListener('click', () => {
        if (chartInstance) {
          chartInstance.resetZoom();
        }
      });
      toolbar.append(resetZoomButton);

      const chartWrapper = document.createElement('div');
      chartWrapper.style.cssText = 'position: relative; height: 320px; width: 100%;';

      const canvas = document.createElement('canvas');
      canvas.id = 'customInteractiveCanvas';
      chartWrapper.appendChild(canvas);

      panel.appendChild(toolbar);
      panel.appendChild(chartWrapper);

      nativeContainer.parentNode.insertBefore(panel, nativeContainer);

      scheduleChartUpdate();
    }
  }

  function hookFlotr(flotr) {
    if (!flotr || flotr.__interactiveSuiteInstalled) return;

    const originalDraw = flotr.draw;
    flotr.draw = function(container, data) {
      const result = originalDraw.apply(this, arguments);

      try {
        const target = typeof container === 'string'
          ? document.getElementById(container)
          : container;

        const id = target?.id || target?.getAttribute?.('id');

        if (id === 'membersGraph' || (id === 'popGraph' && !document.URL.includes("Alliance"))) {
          mountDashboard(target);
        }

        if (METRIC_CONFIG[id]) {
          const metricKey = METRIC_CONFIG[id].key;
          if (data && data[0] && Array.isArray(data[0].data)) {
            capturedData[metricKey] = data[0].data;
          }
        }
      } catch (err) {
        console.error('[Interactive Suite] Error in Flotr hook:', err);
      }

      return result;
    };

    flotr.__interactiveSuiteInstalled = true;
  }

  if (win.Flotr) {
    hookFlotr(win.Flotr);
  } else {
    let internalFlotr;
    Object.defineProperty(win, 'Flotr', {
      configurable: true,
      enumerable: true,
      get: () => internalFlotr,
      set: (val) => {
        internalFlotr = val;
        hookFlotr(val);
      }
    });
  }
})();
