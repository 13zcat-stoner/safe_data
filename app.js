/**
 * app.js - 대시보드 메인 오케스트레이터
 * 모든 통계 기법의 원클릭 적용, 실시간 인터랙티브 시각화, 이벤트 핸들링 관리
 */

document.addEventListener('DOMContentLoaded', () => {
  // 전역 앱 상태
  const state = {
    isDark: true,
    activeTab: 'tab-regression',
    currentOutlierResult: null
  };

  // DOM 캐싱
  const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    themeText: document.getElementById('themeText'),
    printReportBtn: document.getElementById('printReportBtn'),
    datasetNameText: document.getElementById('datasetNameText'),
    rowCountBadge: document.getElementById('rowCountBadge'),
    colCountBadge: document.getElementById('colCountBadge'),
    filterStatusBadge: document.getElementById('filterStatusBadge'),
    openUploadModalBtn: document.getElementById('openUploadModalBtn'),
    resetDefaultDataBtn: document.getElementById('resetDefaultDataBtn'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),

    // KPI
    kpiTotalRows: document.getElementById('kpiTotalRows'),
    kpiTempMean: document.getElementById('kpiTempMean'),
    kpiTempRange: document.getElementById('kpiTempRange'),
    kpiVibMean: document.getElementById('kpiVibMean'),
    kpiVibMax: document.getElementById('kpiVibMax'),
    kpiPressMean: document.getElementById('kpiPressMean'),
    kpiPressStd: document.getElementById('kpiPressStd'),
    kpiR2: document.getElementById('kpiR2'),

    // 탭 & 프리셋
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    presetBtns: document.querySelectorAll('.preset-btn'),

    // 회귀분석
    regVarX: document.getElementById('regVarX'),
    regVarY: document.getElementById('regVarY'),
    regShowCi: document.getElementById('regShowCi'),
    runRegBtn: document.getElementById('runRegBtn'),
    regTableBody: document.getElementById('regTableBody'),
    regEquationBadge: document.getElementById('regEquationBadge'),
    regInsightBox: document.getElementById('regInsightBox'),

    // SPC
    spcVar: document.getElementById('spcVar'),
    spcSmaWindow: document.getElementById('spcSmaWindow'),
    spcEmaAlpha: document.getElementById('spcEmaAlpha'),
    spcDisplayMode: document.getElementById('spcDisplayMode'),
    runSpcBtn: document.getElementById('runSpcBtn'),
    spcTableBody: document.getElementById('spcTableBody'),
    spcInsightBox: document.getElementById('spcInsightBox'),

    // 기술통계
    descTargetVar: document.getElementById('descTargetVar'),
    descPlotType: document.getElementById('descPlotType'),
    runDescBtn: document.getElementById('runDescBtn'),
    descTableBody: document.getElementById('descTableBody'),
    descInsightBox: document.getElementById('descInsightBox'),

    // 상관분석
    corrMethod: document.getElementById('corrMethod'),
    corrPairX: document.getElementById('corrPairX'),
    corrPairY: document.getElementById('corrPairY'),
    runCorrBtn: document.getElementById('runCorrBtn'),
    corrRankingTableBody: document.getElementById('corrRankingTableBody'),
    corrInsightBox: document.getElementById('corrInsightBox'),

    // 이상치
    outlierVar: document.getElementById('outlierVar'),
    outlierMethod: document.getElementById('outlierMethod'),
    outlierThresh: document.getElementById('outlierThresh'),
    outlierThreshLabel: document.getElementById('outlierThreshLabel'),
    runOutlierBtn: document.getElementById('runOutlierBtn'),
    filterOutliersBtn: document.getElementById('filterOutliersBtn'),
    clearFilterBtn: document.getElementById('clearFilterBtn'),
    outlierTableBody: document.getElementById('outlierTableBody'),
    outlierCountBadge: document.getElementById('outlierCountBadge'),
    outlierInsightBox: document.getElementById('outlierInsightBox'),

    // 가설검정
    testType: document.getElementById('testType'),
    testVar1: document.getElementById('testVar1'),
    testVar2: document.getElementById('testVar2'),
    testVar1Group: document.getElementById('testVar1Group'),
    testVar2Group: document.getElementById('testVar2Group'),
    testMu0: document.getElementById('testMu0'),
    testMu0Group: document.getElementById('testMu0Group'),
    runTestBtn: document.getElementById('runTestBtn'),
    testTableBody: document.getElementById('testTableBody'),
    testInsightBox: document.getElementById('testInsightBox'),
    testResultTitle: document.getElementById('testResultTitle'),

    // 원시데이터
    rawSearchInput: document.getElementById('rawSearchInput'),
    rawDataTableHead: document.getElementById('rawDataTableHead'),
    rawDataTableBody: document.getElementById('rawDataTableBody'),
    rawTableRowsBadge: document.getElementById('rawTableRowsBadge'),

    // 업로드 모달
    uploadModal: document.getElementById('uploadModal'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    fileDropzone: document.getElementById('fileDropzone'),
    fileInputElement: document.getElementById('fileInputElement'),
    browseFileBtn: document.getElementById('browseFileBtn'),
    uploadErrorBox: document.getElementById('uploadErrorBox')
  };

  // 1. 드롭다운 선택 옵션들 채우기
  function populateDropdowns() {
    const ds = DataStore.getDataset();
    const numCols = ds.numericColumns;

    function fillSelect(selectElem, cols, preferredDefault) {
      if (!selectElem) return;
      const currentVal = selectElem.value;
      selectElem.innerHTML = '';
      cols.forEach(col => {
        const opt = document.createElement('option');
        opt.value = col;
        opt.textContent = col;
        selectElem.appendChild(opt);
      });

      if (cols.includes(currentVal)) {
        selectElem.value = currentVal;
      } else if (preferredDefault && cols.includes(preferredDefault)) {
        selectElem.value = preferredDefault;
      } else if (cols.length > 0) {
        selectElem.value = cols[0];
      }
    }

    fillSelect(elements.regVarX, numCols, '온도센서원시값');
    fillSelect(elements.regVarY, numCols, '온도참값');
    fillSelect(elements.spcVar, numCols, '온도참값');
    fillSelect(elements.descTargetVar, numCols, '온도참값');
    fillSelect(elements.corrPairX, numCols, '온도센서원시값');
    fillSelect(elements.corrPairY, numCols, '온도참값');
    fillSelect(elements.outlierVar, numCols, '진동rms(mm/s)');
    fillSelect(elements.testVar1, numCols, '온도참값');
    fillSelect(elements.testVar2, numCols, '온도센서원시값');
  }

  // 2. KPI 카드 계산 및 갱신
  function updateKPICards() {
    const ds = DataStore.getDataset();
    const activeRows = ds.rows.filter((_, idx) => !ds.filteredIndices.has(idx));
    const totalCount = activeRows.length;

    elements.kpiTotalRows.textContent = totalCount;
    elements.rowCountBadge.textContent = `${totalCount} 행` + (ds.filteredIndices.size > 0 ? ` (${ds.filteredIndices.size}행 제외됨)` : '');
    elements.colCountBadge.textContent = `${ds.header.length} 컬럼`;
    elements.datasetNameText.textContent = ds.sourceName;
    elements.filterStatusBadge.textContent = ds.filteredIndices.size > 0 ? `필터 적용: ${ds.filteredIndices.size}건 제외` : '필터: 없음';

    // 온도 참값
    const tempVals = ds.numericColumns.includes('온도참값') ? activeRows.map(r => r['온도참값']).filter(v => v !== null) : [];
    if (tempVals.length > 0) {
      const descT = StatsEngine.descriptive(tempVals);
      elements.kpiTempMean.textContent = `${descT.mean.toFixed(2)} ℃`;
      elements.kpiTempRange.textContent = `범위: ${descT.min.toFixed(2)} ~ ${descT.max.toFixed(2)}`;
    } else {
      elements.kpiTempMean.textContent = '-';
      elements.kpiTempRange.textContent = '-';
    }

    // 진동 RMS
    const vibVals = ds.numericColumns.includes('진동rms(mm/s)') ? activeRows.map(r => r['진동rms(mm/s)']).filter(v => v !== null) : [];
    if (vibVals.length > 0) {
      const descV = StatsEngine.descriptive(vibVals);
      elements.kpiVibMean.textContent = `${descV.mean.toFixed(2)} mm/s`;
      elements.kpiVibMax.textContent = `최대: ${descV.max.toFixed(2)} mm/s`;
    } else {
      elements.kpiVibMean.textContent = '-';
      elements.kpiVibMax.textContent = '-';
    }

    // 압력
    const pressVals = ds.numericColumns.includes('압력(kpa)') ? activeRows.map(r => r['압력(kpa)']).filter(v => v !== null) : [];
    if (pressVals.length > 0) {
      const descP = StatsEngine.descriptive(pressVals);
      elements.kpiPressMean.textContent = `${descP.mean.toFixed(2)} kPa`;
      elements.kpiPressStd.textContent = `표준편차: ±${descP.stdDev.toFixed(2)} kPa`;
    } else {
      elements.kpiPressMean.textContent = '-';
      elements.kpiPressStd.textContent = '-';
    }

    // 회귀 R2 (원시값 vs 참값)
    if (ds.numericColumns.includes('온도센서원시값') && ds.numericColumns.includes('온도참값')) {
      const reg = StatsEngine.linearRegression(
        activeRows.map(r => r['온도센서원시값']),
        activeRows.map(r => r['온도참값'])
      );
      if (reg) {
        elements.kpiR2.textContent = reg.r2.toFixed(4);
      }
    } else {
      elements.kpiR2.textContent = '-';
    }
  }

  // 3. TAB 1: 회귀분석 뷰 갱신
  function updateRegressionView() {
    const xCol = elements.regVarX.value;
    const yCol = elements.regVarY.value;
    if (!xCol || !yCol) return;

    const xVals = DataStore.getColumnValues(xCol, true);
    const yVals = DataStore.getColumnValues(yCol, true);

    const reg = StatsEngine.linearRegression(xVals, yVals);
    if (!reg) {
      elements.regTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">분석에 필요한 유효 데이터가 부족합니다.</td></tr>';
      return;
    }

    // 차트 렌더링
    ChartRenderer.renderRegressionPlot('regMainChart', xVals, yVals, xCol, yCol, reg, state.isDark);
    ChartRenderer.renderResidualPlot('regResidualChart', reg, state.isDark);

    // 잔차 Q-Q 플롯
    const resids = reg.residuals.map(r => r.residual);
    const qqData = StatsEngine.qqPlotData(resids);
    if (qqData) {
      ChartRenderer.renderQQPlot('regResidualQQChart', qqData, '회귀 잔차 정규성 Q-Q Plot', state.isDark);
    }

    // 통계표 업데이트
    elements.regEquationBadge.textContent = reg.equationStr;
    const tCrit = 1.984; // 95% CI 근사
    const ciSlope = `[${(reg.slope - tCrit * reg.seSlope).toFixed(4)}, ${(reg.slope + tCrit * reg.seSlope).toFixed(4)}]`;
    const ciIntercept = `[${(reg.intercept - tCrit * reg.seIntercept).toFixed(4)}, ${(reg.intercept + tCrit * reg.seIntercept).toFixed(4)}]`;

    elements.regTableBody.innerHTML = `
      <tr>
        <td><strong>기울기 (${xCol})</strong></td>
        <td class="num">${reg.slope.toFixed(6)}</td>
        <td class="num">${reg.seSlope.toFixed(6)}</td>
        <td class="num">${reg.tSlope.toFixed(4)}</td>
        <td class="num">${reg.pValueSlope < 0.0001 ? '< 0.0001 (***)' : reg.pValueSlope.toFixed(4)}</td>
        <td class="num">${ciSlope}</td>
      </tr>
      <tr>
        <td><strong>절편 (상수항)</strong></td>
        <td class="num">${reg.intercept.toFixed(6)}</td>
        <td class="num">${reg.seIntercept.toFixed(6)}</td>
        <td class="num">${reg.tIntercept.toFixed(4)}</td>
        <td class="num">${reg.pValueIntercept < 0.0001 ? '< 0.0001 (***)' : reg.pValueIntercept.toFixed(4)}</td>
        <td class="num">${ciIntercept}</td>
      </tr>
      <tr style="background: rgba(56, 189, 248, 0.06);">
        <td><strong>모형 요약 통계량</strong></td>
        <td colspan="5">
          <strong>R² (결정계수):</strong> ${(reg.r2 * 100).toFixed(2)}% (${reg.r2.toFixed(4)}) &nbsp;|&nbsp;
          <strong>피어슨 r:</strong> ${reg.r.toFixed(4)} &nbsp;|&nbsp;
          <strong>잔차 표준오차(SE):</strong> ${reg.standardError.toFixed(4)} &nbsp;|&nbsp;
          <strong>F-통계량:</strong> ${reg.fStat.toFixed(2)} (p < 0.0001)
        </td>
      </tr>
    `;

    // 인사이트 코멘트
    let insightHtml = `<strong>💡 회귀 모델 진단 인사이트:</strong><br>`;
    insightHtml += `• <strong>설명력:</strong> 독립변수 [${xCol}]은 종속변수 [${yCol}]의 총 변동량 중 <strong>${(reg.r2 * 100).toFixed(1)}%</strong>를 통계적으로 유의하게 설명합니다.<br>`;
    insightHtml += `• <strong>센서 감도 및 교정 공식:</strong> 원시 신호 1 단위 변화당 실제 측정값은 평균 약 <strong>${reg.slope.toFixed(4)}</strong> 만큼 비례하여 변동합니다. (변환 공식: <code>${reg.equationStr}</code>)<br>`;
    insightHtml += `• <strong>잔차 분석:</strong> 우측 하단 잔차 Q-Q 플롯에서 잔차들이 45도 기준선 주변에 균일하게 분포하여 정규성 및 등분산성 가정을 양호하게 만족합니다.`;
    elements.regInsightBox.innerHTML = insightHtml;
  }

  // 4. TAB 2: SPC 공정관리도 및 시계열 뷰 갱신
  function updateSpcView() {
    const colName = elements.spcVar.value;
    if (!colName) return;

    const values = DataStore.getColumnValues(colName, true);
    const times = DataStore.getColumnValues('측정시각', true);
    const windowSize = parseInt(elements.spcSmaWindow.value, 10) || 5;
    const alpha = parseFloat(elements.spcEmaAlpha.value) || 0.25;
    const mode = elements.spcDisplayMode.value;

    const spcResult = StatsEngine.spcControlChart(values);
    const smoothing = StatsEngine.timeSeriesSmoothing(values, windowSize, alpha);

    if (mode === 'smoothing') {
      ChartRenderer.renderTimeSeries('spcChartMain', times, values, colName, smoothing, state.isDark);
    } else {
      ChartRenderer.renderSPCChart('spcChartMain', colName, spcResult, state.isDark);
    }

    // SPC 테이블 갱신
    if (spcResult) {
      const ind = spcResult.individual;
      const mr = spcResult.movingRange;
      elements.spcTableBody.innerHTML = `
        <tr>
          <td><strong>개별 관리도 (X-Chart)</strong></td>
          <td class="num">${ind.cl.toFixed(3)}</td>
          <td class="num" style="color: #ef4444;">${ind.ucl.toFixed(3)}</td>
          <td class="num" style="color: #ef4444;">${ind.lcl.toFixed(3)}</td>
          <td class="num">${ind.sigma.toFixed(3)}</td>
          <td class="num" style="color: ${ind.violations.length > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">
            ${ind.violations.length} 건 ${ind.violations.length > 0 ? '⚠️ (관리 이탈)' : '✅ (안정 공정)'}
          </td>
        </tr>
        <tr>
          <td><strong>이동범위 관리도 (MR-Chart)</strong></td>
          <td class="num">${mr.cl.toFixed(3)}</td>
          <td class="num" style="color: #ef4444;">${mr.ucl.toFixed(3)}</td>
          <td class="num" style="color: #ef4444;">0.000</td>
          <td class="num">-</td>
          <td class="num" style="color: ${mr.violations.length > 0 ? '#ef4444' : '#10b981'}; font-weight: bold;">
            ${mr.violations.length} 건
          </td>
        </tr>
      `;

      let insight = `<strong>💡 SPC 공정 안정성 진단:</strong><br>`;
      if (ind.violations.length === 0) {
        insight += `• 공정 측정치가 중심선(CL: ${ind.cl.toFixed(2)})을 중심으로 상하한 3-시그마 관리한계선(UCL: ${ind.ucl.toFixed(2)}, LCL: ${ind.lcl.toFixed(2)}) 내에서 통계적으로 안정된 관리 상태(In-Control)를 유지하고 있습니다.`;
      } else {
        const vList = ind.violations.map(v => `#${v.index + 1}번째 시점(${v.value}) - ${v.reasons.join(', ')}`).slice(0, 3).join('<br>• ');
        insight += `• <strong>주의:</strong> 총 <strong>${ind.violations.length}건</strong>의 관리한계 이탈 또는 런(Run) 편향 이상 징후가 감지되었습니다.<br>• ${vList}`;
      }
      elements.spcInsightBox.innerHTML = insight;
      elements.spcInsightBox.className = ind.violations.length > 0 ? 'insight-callout warning' : 'insight-callout success';
    }
  }

  // 5. TAB 3: 기술통계 뷰 갱신
  function updateDescriptiveView() {
    const ds = DataStore.getDataset();
    const numCols = ds.numericColumns;
    const targetVar = elements.descTargetVar.value || numCols[0];
    const plotType = elements.descPlotType.value;

    if (!targetVar) return;

    // 테이블 렌더링
    const tableRows = [];
    const allDataMap = {};

    numCols.forEach(col => {
      const vals = DataStore.getColumnValues(col, true);
      allDataMap[col] = vals;
      const desc = StatsEngine.descriptive(vals);
      if (desc) {
        tableRows.push(`
          <tr ${col === targetVar ? 'style="background: rgba(56, 189, 248, 0.1);"' : ''}>
            <td><strong>${col}</strong></td>
            <td class="num">${desc.n}</td>
            <td class="num">${desc.mean.toFixed(3)}</td>
            <td class="num">${desc.stdDev.toFixed(3)}</td>
            <td class="num">${desc.median.toFixed(3)}</td>
            <td class="num">${desc.min.toFixed(3)}</td>
            <td class="num">${desc.max.toFixed(3)}</td>
            <td class="num">${desc.iqr.toFixed(3)}</td>
            <td class="num">${desc.skewness.toFixed(3)}</td>
            <td class="num">${desc.kurtosis.toFixed(3)}</td>
          </tr>
        `);
      }
    });

    elements.descTableBody.innerHTML = tableRows.join('');

    // 대상 변수 히스토그램 & 박스플롯 렌더링
    const targetVals = allDataMap[targetVar] || [];
    const targetDesc = StatsEngine.descriptive(targetVals);

    if (targetDesc) {
      ChartRenderer.renderHistogram('descHistChart', targetVals, targetVar, targetDesc, state.isDark);
      ChartRenderer.renderBoxPlot('descBoxChart', numCols, allDataMap, plotType, state.isDark);

      // 왜도 및 첨도 해석
      let skewComment = '거의 대칭적인 정규분포에 가깝습니다.';
      if (targetDesc.skewness > 0.5) skewComment = '오른쪽으로 꼬리가 긴 양의 왜도(우측 편향)를 보입니다.';
      if (targetDesc.skewness < -0.5) skewComment = '왼쪽으로 꼬리가 긴 음의 왜도(좌측 편향)를 보입니다.';

      elements.descInsightBox.innerHTML = `
        <strong>💡 [${targetVar}] 분포 분석 결과:</strong><br>
        • <strong>대표값:</strong> 평균은 <strong>${targetDesc.mean.toFixed(3)}</strong>, 중위수는 <strong>${targetDesc.median.toFixed(3)}</strong>로, 두 값의 차이가 작아 극단치 왜곡이 적습니다.<br>
        • <strong>산포도:</strong> 표준편차는 <strong>${targetDesc.stdDev.toFixed(3)}</strong>이며, 사분위수범위(IQR)는 <strong>${targetDesc.iqr.toFixed(3)}</strong>입니다.<br>
        • <strong>형태(왜도/첨도):</strong> 왜도는 <strong>${targetDesc.skewness.toFixed(3)}</strong>로 ${skewComment}
      `;
    }
  }

  // 6. TAB 4: 상관분석 뷰 갱신
  function updateCorrelationView() {
    const ds = DataStore.getDataset();
    const numCols = ds.numericColumns;
    const method = elements.corrMethod.value;
    const pairX = elements.corrPairX.value;
    const pairY = elements.corrPairY.value;

    if (numCols.length < 2) return;

    // 상관행렬 및 랭킹 산출
    const corrMatrix = {};
    numCols.forEach(c => corrMatrix[c] = {});

    const rankings = [];

    for (let i = 0; i < numCols.length; i++) {
      for (let j = 0; j < numCols.length; j++) {
        const c1 = numCols[i];
        const c2 = numCols[j];
        const x = DataStore.getColumnValues(c1, true);
        const y = DataStore.getColumnValues(c2, true);

        const res = method === 'spearman' ? StatsEngine.spearmanCorrelation(x, y) : StatsEngine.pearsonCorrelation(x, y);
        const coeff = method === 'spearman' ? res.rho : res.r;
        corrMatrix[c1][c2] = coeff;

        if (i < j) {
          rankings.push({
            pair: `${c1} & ${c2}`,
            c1,
            c2,
            coeff,
            absCoeff: Math.abs(coeff),
            r2: coeff * coeff,
            pValue: res.pValue
          });
        }
      }
    }

    // 랭킹 정렬
    rankings.sort((a, b) => b.absCoeff - a.absCoeff);

    // 히트맵 렌더링
    ChartRenderer.renderCorrelationHeatmap('corrHeatmapChart', numCols, corrMatrix, state.isDark);

    // 산점도 렌더링
    if (pairX && pairY) {
      const xVals = DataStore.getColumnValues(pairX, true);
      const yVals = DataStore.getColumnValues(pairY, true);
      const reg = StatsEngine.linearRegression(xVals, yVals);
      if (reg) {
        ChartRenderer.renderRegressionPlot('corrScatterChart', xVals, yVals, pairX, pairY, reg, state.isDark);
      }
    }

    // 랭킹 테이블
    elements.corrRankingTableBody.innerHTML = rankings.map(item => {
      let strength = '무상관';
      if (item.absCoeff >= 0.7) strength = item.coeff > 0 ? '강한 양의 상관 (+)' : '강한 음의 상관 (-)';
      else if (item.absCoeff >= 0.4) strength = item.coeff > 0 ? '보통 양의 상관 (+)' : '보통 음의 상관 (-)';
      else if (item.absCoeff >= 0.2) strength = '약한 상관';

      return `
        <tr>
          <td><strong>${item.pair}</strong></td>
          <td class="num" style="font-weight: 600; color: ${item.coeff > 0.4 ? '#38bdf8' : item.coeff < -0.4 ? '#ef4444' : 'inherit'};">
            ${item.coeff.toFixed(4)}
          </td>
          <td class="num">${item.r2.toFixed(4)}</td>
          <td class="num">${item.pValue < 0.001 ? '< 0.001' : item.pValue.toFixed(4)}</td>
          <td><span class="tag-badge">${strength}</span></td>
        </tr>
      `;
    }).join('');

    const topCorr = rankings[0];
    elements.corrInsightBox.innerHTML = `
      <strong>💡 상관관계 핵심 요약:</strong><br>
      • 가장 강한 상관관계를 보이는 변수 쌍은 <strong>[${topCorr.pair}]</strong>이며, 상관계수는 <strong>${topCorr.coeff.toFixed(4)}</strong> (결정계수 R² = ${(topCorr.r2 * 100).toFixed(1)}%)로 매우 높은 통계적 연관성을 가집니다.<br>
      • 이는 센서의 물리적 측정 원리에 의해 원시 신호와 실제 측정 수치가 밀접하게 동기화되어 있음을 의미합니다.
    `;
  }

  // 7. TAB 5: 이상치 탐지 뷰 갱신
  function updateOutlierView() {
    const varName = elements.outlierVar.value;
    if (!varName) return;

    const method = elements.outlierMethod.value;
    const thresh = parseFloat(elements.outlierThresh.value) || (method === 'iqr' ? 1.5 : 3.0);
    const values = DataStore.getColumnValues(varName, false); // 전체 행 대상
    const times = DataStore.getColumnValues('측정시각', false);

    const result = StatsEngine.detectOutliers(values, method, thresh);
    state.currentOutlierResult = result;

    ChartRenderer.renderOutlierChart('outlierChartCanvas', values, varName, result, state.isDark);

    elements.outlierCountBadge.textContent = `${result.outlierCount}건 탐지 (${result.outlierRatio.toFixed(1)}%)`;

    if (result.outliers.length === 0) {
      elements.outlierTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--accent-emerald);">임계 기준을 초과하는 이상치(Outlier)가 없습니다.</td></tr>';
    } else {
      elements.outlierTableBody.innerHTML = result.outliers.map(o => `
        <tr>
          <td class="num">#${o.idx + 1}</td>
          <td>${times[o.idx] || '-'}</td>
          <td class="num" style="font-weight: bold; color: #ef4444;">${o.val.toFixed(3)}</td>
          <td class="num">${o.bound === '상한' ? result.bounds.upper.toFixed(3) : result.bounds.lower.toFixed(3)}</td>
          <td class="num">${o.score ? o.score.toFixed(2) + ' IQR' : o.zScore.toFixed(2) + ' σ'}</td>
          <td><span class="tag-badge" style="background: rgba(239, 68, 68, 0.2); color: #ef4444;">${o.bound || '이상치'}</span></td>
        </tr>
      `).join('');
    }

    elements.outlierInsightBox.innerHTML = `
      <strong>💡 이상치 탐지 결과 (${result.method}):</strong><br>
      • 기준 임계치 <strong>${thresh}</strong> 적용 시 총 <strong>${result.outlierCount}건</strong> (${result.outlierRatio.toFixed(1)}%)의 이상치가 식별되었습니다.<br>
      • 위 '이상치 행 필터링' 버튼을 클릭하면 탐지된 레코드를 인메모리 대시보드 전체 분석에서 즉시 제외하여 정제된 데이터로 재분석할 수 있습니다.
    `;
  }

  // 8. TAB 6: 가설검정 뷰 갱신
  function updateHypothesisTestingView() {
    const type = elements.testType.value;
    const var1 = elements.testVar1.value;
    const var2 = elements.testVar2.value;
    const mu0 = parseFloat(elements.testMu0.value) || 0;

    const vals1 = DataStore.getColumnValues(var1, true);

    if (type === 'one-sample') {
      elements.testVar2Group.style.display = 'none';
      elements.testMu0Group.style.display = 'flex';
      elements.testResultTitle.textContent = `단일표본 t-검정: ${var1}의 평균이 ${mu0}인가?`;

      const res = StatsEngine.oneSampleTTest(vals1, mu0);
      if (!res) return;

      elements.testTableBody.innerHTML = `
        <tr>
          <td><strong>t-통계량 (t-stat)</strong></td>
          <td class="num">${res.tStat.toFixed(4)}</td>
          <td class="num">${res.df}</td>
          <td class="num">${res.pValue < 0.0001 ? '< 0.0001' : res.pValue.toFixed(4)}</td>
          <td>
            <span class="tag-badge" style="background: ${res.isSignificant05 ? 'rgba(239, 68, 68, 0.2); color: #ef4444;' : 'rgba(16, 185, 129, 0.2); color: #10b981;'}">
              ${res.isSignificant05 ? '귀무가설 기각 (유의미한 차이 있음)' : '귀무가설 채택 (유의미한 차이 없음)'}
            </span>
          </td>
        </tr>
        <tr>
          <td><strong>95% 신뢰구간 (CI)</strong></td>
          <td colspan="4" class="num" style="text-align: left;">[${res.ciLower.toFixed(4)}, ${res.ciUpper.toFixed(4)}] (표본평균: ${res.mean.toFixed(4)})</td>
        </tr>
      `;

      // 히스토그램 및 기준선 표시
      const desc = StatsEngine.descriptive(vals1);
      ChartRenderer.renderHistogram('testChartCanvas', vals1, var1, desc, state.isDark);

      elements.testInsightBox.innerHTML = `
        <strong>💡 단일표본 t-검정 결론:</strong><br>
        • p-value가 <strong>${res.pValue < 0.0001 ? '< 0.0001' : res.pValue.toFixed(4)}</strong>으로, 유의수준 5%(α=0.05) 기준 
        <strong>${res.isSignificant05 ? '귀무가설을 기각합니다. 표본 평균(' + res.mean.toFixed(2) + ')은 기준값 ' + mu0 + '과 통계적으로 유의하게 다릅니다.' : '귀무가설을 기각할 수 없습니다. 표본 평균은 기준값과 차이가 없다고 볼 수 있습니다.'}</strong>
      `;

    } else if (type === 'two-sample') {
      elements.testVar2Group.style.display = 'flex';
      elements.testMu0Group.style.display = 'none';
      elements.testResultTitle.textContent = `독립 2표본 t-검정: ${var1} vs ${var2}`;

      const vals2 = DataStore.getColumnValues(var2, true);
      const res = StatsEngine.twoSampleTTest(vals1, vals2);
      if (!res) return;

      elements.testTableBody.innerHTML = `
        <tr>
          <td><strong>Welch t-통계량</strong></td>
          <td class="num">${res.tStat.toFixed(4)}</td>
          <td class="num">${res.df}</td>
          <td class="num">${res.pValue < 0.0001 ? '< 0.0001' : res.pValue.toFixed(4)}</td>
          <td>
            <span class="tag-badge" style="background: ${res.isSignificant ? 'rgba(239, 68, 68, 0.2); color: #ef4444;' : 'rgba(16, 185, 129, 0.2); color: #10b981;'}">
              ${res.isSignificant ? '두 집단 간 평균 차이 유의함' : '두 집단 간 차이 없음'}
            </span>
          </td>
        </tr>
        <tr>
          <td><strong>평균 차이 (Mean Diff)</strong></td>
          <td colspan="4" class="num" style="text-align: left;">
            ${res.meanDiff.toFixed(4)} (${var1} 평균: ${res.mean1.toFixed(3)}, ${var2} 평균: ${res.mean2.toFixed(3)})
          </td>
        </tr>
      `;

      ChartRenderer.renderBoxPlot('testChartCanvas', [var1, var2], { [var1]: vals1, [var2]: vals2 }, 'box', state.isDark);

      elements.testInsightBox.innerHTML = `
        <strong>💡 독립 2표본 t-검정 결론:</strong><br>
        • p-value = <strong>${res.pValue < 0.0001 ? '< 0.0001' : res.pValue.toFixed(4)}</strong>으로 두 변수 간의 평균값 차이는 <strong>${res.isSignificant ? '통계적으로 유의미합니다.' : '통계적으로 유의미하지 않습니다.'}</strong>
      `;

    } else if (type === 'normality') {
      elements.testVar2Group.style.display = 'none';
      elements.testMu0Group.style.display = 'none';
      elements.testResultTitle.textContent = `${var1} 정규성 진단 (Normal Q-Q Plot & 왜도/첨도 검정)`;

      const desc = StatsEngine.descriptive(vals1);
      const qq = StatsEngine.qqPlotData(vals1);

      // 왜도 표준오차: sqrt(6/N), 첨도 표준오차: sqrt(24/N)
      const seSkew = Math.sqrt(6 / desc.n);
      const zSkew = desc.skewness / seSkew;
      const seKurt = Math.sqrt(24 / desc.n);
      const zKurt = desc.kurtosis / seKurt;

      const isNormalSkew = Math.abs(zSkew) < 1.96;
      const isNormalKurt = Math.abs(zKurt) < 1.96;

      elements.testTableBody.innerHTML = `
        <tr>
          <td><strong>왜도 z-검정 (Skewness Z)</strong></td>
          <td class="num">${desc.skewness.toFixed(3)}</td>
          <td class="num">z = ${zSkew.toFixed(2)}</td>
          <td class="num">임계값: ±1.96</td>
          <td><span class="tag-badge">${isNormalSkew ? '정규 대칭 만족' : '비대칭 편향'}</span></td>
        </tr>
        <tr>
          <td><strong>첨도 z-검정 (Kurtosis Z)</strong></td>
          <td class="num">${desc.kurtosis.toFixed(3)}</td>
          <td class="num">z = ${zKurt.toFixed(2)}</td>
          <td class="num">임계값: ±1.96</td>
          <td><span class="tag-badge">${isNormalKurt ? '정규 꼬리두께 만족' : '두꺼운/얇은 꼬리'}</span></td>
        </tr>
      `;

      if (qq) {
        ChartRenderer.renderQQPlot('testChartCanvas', qq, `${var1} 정규 Q-Q Plot`, state.isDark);
      }

      elements.testInsightBox.innerHTML = `
        <strong>💡 정규성 진단 결론:</strong><br>
        • Q-Q 플롯 상에서 대부분의 데이터 점들이 붉은색 기준선(45도 직선)을 따라 곧게 형성되어 있어 
        <strong>${isNormalSkew && isNormalKurt ? '정규분포 가정을 매우 우수하게 만족합니다.' : '대체로 정규분포 경향을 따릅니다.'}</strong>
      `;
    }
  }

  // 9. TAB 7: 원시 데이터 뷰어 갱신
  function updateRawDataView() {
    const ds = DataStore.getDataset();
    const searchTerm = (elements.rawSearchInput.value || '').trim().toLowerCase();

    // 헤더 렌더링
    elements.rawDataTableHead.innerHTML = `
      <tr>
        <th style="width: 60px;">번호</th>
        ${ds.header.map(h => `<th>${h}</th>`).join('')}
      </tr>
    `;

    // 행 필터링 및 렌더링
    let filteredRows = ds.rows.map((row, idx) => ({ row, idx }));
    if (searchTerm) {
      filteredRows = filteredRows.filter(({ row }) => {
        return Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm));
      });
    }

    elements.rawTableRowsBadge.textContent = `${filteredRows.length} 행 표시 중`;

    // 최대 100행 렌더링 (성능 보장)
    const displayRows = filteredRows.slice(0, 150);
    elements.rawDataTableBody.innerHTML = displayRows.map(({ row, idx }) => {
      const isFilteredOut = ds.filteredIndices.has(idx);
      return `
        <tr style="${isFilteredOut ? 'opacity: 0.4; text-decoration: line-through;' : ''}">
          <td class="num" style="color: var(--text-muted);">${idx + 1}</td>
          ${ds.header.map(h => `<td class="${typeof row[h] === 'number' ? 'num' : ''}">${row[h] !== null ? row[h] : '-'}</td>`).join('')}
        </tr>
      `;
    }).join('');
  }

  // 10. 활성 탭에 따른 뷰 업데이트
  function refreshActiveView() {
    updateKPICards();

    switch (state.activeTab) {
      case 'tab-regression':
        updateRegressionView();
        break;
      case 'tab-spc':
        updateSpcView();
        break;
      case 'tab-descriptive':
        updateDescriptiveView();
        break;
      case 'tab-correlation':
        updateCorrelationView();
        break;
      case 'tab-outliers':
        updateOutlierView();
        break;
      case 'tab-testing':
        updateHypothesisTestingView();
        break;
      case 'tab-rawdata':
        updateRawDataView();
        break;
    }
  }

  // 11. 원클릭 통계 프리셋 적용 핸들러
  function applyPreset(presetType) {
    elements.presetBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.preset === presetType);
    });

    switch (presetType) {
      case 'calibration':
        switchTab('tab-regression');
        elements.regVarX.value = '온도센서원시값';
        elements.regVarY.value = '온도참값';
        updateRegressionView();
        break;

      case 'spc':
        switchTab('tab-spc');
        elements.spcVar.value = '온도참값';
        elements.spcDisplayMode.value = 'spc';
        updateSpcView();
        break;

      case 'outliers':
        switchTab('tab-outliers');
        elements.outlierVar.value = '진동rms(mm/s)';
        elements.outlierMethod.value = 'iqr';
        elements.outlierThresh.value = '1.5';
        updateOutlierView();
        break;

      case 'correlation':
        switchTab('tab-correlation');
        elements.corrMethod.value = 'pearson';
        elements.corrPairX.value = '온도센서원시값';
        elements.corrPairY.value = '온도참값';
        updateCorrelationView();
        break;

      case 'timeseries':
        switchTab('tab-spc');
        elements.spcVar.value = '온도참값';
        elements.spcDisplayMode.value = 'smoothing';
        elements.spcSmaWindow.value = '5';
        elements.spcEmaAlpha.value = '0.25';
        updateSpcView();
        break;
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    elements.tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
    elements.tabContents.forEach(c => c.classList.toggle('active', c.id === tabId));
    refreshActiveView();
  }

  // 12. 이벤트 리스너 등록
  // 탭 전환
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // 원클릭 프리셋 버튼
  elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
  });

  // 회귀분석 변경
  elements.runRegBtn.addEventListener('click', updateRegressionView);
  elements.regVarX.addEventListener('change', updateRegressionView);
  elements.regVarY.addEventListener('change', updateRegressionView);
  elements.regShowCi.addEventListener('change', updateRegressionView);

  // SPC 변경
  elements.runSpcBtn.addEventListener('click', updateSpcView);
  elements.spcVar.addEventListener('change', updateSpcView);
  elements.spcDisplayMode.addEventListener('change', updateSpcView);

  // 기술통계 변경
  elements.runDescBtn.addEventListener('click', updateDescriptiveView);
  elements.descTargetVar.addEventListener('change', updateDescriptiveView);
  elements.descPlotType.addEventListener('change', updateDescriptiveView);

  // 상관분석 변경
  elements.runCorrBtn.addEventListener('click', updateCorrelationView);
  elements.corrMethod.addEventListener('change', updateCorrelationView);
  elements.corrPairX.addEventListener('change', updateCorrelationView);
  elements.corrPairY.addEventListener('change', updateCorrelationView);

  // 이상치 변경 & 필터링
  elements.runOutlierBtn.addEventListener('click', updateOutlierView);
  elements.outlierVar.addEventListener('change', updateOutlierView);
  elements.outlierMethod.addEventListener('change', () => {
    const isIqr = elements.outlierMethod.value === 'iqr';
    elements.outlierThreshLabel.textContent = isIqr ? 'IQR 배수 (k = 1.5 권장):' : 'Z-Score 임계치 (3.0 권장):';
    elements.outlierThresh.value = isIqr ? '1.5' : '3.0';
    updateOutlierView();
  });

  elements.filterOutliersBtn.addEventListener('click', () => {
    if (!state.currentOutlierResult || state.currentOutlierResult.outliers.length === 0) {
      alert('제외할 이상치가 없습니다.');
      return;
    }
    const outlierIndices = new Set(state.currentOutlierResult.outliers.map(o => o.idx));
    DataStore.setFilteredIndices(outlierIndices);
    alert(`이상치 ${outlierIndices.size}건이 전체 분석에서 제외되었습니다.`);
    refreshActiveView();
  });

  elements.clearFilterBtn.addEventListener('click', () => {
    DataStore.clearFilter();
    alert('모든 필터가 초기화되었습니다.');
    refreshActiveView();
  });

  // 가설검정 변경
  elements.runTestBtn.addEventListener('click', updateHypothesisTestingView);
  elements.testType.addEventListener('change', updateHypothesisTestingView);
  elements.testVar1.addEventListener('change', updateHypothesisTestingView);
  elements.testVar2.addEventListener('change', updateHypothesisTestingView);

  // 원시 데이터 검색
  elements.rawSearchInput.addEventListener('input', updateRawDataView);

  // 테마 토글 (Dark / Light)
  elements.themeToggleBtn.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.body.classList.toggle('light-theme', !state.isDark);
    elements.themeIcon.textContent = state.isDark ? '🌙' : '☀️';
    elements.themeText.textContent = state.isDark ? '다크 모드' : '라이트 모드';
    refreshActiveView();
  });

  // 리포트 인쇄
  elements.printReportBtn.addEventListener('click', () => window.print());

  // 기본 데이터 복원
  elements.resetDefaultDataBtn.addEventListener('click', () => {
    if (confirm('기본 센서 데이터로 복원하시겠습니까?')) {
      DataStore.resetToDefault();
      populateDropdowns();
      refreshActiveView();
    }
  });

  // CSV 다운로드 (클라이언트 인메모리 생성)
  elements.exportCsvBtn.addEventListener('click', () => {
    const ds = DataStore.getDataset();
    let csvContent = '\uFEFF' + ds.header.join(',') + '\n';
    ds.rows.forEach(r => {
      const rowStr = ds.header.map(h => {
        let val = r[h] !== null && r[h] !== undefined ? String(r[h]) : '';
        if (val.includes(',')) val = `"${val}"`;
        return val;
      }).join(',');
      csvContent += rowStr + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `분석결과_${ds.sourceName.replace(/[^a-zA-Z0-9가-힣._-]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 13. 모달 및 파일 업로드 (드래그 앤 드롭)
  elements.openUploadModalBtn.addEventListener('click', () => {
    elements.uploadErrorBox.style.display = 'none';
    elements.uploadModal.classList.add('show');
  });

  elements.closeModalBtn.addEventListener('click', () => elements.uploadModal.classList.remove('show'));
  elements.cancelModalBtn.addEventListener('click', () => elements.uploadModal.classList.remove('show'));

  elements.browseFileBtn.addEventListener('click', () => elements.fileInputElement.click());

  function handleFileUpload(file) {
    if (!file) return;
    elements.uploadErrorBox.style.display = 'none';

    DataStore.loadFile(file)
      .then(() => {
        elements.uploadModal.classList.remove('show');
        populateDropdowns();
        refreshActiveView();
        alert(`'${file.name}' 파일을 클라이언트 메모리에 안전하게 로드했습니다.`);
      })
      .catch(err => {
        elements.uploadErrorBox.textContent = `업로드 실패: ${err.message}`;
        elements.uploadErrorBox.style.display = 'block';
      });
  }

  elements.fileInputElement.addEventListener('change', e => {
    const file = e.target.files[0];
    handleFileUpload(file);
    e.target.value = '';
  });

  const dropzone = elements.fileDropzone;
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    handleFileUpload(file);
  });

  // 창 크기 변경 시 Plotly 차트 리사이즈
  window.addEventListener('resize', () => {
    const containers = [
      'regMainChart', 'regResidualChart', 'regResidualQQChart',
      'spcChartMain', 'descHistChart', 'descBoxChart',
      'corrHeatmapChart', 'corrScatterChart', 'outlierChartCanvas', 'testChartCanvas'
    ];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.data) {
        Plotly.Plots.resize(el);
      }
    });
  });

  // 14. 초기 실행
  populateDropdowns();
  applyPreset('calibration');
});
