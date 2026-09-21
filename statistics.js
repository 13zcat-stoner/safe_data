/**
 * statistics.js - 순수 클라이언트 인메모리 통계 연산 엔진
 * 외부 라이브러리 의존 없이 모든 통계 분석 알고리즘을 브라우저 내에서 직접 수행합니다.
 */

const StatsEngine = (() => {
  // 정규분포 누적분포함수 (CDF) 근사 (Abramowitz and Stegun)
  function normalCDF(x) {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x) / Math.sqrt(2.0);
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    return 0.5 * (1.0 + sign * y);
  }

  // 표준정규분포 역함수 (Inverse Normal / Probit) - Wichura 근사
  function normalInv(p) {
    if (p <= 0 || p >= 1) return p <= 0 ? -Infinity : Infinity;
    const q = p - 0.5;
    if (Math.abs(q) <= 0.42) {
      const r = q * q;
      return q * (((-25.44106049637 * r + 41.39119773534) * r - 18.61500062529) * r + 2.50662823884) /
        ((((3.13082909833 * r - 21.06224101826) * r + 23.08336743743) * r + 1.0));
    }
    const r = p < 0.5 ? p : 1 - p;
    const s = Math.log(-Math.log(r));
    const t = 0.3374754822726147 + s * (0.9761648890418386 + s * (0.1607979714918209 + s * (0.027643881033012705 + s * (0.0038405729373609 + s * (0.0003951804142903 + s * (0.0000321767881768 + s * (0.0000002888167364 * s)))))));
    const val = 1.25331413731550025 + t;
    return p < 0.5 ? -val : val;
  }

  // 스튜던트 t-분포 p-value 근사
  function tCDF(t, df) {
    const x = (t + Math.sqrt(t * t + df)) / (2 * Math.sqrt(t * t + df));
    // 불완전 베타 함수 대신 높은 df(>30)에서는 z-근사, 일반적인 경우에는 적분 근사
    if (df > 30) {
      return normalCDF(t);
    }
    // df가 작을 때 Cornish-Fisher 전개 근사
    const z = t * (1 - 1 / (4 * df)) / Math.sqrt(1 + (t * t) / (2 * df));
    return normalCDF(z);
  }

  // 기술통계 요약
  function descriptive(values) {
    const clean = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
    const n = clean.length;
    if (n === 0) return null;

    const min = clean[0];
    const max = clean[n - 1];
    const range = max - min;
    const sum = clean.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;

    // 사분위수 계산 (R-7 / 엑셀 표준)
    function quantile(p) {
      const pos = (n - 1) * p;
      const base = Math.floor(pos);
      const rest = pos - base;
      if (clean[base + 1] !== undefined) {
        return clean[base] + rest * (clean[base + 1] - clean[base]);
      } else {
        return clean[base];
      }
    }

    const q1 = quantile(0.25);
    const median = quantile(0.5);
    const q3 = quantile(0.75);
    const iqr = q3 - q1;

    // 분산 & 표준편차 (표본 분산 n-1)
    const ss = clean.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    const variance = n > 1 ? ss / (n - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sem = stdDev / Math.sqrt(n); // 표준오차

    // 왜도 (Skewness) & 첨도 (Kurtosis)
    let m3 = 0, m4 = 0;
    if (n > 2 && stdDev > 0) {
      for (const v of clean) {
        const diff = (v - mean) / stdDev;
        m3 += Math.pow(diff, 3);
        m4 += Math.pow(diff, 4);
      }
      m3 = (n / ((n - 1) * (n - 2))) * m3;
      m4 = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    }

    // 최빈값 계산
    const freq = {};
    let maxFreq = 0;
    clean.forEach(v => {
      const rounded = Number(v.toFixed(3));
      freq[rounded] = (freq[rounded] || 0) + 1;
      if (freq[rounded] > maxFreq) maxFreq = freq[rounded];
    });
    const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);

    return {
      n,
      mean,
      stdDev,
      variance,
      sem,
      min,
      max,
      range,
      median,
      q1,
      q3,
      iqr,
      skewness: m3,
      kurtosis: m4,
      mode: modes.length > 3 ? '다수 존재' : modes.join(', '),
      cleanValues: clean
    };
  }

  // 피어슨 상관계수
  function pearsonCorrelation(x, y) {
    const pairs = [];
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (typeof x[i] === 'number' && !isNaN(x[i]) && typeof y[i] === 'number' && !isNaN(y[i])) {
        pairs.push([x[i], y[i]]);
      }
    }
    const n = pairs.length;
    if (n < 2) return { r: 0, r2: 0, pValue: 1, n };

    const sumX = pairs.reduce((a, p) => a + p[0], 0);
    const sumY = pairs.reduce((a, p) => a + p[1], 0);
    const meanX = sumX / n;
    const meanY = sumY / n;

    let ssXX = 0, ssYY = 0, ssXY = 0;
    for (const [xi, yi] of pairs) {
      const dx = xi - meanX;
      const dy = yi - meanY;
      ssXX += dx * dx;
      ssYY += dy * dy;
      ssXY += dx * dy;
    }

    const denominator = Math.sqrt(ssXX * ssYY);
    const r = denominator === 0 ? 0 : ssXY / denominator;
    const r2 = r * r;

    // t-stat for correlation
    let pValue = 1;
    if (Math.abs(r) < 1 && n > 2) {
      const tStat = r * Math.sqrt((n - 2) / (1 - r2));
      const cdf = tCDF(Math.abs(tStat), n - 2);
      pValue = 2 * (1 - cdf);
    } else if (Math.abs(r) === 1) {
      pValue = 0;
    }

    return {
      r,
      r2,
      pValue: Math.max(0, Math.min(1, pValue)),
      n,
      covariance: ssXY / (n - 1)
    };
  }

  // 스피어만 순위 상관계수
  function spearmanCorrelation(x, y) {
    const pairs = [];
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (typeof x[i] === 'number' && !isNaN(x[i]) && typeof y[i] === 'number' && !isNaN(y[i])) {
        pairs.push({ x: x[i], y: y[i], idx: i });
      }
    }
    const n = pairs.length;
    if (n < 2) return { rho: 0, pValue: 1 };

    function assignRanks(arr, key) {
      const sorted = [...arr].sort((a, b) => a[key] - b[key]);
      const ranks = new Array(n);
      let i = 0;
      while (i < n) {
        let j = i;
        while (j < n - 1 && sorted[j][key] === sorted[j + 1][key]) j++;
        const rank = (i + j + 2) / 2;
        for (let k = i; k <= j; k++) {
          ranks[sorted[k].idx] = rank;
        }
        i = j + 1;
      }
      return ranks;
    }

    const rankX = assignRanks(pairs, 'x');
    const rankY = assignRanks(pairs, 'y');
    const pCorr = pearsonCorrelation(rankX, rankY);
    return {
      rho: pCorr.r,
      pValue: pCorr.pValue,
      n
    };
  }

  // 단순 선형 회귀 분석 (OLS)
  function linearRegression(x, y) {
    const pairs = [];
    for (let i = 0; i < Math.min(x.length, y.length); i++) {
      if (typeof x[i] === 'number' && !isNaN(x[i]) && typeof y[i] === 'number' && !isNaN(y[i])) {
        pairs.push({ x: x[i], y: y[i] });
      }
    }
    const n = pairs.length;
    if (n < 3) return null;

    const meanX = pairs.reduce((a, p) => a + p.x, 0) / n;
    const meanY = pairs.reduce((a, p) => a + p.y, 0) / n;

    let ssXX = 0, ssYY = 0, ssXY = 0;
    for (const p of pairs) {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      ssXX += dx * dx;
      ssYY += dy * dy;
      ssXY += dx * dy;
    }

    const slope = ssXY / ssXX;
    const intercept = meanY - slope * meanX;
    const r = ssXY / Math.sqrt(ssXX * ssYY);
    const r2 = r * r;

    // 잔차 및 잔차 분산
    const residuals = pairs.map(p => {
      const pred = slope * p.x + intercept;
      return {
        x: p.x,
        actual: p.y,
        fitted: pred,
        residual: p.y - pred
      };
    });

    const sse = residuals.reduce((a, r) => a + r.residual * r.residual, 0);
    const dfResidual = n - 2;
    const mse = sse / dfResidual;
    const standardError = Math.sqrt(mse);

    // 기울기 및 절편 표준오차
    const seSlope = Math.sqrt(mse / ssXX);
    const seIntercept = Math.sqrt(mse * (1 / n + (meanX * meanX) / ssXX));

    // t-통계량 및 p-value
    const tSlope = slope / seSlope;
    const pValueSlope = 2 * (1 - tCDF(Math.abs(tSlope), dfResidual));

    const tIntercept = intercept / seIntercept;
    const pValueIntercept = 2 * (1 - tCDF(Math.abs(tIntercept), dfResidual));

    // F-검정
    const ssr = ssYY - sse;
    const fStat = mse > 0 ? (ssr / 1) / mse : 0;

    return {
      n,
      slope,
      intercept,
      r,
      r2,
      standardError,
      seSlope,
      seIntercept,
      tSlope,
      pValueSlope: Math.max(0, Math.min(1, pValueSlope)),
      tIntercept,
      pValueIntercept: Math.max(0, Math.min(1, pValueIntercept)),
      fStat,
      meanX,
      meanY,
      ssXX,
      residuals,
      equationStr: `Y = ${slope >= 0 ? '' : '-'}${Math.abs(slope).toFixed(4)}·X ${intercept >= 0 ? '+ ' + intercept.toFixed(4) : '- ' + Math.abs(intercept).toFixed(4)}`
    };
  }

  // SPC 관리도 (Shewhart Individual and Moving Range: I-MR)
  function spcControlChart(values) {
    const clean = values.filter(v => typeof v === 'number' && !isNaN(v));
    const n = clean.length;
    if (n < 2) return null;

    // 1. Individual Chart
    const mean = clean.reduce((a, b) => a + b, 0) / n;

    // 2. Moving Range (MR = |X_i - X_{i-1}|)
    const mr = [];
    for (let i = 1; i < n; i++) {
      mr.push(Math.abs(clean[i] - clean[i - 1]));
    }
    const meanMR = mr.reduce((a, b) => a + b, 0) / mr.length;

    // d2 계수 (n=2일 때 1.128)
    const sigmaHat = meanMR / 1.128;

    // Individual 관리한계선 (3-sigma)
    const uclI = mean + 2.66 * meanMR; // 또는 mean + 3 * sigmaHat
    const lclI = mean - 2.66 * meanMR;
    const clI = mean;

    // Moving Range 관리한계선 (D4 = 3.267, D3 = 0 for n=2)
    const uclMR = 3.267 * meanMR;
    const lclMR = 0;
    const clMR = meanMR;

    // 관리 이탈 규칙 (Nelson Rules 간소화)
    // Rule 1: 관리한계선(3-sigma) 초과
    // Rule 2: 연속 9개 점이 중심선의 한쪽에 위치
    // Rule 3: 연속 6개 점이 지속적 증가 또는 감소
    const violationsI = [];
    let consecutiveAboveBelow = 0;
    let lastSide = 0;

    clean.forEach((val, idx) => {
      const vTypes = [];
      if (val > uclI || val < lclI) {
        vTypes.push('관리한계 이탈(±3σ)');
      }

      // 연속 8~9개 점 한쪽 치우침
      const currentSide = val > clI ? 1 : val < clI ? -1 : 0;
      if (currentSide !== 0 && currentSide === lastSide) {
        consecutiveAboveBelow++;
        if (consecutiveAboveBelow >= 8) {
          vTypes.push('연속 8점 이상 중심선 편향');
        }
      } else {
        consecutiveAboveBelow = 1;
        lastSide = currentSide;
      }

      if (vTypes.length > 0) {
        violationsI.push({ index: idx, value: val, reasons: vTypes });
      }
    });

    const violationsMR = [];
    mr.forEach((val, idx) => {
      if (val > uclMR) {
        violationsMR.push({ index: idx + 1, value: val, reasons: ['MR 관리한계 초과'] });
      }
    });

    return {
      n,
      individual: {
        cl: clI,
        ucl: uclI,
        lcl: lclI,
        sigma: sigmaHat,
        values: clean,
        violations: violationsI
      },
      movingRange: {
        cl: clMR,
        ucl: uclMR,
        lcl: lclMR,
        values: mr,
        violations: violationsMR
      }
    };
  }

  // 이상치 감지 (Tukey IQR 및 Z-score 동시 지원)
  function detectOutliers(values, method = 'iqr', threshold = 1.5) {
    const cleanWithIdx = values
      .map((val, idx) => ({ val, idx }))
      .filter(item => typeof item.val === 'number' && !isNaN(item.val));

    const n = cleanWithIdx.length;
    if (n === 0) return { outliers: [], inliers: [], summary: {} };

    const sorted = [...cleanWithIdx].sort((a, b) => a.val - b.val);
    const desc = descriptive(sorted.map(s => s.val));

    const outliers = [];
    const inliers = [];

    if (method === 'iqr') {
      const lowerBound = desc.q1 - threshold * desc.iqr;
      const upperBound = desc.q3 + threshold * desc.iqr;

      cleanWithIdx.forEach(item => {
        if (item.val < lowerBound || item.val > upperBound) {
          outliers.push({ ...item, score: item.val < lowerBound ? (desc.q1 - item.val) / desc.iqr : (item.val - desc.q3) / desc.iqr, bound: item.val < lowerBound ? '하한' : '상한' });
        } else {
          inliers.push(item);
        }
      });

      return {
        method: 'IQR (Tukey Fences)',
        threshold,
        bounds: { lower: lowerBound, upper: upperBound },
        outliers,
        inliers,
        outlierCount: outliers.length,
        outlierRatio: (outliers.length / n) * 100
      };
    } else {
      // Z-Score method
      const zThresh = threshold || 3.0;
      cleanWithIdx.forEach(item => {
        const z = desc.stdDev === 0 ? 0 : Math.abs(item.val - desc.mean) / desc.stdDev;
        if (z > zThresh) {
          outliers.push({ ...item, zScore: z });
        } else {
          inliers.push(item);
        }
      });

      return {
        method: 'Z-Score',
        threshold: zThresh,
        bounds: {
          lower: desc.mean - zThresh * desc.stdDev,
          upper: desc.mean + zThresh * desc.stdDev
        },
        outliers,
        inliers,
        outlierCount: outliers.length,
        outlierRatio: (outliers.length / n) * 100
      };
    }
  }

  // 단일 표본 t-검정 (One-sample t-test)
  function oneSampleTTest(values, mu0 = 0) {
    const desc = descriptive(values);
    if (!desc || desc.n < 2 || desc.stdDev === 0) return null;

    const t = (desc.mean - mu0) / (desc.stdDev / Math.sqrt(desc.n));
    const df = desc.n - 1;
    const pValue = 2 * (1 - tCDF(Math.abs(t), df));

    // 95% 신뢰구간
    const tCrit = 1.96 + 2.38 / df; // 근사치
    const margin = tCrit * desc.sem;

    return {
      n: desc.n,
      mean: desc.mean,
      mu0,
      tStat: t,
      df,
      pValue: Math.max(0, Math.min(1, pValue)),
      ciLower: desc.mean - margin,
      ciUpper: desc.mean + margin,
      isSignificant05: pValue < 0.05,
      isSignificant01: pValue < 0.01
    };
  }

  // 독립 2표본 t-검정 (Two-sample Welch's t-test)
  function twoSampleTTest(sample1, sample2) {
    const d1 = descriptive(sample1);
    const d2 = descriptive(sample2);
    if (!d1 || !d2 || d1.n < 2 || d2.n < 2) return null;

    const meanDiff = d1.mean - d2.mean;
    const seDiff = Math.sqrt((d1.variance / d1.n) + (d2.variance / d2.n));
    if (seDiff === 0) return null;

    const t = meanDiff / seDiff;

    // Welch-Satterthwaite 자유도 근사
    const v1 = d1.variance / d1.n;
    const v2 = d2.variance / d2.n;
    const df = Math.pow(v1 + v2, 2) / ((v1 * v1) / (d1.n - 1) + (v2 * v2) / (d2.n - 1));

    const pValue = 2 * (1 - tCDF(Math.abs(t), Math.round(df)));

    return {
      n1: d1.n,
      n2: d2.n,
      mean1: d1.mean,
      mean2: d2.mean,
      meanDiff,
      tStat: t,
      df: Math.round(df * 10) / 10,
      pValue: Math.max(0, Math.min(1, pValue)),
      isSignificant: pValue < 0.05
    };
  }

  // Q-Q Plot 데이터 생성 (정규성 진단)
  function qqPlotData(values) {
    const clean = values.filter(v => typeof v === 'number' && !isNaN(v)).sort((a, b) => a - b);
    const n = clean.length;
    if (n < 3) return null;

    const desc = descriptive(clean);
    const theoreticalZ = [];
    const sampleZ = [];
    const points = [];

    for (let i = 0; i < n; i++) {
      // Blom의 공식 p_i = (i - 3/8) / (n + 1/4)
      const p = (i + 1 - 0.375) / (n + 0.25);
      const zTheor = normalInv(p);
      const zSamp = desc.stdDev === 0 ? 0 : (clean[i] - desc.mean) / desc.stdDev;
      theoreticalZ.push(zTheor);
      sampleZ.push(zSamp);
      points.push({ theoretical: zTheor, sample: clean[i], standardSample: zSamp });
    }

    return {
      points,
      mean: desc.mean,
      stdDev: desc.stdDev,
      minZ: theoreticalZ[0],
      maxZ: theoreticalZ[n - 1]
    };
  }

  // 이동평균 및 지수평활 계산
  function timeSeriesSmoothing(values, windowSize = 5, alpha = 0.3) {
    const clean = values.map(v => (typeof v === 'number' && !isNaN(v) ? v : null));
    const sma = [];
    const ema = [];

    // SMA (단순 이동평균)
    for (let i = 0; i < clean.length; i++) {
      if (i < windowSize - 1) {
        sma.push(null);
      } else {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < windowSize; j++) {
          const val = clean[i - j];
          if (val !== null) {
            sum += val;
            count++;
          }
        }
        sma.push(count > 0 ? sum / count : null);
      }
    }

    // EMA (지수평활)
    let prevEma = null;
    for (let i = 0; i < clean.length; i++) {
      const val = clean[i];
      if (val === null) {
        ema.push(prevEma);
        continue;
      }
      if (prevEma === null) {
        prevEma = val;
      } else {
        prevEma = alpha * val + (1 - alpha) * prevEma;
      }
      ema.push(prevEma);
    }

    return { sma, ema };
  }

  return {
    descriptive,
    pearsonCorrelation,
    spearmanCorrelation,
    linearRegression,
    spcControlChart,
    detectOutliers,
    oneSampleTTest,
    twoSampleTTest,
    qqPlotData,
    timeSeriesSmoothing,
    normalCDF,
    normalInv
  };
})();

// 글로벌 또는 모듈 환경 노출
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StatsEngine;
}
