// ==UserScript==
// @name         Better Growth Charts
// @author       baul
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Interactive growth chart for Illyriad
// @match        *://elgea.illyriad.co.uk/*
// @grant        unsafeWindow
// @run-at       document-start
// @require      https://cdn.jsdelivr.net/npm/chart.js
// @require      https://cdn.jsdelivr.net/npm/hammerjs/hammer.min.js
// @require      https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js
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

  let selectedMetric = 'Pop';
  let chartInstance = null;

  /**
   * Completely destroys active chart instance, removes injected UI,
   * and clears captured data to prevent memory leaks and zombie canvases.
   */
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

    if (document.URL) {
      selectedMetric = 'Pop';
    } else {
      selectedMetric = 'Members';
    }
  }

  win.addEventListener('hashchange', cleanup);
  win.addEventListener('popstate', cleanup);

  function formatTimestamp(ts) {
    if (typeof ts === 'number') {
      const date = new Date(ts > 1e11 ? ts : ts * 1000);
      if (!isNaN(date.getTime())) {
        // return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    const rawData = capturedData[selectedMetric];
    const cfg = Object.values(METRIC_CONFIG).find(c => c.key === selectedMetric);

    if (!rawData || !rawData.length) {
      if (chartInstance) {
        chartInstance.data.labels = ['No data captured yet'];
        chartInstance.data.datasets[0].data = [0];
        chartInstance.data.datasets[0].label = `${cfg.label} (Awaiting Data...)`;
        chartInstance.update('none');
      }
      return;
    }

    const sortedData = [...rawData].sort((a, b) => a[0] - b[0]);
    const rawTimestamps = new Array(sortedData.length);
    const values = new Array(sortedData.length);

    for (let i = 0; i < sortedData.length; i++) {
      rawTimestamps[i] = sortedData[i][0];
      values[i] = sortedData[i][1];
    }

    if (!chartInstance) {
      chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels: rawTimestamps,
          datasets: [{
            label: cfg.label,
            data: values,
            borderColor: cfg.color,
            backgroundColor: cfg.bg,
            fill: true,
            tension: 0,             // why the fuck does chart.js default to Bezier curves
            pointRadius: 0,         // Zero base circles drawn
            pointHoverRadius: 5,    // Circle only draws when hovered
            borderWidth: 1.5,
            normalized: true        
          }]
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
              // bounds: 'ticks',
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                color: '#64748b',
                maxTicksLimit: 8,
                maxRotation: 0,
                callback: function(val, index) {
                  const ts = this.getLabelForValue(val);
                  return formatTimestamp(Number(ts));
                }
              },
            },
            y: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                color: '#64748b',
                callback: (v) => v.toLocaleString()
              }
            }
          },
          plugins: {
            responsive: true,
            legend: {
              display: false, // temporary until multiplotting - hides the legend
              labels: { color: '#334155', font: { size: 12, weight: '600' } }
            },
            tooltip: {
              backgroundColor: '#ffffff',
              titleColor: '#0f172a',
              bodyColor: cfg.color,
              borderColor: '#e2e8f0',
              borderWidth: 1,
              padding: 8,
              displayColors: false,
              callbacks: {
                title: (items) => {
                  if (!items.length) return '';
                  return formatTimestamp(Number(items[0].label));
                },
                // label: (ctx) => ` ${cfg.label}: ${ctx.parsed.y.toLocaleString()}`
                label: (ctx) => ` Value: ${ctx.parsed.y.toLocaleString()}`
              }
            },
            zoom: {
              zoom: {
                wheel: {
                  enabled: true, // Enable zooming with mouse wheel
                },
                pinch: {
                  enabled: true // Enable zooming with pinch gestures (touch screens)
                },
                mode: 'x', // Zoom direction: 'x', 'y', or 'xy'
              },
              pan: {
                enabled: true,
                mode: 'x', // Pan direction
              }
            }
          }
        }
      });
    } else {
      chartInstance.data.labels = rawTimestamps;
      chartInstance.data.datasets[0].label = cfg.label;
      chartInstance.data.datasets[0].data = values;
      chartInstance.data.datasets[0].borderColor = cfg.color;
      chartInstance.data.datasets[0].backgroundColor = cfg.bg;
      chartInstance.options.plugins.tooltip.bodyColor = cfg.color;
      chartInstance.update('none'); // 'none' skips update animation
    }
  }

  function mountDashboard(nativeContainer) {
    if (!nativeContainer || !nativeContainer.parentNode) return;

    let panel = document.getElementById('custom-interactive-panel');

    // If a stale panel exists but is detached or misplaced relative to the new popGraph, wipe it
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
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;

      const toolbar = document.createElement('div');
      toolbar.style.cssText = 'display: flex; align-items: center; margin-bottom: 12px;';
      // toolbar.style.display = 'flex'

      // select
      const select = document.createElement('select');
      select.id = 'metricDropdownSelect';
      select.style.cssText = `
        background: #f8fafc;
        color: #0f172a;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 5px 12px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
      `;

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

      // if (document.querySelector('#membersGraph') !== null) {
      if (document.URL.includes("Alliance")) {
        // const options = [['Members','Members'], ...options];
        options.unshift(['Members','Members'])
      }

      for (const [text, val] of options) {
        select.add(new Option(text, val));
      }

      select.value = selectedMetric;
      select.addEventListener('change', (e) => {
        selectedMetric = e.target.value;
        updateChart();
      });

      toolbar.appendChild(select);

      // Reset Zoom
      const resetZoomButton = document.createElement('button');
      resetZoomButton.id = 'resetZoomButton';
      // resetZoomButton.style.position = 'absolute';
      // resetZoomButton.style.right = '0px';
      // resetZoomButton.style.left = '150px';
      resetZoomButton.style.marginLeft = 'auto';
      resetZoomButton.innerText = 'Reset Zoom';
      resetZoomButton.addEventListener('click', () => {
        if (chartInstance) {
          chartInstance.resetZoom();
        }
      });
      toolbar.append(resetZoomButton)

      // Chart
      const chartWrapper = document.createElement('div');
      chartWrapper.style.cssText = 'position: relative; height: 320px; width: 100%;';

      const canvas = document.createElement('canvas');
      canvas.id = 'customInteractiveCanvas';
      chartWrapper.appendChild(canvas);

      panel.appendChild(toolbar);
      panel.appendChild(chartWrapper);

      nativeContainer.parentNode.insertBefore(panel, nativeContainer);
    }

    updateChart();
  }

  function hookFlotr(flotr) {
    if (!flotr || flotr.__interactiveSuiteInstalled) return;

    const originalDraw = flotr.draw;
    flotr.draw = function(container, data) {
      try {
        const target = typeof container === 'string'
          ? document.getElementById(container)
          : container;

        const id = target?.id || target?.getAttribute?.('id');

        if (METRIC_CONFIG[id]) {
          const metricKey = METRIC_CONFIG[id].key;
          if (data && data[0] && Array.isArray(data[0].data)) {
            capturedData[metricKey] = data[0].data;
            updateChart();
          }
        }

        if (id === 'membersGraph' || (id === 'popGraph' && !document.URL.includes("Alliance"))) {
          mountDashboard(target);
        }
      } catch (err) {
        console.error('[Interactive Suite] Error in Flotr hook:', err);
      }

      return originalDraw.apply(this, arguments);
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
