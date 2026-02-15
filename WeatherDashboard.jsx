import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import data2020 from "./data/2020-21.json";
import data2021 from "./data/2021-22.json";
import data2022 from "./data/2022-23.json";
import data2023 from "./data/2023-24.json";
import data2024 from "./data/2024-25.json";
import data2025 from "./data/2025-26.json";

const WINTERS = [
  { label: "2020-21", daily: data2020.daily, startYear: 2020 },
  { label: "2021-22", daily: data2021.daily, startYear: 2021 },
  { label: "2022-23", daily: data2022.daily, startYear: 2022 },
  { label: "2023-24", daily: data2023.daily, startYear: 2023 },
  { label: "2024-25", daily: data2024.daily, startYear: 2024 },
  { label: "2025-26", daily: data2025.daily, startYear: 2025 },
];

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

const METRICS = [
  { key: "temperature_2m_mean", title: "Mean Temperature (°C)", unit: "°C" },
  { key: "precipitation_sum", title: "Daily Precipitation (mm)", unit: "mm" },
  { key: "cloud_cover_mean", title: "Mean Cloud Cover (%)", unit: "%" },
  {
    key: "sunshine_duration",
    title: "Sunshine Duration (hours)",
    unit: "h",
    transform: (v) => (v != null ? +(v / 3600).toFixed(2) : null),
  },
];

function dayIndex(dateStr, startYear) {
  const d = new Date(dateStr);
  const dec1 = new Date(startYear, 11, 1);
  return Math.round((d - dec1) / 86400000);
}

function formatDayLabel(dayNum) {
  if (dayNum < 31) {
    return `Dec ${dayNum + 1}`;
  }
  return `Jan ${dayNum - 30}`;
}

export default function WeatherDashboard() {
  const [hiddenLines, setHiddenLines] = useState(() =>
    Object.fromEntries(METRICS.map((m) => [m.key, new Set()]))
  );

  function toggleLine(metricKey, winterLabel) {
    setHiddenLines((prev) => {
      const next = new Set(prev[metricKey]);
      if (next.has(winterLabel)) next.delete(winterLabel);
      else next.add(winterLabel);
      return { ...prev, [metricKey]: next };
    });
  }

  // Build chart data: array of { day, dayLabel, "2020-21": val, "2021-22": val, ... }
  const chartDataByMetric = {};
  for (const metric of METRICS) {
    const points = [];
    for (let day = 0; day < 62; day++) {
      const entry = { day, dayLabel: formatDayLabel(day) };
      for (const winter of WINTERS) {
        const idx = winter.daily.time.findIndex(
          (t) => dayIndex(t, winter.startYear) === day
        );
        let val = idx >= 0 ? winter.daily[metric.key]?.[idx] : null;
        if (val != null && metric.transform) val = metric.transform(val);
        entry[winter.label] = val;
      }
      points.push(entry);
    }
    chartDataByMetric[metric.key] = points;
  }

  // Build summary table data
  const summaryRows = [];
  for (const winter of WINTERS) {
    const { daily, label, startYear } = winter;
    const decIndices = [];
    const janIndices = [];
    daily.time.forEach((t, i) => {
      const di = dayIndex(t, startYear);
      if (di < 31) decIndices.push(i);
      else janIndices.push(i);
    });

    function avg(key, indices, transform) {
      const vals = indices
        .map((i) => daily[key]?.[i])
        .filter((v) => v != null)
        .map((v) => (transform ? transform(v) : v));
      if (vals.length === 0) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    for (const metric of METRICS) {
      const decAvg = avg(metric.key, decIndices, metric.transform);
      const janAvg = avg(metric.key, janIndices, metric.transform);
      const allAvg = avg(
        metric.key,
        [...decIndices, ...janIndices],
        metric.transform
      );
      summaryRows.push({
        winter: label,
        metric: metric.title,
        unit: metric.unit,
        dec: decAvg,
        jan: janAvg,
        overall: allAvg,
      });
    }
  }

  const tickIndices = [0, 10, 20, 30, 31, 41, 51, 61];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Porto Winter Weather
          </h1>
          <p className="text-gray-400 mt-1">
            Historical daily weather · Dec 1 – Jan 31 · 2020-21 through 2025-26
          </p>
          <p className="text-gray-500 text-sm mt-0.5">
            41.15°N, 8.61°W · Source: Open-Meteo Archive API
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
          {METRICS.map((metric) => (
            <div
              key={metric.key}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <h2 className="text-lg font-semibold text-gray-200 mb-4">
                {metric.title}
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={chartDataByMetric[metric.key]}
                  margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="day"
                    ticks={tickIndices}
                    tickFormatter={formatDayLabel}
                    stroke="#6b7280"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <Tooltip
                    labelFormatter={(v) => formatDayLabel(v)}
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    itemStyle={{ color: "#e5e7eb" }}
                    labelStyle={{ color: "#9ca3af", fontWeight: 600 }}
                    formatter={(value) =>
                      value != null ? `${value.toFixed(1)} ${metric.unit}` : "N/A"
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    onClick={(e) => toggleLine(metric.key, e.dataKey)}
                    formatter={(value) => {
                      const isHidden = hiddenLines[metric.key].has(value);
                      return (
                        <span
                          style={{
                            color: isHidden ? "#4b5563" : "#e5e7eb",
                            textDecoration: isHidden ? "line-through" : "none",
                            cursor: "pointer",
                          }}
                        >
                          {value}
                        </span>
                      );
                    }}
                  />
                  {WINTERS.map((w, i) => (
                    <Line
                      key={w.label}
                      type="monotone"
                      dataKey={w.label}
                      stroke={COLORS[i]}
                      strokeWidth={1.5}
                      dot={false}
                      connectNulls
                      hide={hiddenLines[metric.key].has(w.label)}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
          <h2 className="text-xl font-semibold text-gray-200 mb-4">
            Monthly Averages Summary
          </h2>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2 pr-4 font-medium">Winter</th>
                <th className="py-2 pr-4 font-medium">Metric</th>
                <th className="py-2 pr-4 font-medium text-right">Dec Avg</th>
                <th className="py-2 pr-4 font-medium text-right">Jan Avg</th>
                <th className="py-2 pr-4 font-medium text-right">Overall</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row, i) => {
                const isFirstOfWinter = i % METRICS.length === 0;
                const winterIdx = Math.floor(i / METRICS.length);
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-800 ${
                      isFirstOfWinter && i > 0 ? "border-t-2 border-t-gray-700" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-4 font-medium" style={{ color: COLORS[winterIdx] }}>
                      {isFirstOfWinter ? row.winter : ""}
                    </td>
                    <td className="py-1.5 pr-4 text-gray-300">{row.metric}</td>
                    <td className="py-1.5 pr-4 text-right text-gray-200">
                      {row.dec != null ? `${row.dec.toFixed(1)} ${row.unit}` : "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-right text-gray-200">
                      {row.jan != null ? `${row.jan.toFixed(1)} ${row.unit}` : "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-right font-medium text-white">
                      {row.overall != null ? `${row.overall.toFixed(1)} ${row.unit}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-center text-gray-600 text-xs">
          Data from Open-Meteo Historical Weather API · Not for commercial use
        </footer>
      </div>
    </div>
  );
}
