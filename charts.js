/**
 * charts.js - Plotly 기반 인터랙티브 통계 시각화 모듈
 * 다크 모드 및 라이트 모드 지원, 고해상도 반응형 플롯 렌더링
 */

const ChartRenderer = (() => {
  // 테마 설정
  function getThemeColors(isDark = false) {
    if (isDark) {
      return {
        bg: '#1e293b',
        paperBg: '#0f172a',
        text: '#f1f5f9',
        subtext: '#94a3b8',
        grid: '#334155',
        primary: '#38bdf8',
        secondary: '#a855f7',
        accent: '#f43f5e',
        success: '#10b981',
        warning: '#f59e0b'
      };
    }
    return {
      bg: '#ffffff',
      paperBg: '#ffffff',
      text: '#1e293b',
      subtext: '#64748b',
      grid: '#e2e8f0',
      primary: '#0284c7',
      secondary: '#7c3aed',
      accent: '#e11d48',
      success: '#059669',
      warning: '#d97706'
    };
  }

  const defaultPlotlyConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: '통계분석_차트',
      height: 600,
      width: 1000,
      scale: 2
    }
  };

  // 1. 시계열 및 평활화 차트
  function renderTimeSeries(containerId, times, values, colName, smoothing = null, isDark = false) {
    const c = getThemeColors(isDark);
    const xData = times && times.length === values.length ? times : values.map((_, i) => i + 1);

    const traces = [
      {
        x: xData,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        name: colName,
        line: { color: c.primary, width: 2 },
        marker: { size: 5, color: c.primary, opacity: 0.7 }
      }
    ];

    if (smoothing && smoothing.sma) {
      traces.push({
        x: xData,
        y: smoothing.sma,
        type: 'scatter',
        mode: 'lines',
        name: 'SMA (단순이동평균)',
        line: { color: c.warning, width: 2.5, dash: 'dot' }
      });
    }

    if (smoothing && smoothing.ema) {
      traces.push({
        x: xData,
        y: smoothing.ema,
        type: 'scatter',
        mode: 'lines',
        name: 'EMA (지수평활)',
        line: { color: c.accent, width: 2.5, dash: 'dash' }
      });
    }

    const layout = {
      title: { text: `<b>${colName} 시계열 추세 및 평활화 분석</b>`, font: { color: c.text, size: 16 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: {
        title: times ? '측정 시각 / 인덱스' : '시점 (순서)',
        gridcolor: c.grid,
        showgrid: true
      },
      yaxis: {
        title: colName,
        gridcolor: c.grid,
        showgrid: true
      },
      legend: { orientation: 'h', y: 1.1, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 40, t: 70, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  // 2. SPC 공정 관리도 (Shewhart I-MR)
  function renderSPCChart(containerId, colName, spcResult, isDark = false) {
    const c = getThemeColors(isDark);
    const ind = spcResult.individual;
    const xVals = ind.values.map((_, i) => i + 1);

    // 위반 인덱스
    const violationSet = new Set(ind.violations.map(v => v.index));
    const normalX = [], normalY = [];
    const outlierX = [], outlierY = [];

    ind.values.forEach((v, i) => {
      if (violationSet.has(i)) {
        outlierX.push(i + 1);
        outlierY.push(v);
      } else {
        normalX.push(i + 1);
        normalY.push(v);
      }
    });

    const traces = [
      {
        x: xVals,
        y: ind.values,
        type: 'scatter',
        mode: 'lines',
        name: '공정 측정치',
        line: { color: c.primary, width: 1.8 }
      },
      {
        x: normalX,
        y: normalY,
        type: 'scatter',
        mode: 'markers',
        name: '정상 상태',
        marker: { color: c.primary, size: 6 }
      },
      {
        x: outlierX,
        y: outlierY,
        type: 'scatter',
        mode: 'markers',
        name: '관리한계 이탈 / 이상',
        marker: { color: c.accent, size: 10, symbol: 'diamond' }
      }
    ];

    const shapes = [
      // UCL
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        y0: ind.ucl,
        y1: ind.ucl,
        line: { color: '#ef4444', width: 2, dash: 'dash' }
      },
      // CL (중심선)
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        y0: ind.cl,
        y1: ind.cl,
        line: { color: '#10b981', width: 2 }
      },
      // LCL
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        y0: ind.lcl,
        y1: ind.lcl,
        line: { color: '#ef4444', width: 2, dash: 'dash' }
      }
    ];

    const annotations = [
      {
        xref: 'paper',
        x: 1.01,
        y: ind.ucl,
        text: `UCL: ${ind.ucl.toFixed(2)}`,
        showarrow: false,
        font: { color: '#ef4444', size: 11 },
        xanchor: 'left'
      },
      {
        xref: 'paper',
        x: 1.01,
        y: ind.cl,
        text: `CL: ${ind.cl.toFixed(2)}`,
        showarrow: false,
        font: { color: '#10b981', size: 11 },
        xanchor: 'left'
      },
      {
        xref: 'paper',
        x: 1.01,
        y: ind.lcl,
        text: `LCL: ${ind.lcl.toFixed(2)}`,
        showarrow: false,
        font: { color: '#ef4444', size: 11 },
        xanchor: 'left'
      }
    ];

    const layout = {
      title: { text: `<b>${colName} SPC 공정 관리도 (Individual X-Chart)</b>`, font: { color: c.text, size: 16 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { title: '측정 번호 (Time Seq)', gridcolor: c.grid, showgrid: true },
      yaxis: { title: colName, gridcolor: c.grid, showgrid: true },
      shapes,
      annotations,
      legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 90, t: 80, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  // 3. 히스토그램 및 정규분포 적합곡선
  function renderHistogram(containerId, values, colName, descStats, isDark = false) {
    const c = getThemeColors(isDark);
    const clean = descStats.cleanValues;
    const n = clean.length;
    const min = descStats.min;
    const max = descStats.max;

    // 정규분포 곡선 데이터 생성
    const curveX = [];
    const curveY = [];
    const step = (max - min) / 80;
    const binWidth = (max - min) / Math.ceil(Math.sqrt(n));

    for (let x = min - (max - min) * 0.1; x <= max + (max - min) * 0.1; x += step) {
      curveX.push(x);
      // PDF: 1 / (s * sqrt(2*pi)) * exp(-0.5 * ((x-m)/s)^2)
      const pdf = (1 / (descStats.stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - descStats.mean) / descStats.stdDev, 2));
      // 히스토그램 빈 높이에 맞추기 위한 스케일링
      curveY.push(pdf * n * binWidth);
    }

    const traces = [
      {
        x: clean,
        type: 'histogram',
        name: '실제 분포 빈도',
        marker: { color: 'rgba(56, 189, 248, 0.65)', line: { color: c.primary, width: 1.5 } },
        autobinx: true,
        opacity: 0.8
      },
      {
        x: curveX,
        y: curveY,
        type: 'scatter',
        mode: 'lines',
        name: '이론적 정규분포 곡선',
        line: { color: c.accent, width: 2.5 }
      }
    ];

    const shapes = [
      {
        type: 'line',
        x0: descStats.mean,
        x1: descStats.mean,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#f59e0b', width: 2, dash: 'dot' }
      },
      {
        type: 'line',
        x0: descStats.median,
        x1: descStats.median,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: { color: '#10b981', width: 2, dash: 'dash' }
      }
    ];

    const annotations = [
      {
        x: descStats.mean,
        y: 1,
        yref: 'paper',
        text: `평균: ${descStats.mean.toFixed(2)}`,
        showarrow: true,
        arrowhead: 2,
        font: { color: '#f59e0b', size: 11 }
      },
      {
        x: descStats.median,
        y: 0.8,
        yref: 'paper',
        text: `중위수: ${descStats.median.toFixed(2)}`,
        showarrow: true,
        arrowhead: 2,
        font: { color: '#10b981', size: 11 }
      }
    ];

    const layout = {
      title: { text: `<b>${colName} 분포 히스토그램 & 정규분포 적합</b>`, font: { color: c.text, size: 16 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { title: colName, gridcolor: c.grid, showgrid: true },
      yaxis: { title: '빈도 (Frequency)', gridcolor: c.grid, showgrid: true },
      shapes,
      annotations,
      legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 40, t: 80, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  // 4. 박스 플롯 / 바이올린 플롯
  function renderBoxPlot(containerId, colNames, dataMap, plotType = 'box', isDark = false) {
    const c = getThemeColors(isDark);
    const colors = ['#38bdf8', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

    const traces = colNames.map((name, idx) => ({
      y: dataMap[name],
      type: plotType,
      name,
      boxpoints: 'outliers',
      jitter: 0.3,
      pointpos: -1.8,
      marker: { color: colors[idx % colors.length], size: 4 },
      line: { width: 1.8 }
    }));

    const layout = {
      title: { text: `<b>변수별 ${plotType === 'box' ? '박스 플롯 (5-Number Summary)' : '바이올린 플롯'} 비교</b>`, font: { color: c.text, size: 16 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      yaxis: { title: '값 (Value)', gridcolor: c.grid, showgrid: true },
      legend: { orientation: 'h', y: 1.1, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 40, t: 70, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  // 5. 상관계수 히트맵
  function renderCorrelationHeatmap(containerId, cols, corrMatrix, isDark = false) {
    const c = getThemeColors(isDark);

    const zValues = cols.map(c1 => cols.map(c2 => Number((corrMatrix[c1][c2] || 0).toFixed(3))));
    const textValues = zValues.map(row => row.map(v => `${v}`));

    const trace = {
      z: zValues,
      x: cols,
      y: cols,
      text: textValues,
      type: 'heatmap',
      texttemplate: '%{text}',
      textfont: { color: '#ffffff', size: 12 },
      colorscale: [
        [0.0, '#3b82f6'],
        [0.5, '#f8fafc'],
        [1.0, '#ef4444']
      ],
      zmin: -1,
      zmax: 1,
      colorbar: {
        title: '상관계수 (r)',
        titleside: 'top',
        tickvals: [-1, -0.5, 0, 0.5, 1],
        tickfont: { color: c.text }
      }
    };

    const layout = {
      title: { text: '<b>변수 간 피어슨 상관계수 행렬 히트맵</b>', font: { color: c.text, size: 16 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { tickangle: -25 },
      yaxis: { autorange: 'reversed' },
      margin: { l: 120, r: 60, t: 70, b: 90 }
    };

    Plotly.react(containerId, [trace], layout, defaultPlotlyConfig);
  }

  // 6. 회귀분석 산점도 및 적합선
  function renderRegressionPlot(containerId, xVals, yVals, xName, yName, regResult, isDark = false) {
    const c = getThemeColors(isDark);

    // 최소/최대 X에 따른 적합선
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    const lineX = [minX, maxX];
    const lineY = [regResult.slope * minX + regResult.intercept, regResult.slope * maxX + regResult.intercept];

    // 신뢰구간 밴드 (95% CI)
    const ciStep = (maxX - minX) / 40;
    const ciX = [];
    const ciUpper = [];
    const ciLower = [];
    const tCrit = 1.984; // df ~ 100 기준

    for (let x = minX; x <= maxX; x += ciStep) {
      ciX.push(x);
      const fit = regResult.slope * x + regResult.intercept;
      const seFit = regResult.standardError * Math.sqrt(1 / regResult.n + Math.pow(x - regResult.meanX, 2) / regResult.ssXX);
      ciUpper.push(fit + tCrit * seFit);
      ciLower.push(fit - tCrit * seFit);
    }

    const traces = [
      // 신뢰구간 밴드
      {
        x: ciX.concat(ciX.slice().reverse()),
        y: ciUpper.concat(ciLower.slice().reverse()),
        fill: 'toself',
        fillcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(2, 132, 199, 0.12)',
        line: { color: 'transparent' },
        name: '95% 신뢰구간(CI)',
        showlegend: true,
        type: 'scatter'
      },
      // 데이터 산점도
      {
        x: xVals,
        y: yVals,
        type: 'scatter',
        mode: 'markers',
        name: '측정 데이터',
        marker: { color: c.primary, size: 7, opacity: 0.75 }
      },
      // 회귀 직선
      {
        x: lineX,
        y: lineY,
        type: 'scatter',
        mode: 'lines',
        name: `회귀선: ${regResult.equationStr}`,
        line: { color: c.accent, width: 2.8 }
      }
    ];

    const layout = {
      title: {
        text: `<b>${xName} vs ${yName} 선형 회귀분석</b><br><span style="font-size: 13px; color: ${c.subtext};">R² = ${regResult.r2.toFixed(4)}, r = ${regResult.r.toFixed(4)}, p-val < 0.001</span>`,
        font: { color: c.text, size: 16 }
      },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { title: xName, gridcolor: c.grid, showgrid: true },
      yaxis: { title: yName, gridcolor: c.grid, showgrid: true },
      legend: { orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 40, t: 90, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  // 7. 잔차 분석 플롯 (Residuals vs Fitted)
  function renderResidualPlot(containerId, regResult, isDark = false) {
    const c = getThemeColors(isDark);
    const fitted = regResult.residuals.map(r => r.fitted);
    const resids = regResult.residuals.map(r => r.residual);

    const trace = {
      x: fitted,
      y: resids,
      type: 'scatter',
      mode: 'markers',
      name: '잔차(Residuals)',
      marker: { color: c.secondary, size: 7, opacity: 0.8 }
    };

    const shapes = [
      {
        type: 'line',
        xref: 'paper',
        x0: 0,
        x1: 1,
        y0: 0,
        y1: 0,
        line: { color: '#ef4444', width: 2, dash: 'dash' }
      }
    ];

    const layout = {
      title: { text: '<b>잔차도 (Residuals vs Fitted - 등분산성 진단)</b>', font: { color: c.text, size: 15 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { title: '예측값 (Fitted Values)', gridcolor: c.grid, showgrid: true },
      yaxis: { title: '잔차 (Residuals)', gridcolor: c.grid, showgrid: true },
      shapes,
      margin: { l: 60, r: 30, t: 60, b: 50 }
    };

    Plotly.react(containerId, [trace], layout, defaultPlotlyConfig);
  }

  // 8. Q-Q Plot (정규성 진단)
  function renderQQPlot(containerId, qqData, title = '정규 Q-Q Plot', isDark = false) {
    const c = getThemeColors(isDark);
    const theor = qqData.points.map(p => p.theoretical);
    const sample = qqData.points.map(p => p.standardSample);

    const minZ = Math.min(...theor);
    const maxZ = Math.max(...theor);

    const traces = [
      {
        x: theor,
        y: sample,
        type: 'scatter',
        mode: 'markers',
        name: '분위수 데이터',
        marker: { color: c.primary, size: 7, opacity: 0.8 }
      },
      {
        x: [minZ, maxZ],
        y: [minZ, maxZ],
        type: 'scatter',
        mode: 'lines',
        name: '기준선 (정규분포 45°)',
        line: { color: c.accent, width: 2, dash: 'dash' }
      }
    ];

    const layout = {
      title: { text: `<b>${title} (정규성 검정)</b>`, font: { color: c.text, size: 15 } },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { title: '이론적 정규 분위수 (Theoretical Quantiles)', gridcolor: c.grid, showgrid: true },
      yaxis: { title: '표준화 표본 분위수 (Sample Quantiles)', gridcolor: c.grid, showgrid: true },
      legend: { orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 30, t: 60, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  // 9. 이상치 시각화
  function renderOutlierChart(containerId, values, colName, outlierResult, isDark = false) {
    const c = getThemeColors(isDark);
    const outlierSet = new Set(outlierResult.outliers.map(o => o.idx));

    const normalX = [], normalY = [];
    const outX = [], outY = [];

    values.forEach((v, idx) => {
      if (outlierSet.has(idx)) {
        outX.push(idx + 1);
        outY.push(v);
      } else {
        normalX.push(idx + 1);
        normalY.push(v);
      }
    });

    const traces = [
      {
        x: normalX,
        y: normalY,
        type: 'scatter',
        mode: 'markers',
        name: '정상치',
        marker: { color: c.primary, size: 7, opacity: 0.7 }
      },
      {
        x: outX,
        y: outY,
        type: 'scatter',
        mode: 'markers',
        name: `이상치 (${outlierResult.outlierCount}건)`,
        marker: { color: '#ef4444', size: 11, symbol: 'x', line: { width: 2 } }
      }
    ];

    const shapes = [];
    if (outlierResult.bounds) {
      shapes.push(
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: outlierResult.bounds.upper,
          y1: outlierResult.bounds.upper,
          line: { color: '#ef4444', width: 1.5, dash: 'dot' }
        },
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: outlierResult.bounds.lower,
          y1: outlierResult.bounds.lower,
          line: { color: '#ef4444', width: 1.5, dash: 'dot' }
        }
      );
    }

    const layout = {
      title: {
        text: `<b>${colName} 이상치 탐지 (${outlierResult.method})</b>`,
        font: { color: c.text, size: 16 }
      },
      paper_bgcolor: c.paperBg,
      plot_bgcolor: c.bg,
      font: { color: c.text },
      xaxis: { title: '데이터 인덱스 (행 번호)', gridcolor: c.grid, showgrid: true },
      yaxis: { title: colName, gridcolor: c.grid, showgrid: true },
      shapes,
      legend: { orientation: 'h', y: 1.12, x: 0.5, xanchor: 'center' },
      margin: { l: 60, r: 40, t: 80, b: 50 }
    };

    Plotly.react(containerId, traces, layout, defaultPlotlyConfig);
  }

  return {
    renderTimeSeries,
    renderSPCChart,
    renderHistogram,
    renderBoxPlot,
    renderCorrelationHeatmap,
    renderRegressionPlot,
    renderResidualPlot,
    renderQQPlot,
    renderOutlierChart,
    getThemeColors
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChartRenderer;
}
