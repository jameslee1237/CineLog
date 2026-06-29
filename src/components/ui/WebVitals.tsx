'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

// 개발 환경에서만 콘솔에 출력 — 프로덕션에서는 분석 서비스로 전송 가능
const reportMetric = (metric: Metric) => {
  if (process.env.NODE_ENV !== 'development') return;

  const color = metric.rating === 'good' ? '🟢' : metric.rating === 'needs-improvement' ? '🟡' : '🔴';
  console.log(`${color} ${metric.name}: ${Math.round(metric.value)}${metric.name === 'CLS' ? '' : 'ms'} [${metric.rating}]`);
};

export const WebVitals = () => {
  useEffect(() => {
    onLCP(reportMetric);
    onCLS(reportMetric);
    onINP(reportMetric);
  }, []);

  return null;
};
