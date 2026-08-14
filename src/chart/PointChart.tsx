import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { DataZoomComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { LineChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';

import type { PointObservation } from '../types/rainfall';

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer]);

export function PointChart({ observations, unit, quantityLabel }: { observations: PointObservation[]; unit: string; quantityLabel: string }) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = echarts.init(chartRef.current, undefined, { renderer: 'canvas' });
    chart.setOption({
      animation: false,
      grid: { top: 20, right: 12, bottom: 48, left: 48 },
      tooltip: {
        trigger: 'axis',
        valueFormatter: (value: unknown) => value == null ? '欠測' : `${Number(value).toFixed(1)} ${unit}`,
      },
      xAxis: {
        type: 'time',
        axisLabel: { hideOverlap: true, color: '#84919a' },
        axisLine: { lineStyle: { color: '#66747d' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        name: `${quantityLabel} [${unit}]`,
        nameTextStyle: { color: '#84919a' },
        axisLabel: { color: '#84919a' },
        splitLine: { lineStyle: { color: 'rgba(130,145,155,.18)' } },
      },
      dataZoom: [
        { type: 'inside', filterMode: 'none' },
        { type: 'slider', height: 18, bottom: 8, borderColor: 'transparent', backgroundColor: 'rgba(120,140,150,.12)' },
      ],
      series: [
        {
          type: 'line',
          showSymbol: false,
          connectNulls: false,
          smooth: false,
          lineStyle: { width: 2, color: '#35c6f4' },
          areaStyle: { color: 'rgba(53,198,244,.18)' },
          data: observations.map((item) => [item.timestamp, item.rainfall1hMm]),
        },
      ],
    });
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(chartRef.current);
    return () => {
      resize.disconnect();
      chart.dispose();
    };
  }, [observations, quantityLabel, unit]);

  return <div ref={chartRef} className="point-chart" role="img" aria-label={`選択地点の${quantityLabel}時系列グラフ`} />;
}
