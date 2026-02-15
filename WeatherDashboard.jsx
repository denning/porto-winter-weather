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

const TRANSLATIONS = {
  en: {
    title: "Porto Winter Weather",
    subtitle: "Historical daily weather · Dec 1 – Jan 31 · 2020-21 through 2025-26",
    source: "41.15°N, 8.61°W · Source: Open-Meteo Archive API",
    smoothBtn: "7d avg",
    dec: "Dec",
    jan: "Jan",
    both: "Both",
    summaryTitle: "Monthly Averages Summary",
    winter: "Winter",
    metric: "Metric",
    decAvg: "Dec Avg",
    janAvg: "Jan Avg",
    overall: "Overall",
    footer: "Data from Open-Meteo Historical Weather API · Not for commercial use",
    metrics: {
      temperature_2m_mean: "Mean Temperature (°C)",
      precipitation_sum: "Daily Precipitation (mm)",
      cloud_cover_mean: "Mean Cloud Cover (%)",
      sunshine_duration: "Sunshine Duration (hours)",
    },
    units: {
      "°C": "°C",
      mm: "mm",
      "%": "%",
      h: "h",
    },
    dayLabel: (dayNum) => dayNum < 31 ? `Dec ${dayNum + 1}` : `Jan ${dayNum - 30}`,
  },
  ru: {
    title: "Зимняя погода в Порту",
    subtitle: "Ежедневные данные · 1 дек – 31 янв · с 2020-21 по 2025-26",
    source: "41.15°N, 8.61°W · Источник: Open-Meteo Archive API",
    smoothBtn: "Ср. 7д",
    dec: "Дек",
    jan: "Янв",
    both: "Оба",
    summaryTitle: "Сводка средних за месяц",
    winter: "Зима",
    metric: "Показатель",
    decAvg: "Ср. дек",
    janAvg: "Ср. янв",
    overall: "Общее",
    footer: "Данные из Open-Meteo Historical Weather API · Не для коммерческого использования",
    metrics: {
      temperature_2m_mean: "Средняя температура (°C)",
      precipitation_sum: "Суточные осадки (мм)",
      cloud_cover_mean: "Средняя облачность (%)",
      sunshine_duration: "Продолжительность солнечного сияния (ч)",
    },
    units: {
      "°C": "°C",
      mm: "мм",
      "%": "%",
      h: "ч",
    },
    dayLabel: (dayNum) => dayNum < 31 ? `Дек ${dayNum + 1}` : `Янв ${dayNum - 30}`,
  },
};

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
  { key: "temperature_2m_mean", unit: "°C" },
  { key: "precipitation_sum", unit: "mm" },
  { key: "cloud_cover_mean", unit: "%" },
  {
    key: "sunshine_duration",
    unit: "h",
    transform: (v) => (v != null ? +(v / 3600).toFixed(2) : null),
  },
];

function dayIndex(dateStr, startYear) {
  const d = new Date(dateStr);
  const dec1 = new Date(startYear, 11, 1);
  return Math.round((d - dec1) / 86400000);
}

function movingAverage(points, winterLabels, window = 7) {
  const half = Math.floor(window / 2);
  return points.map((pt, i) => {
    const smoothed = { ...pt };
    for (const label of winterLabels) {
      const vals = [];
      for (let j = i - half; j <= i + half; j++) {
        if (j >= 0 && j < points.length && points[j][label] != null) {
          vals.push(points[j][label]);
        }
      }
      smoothed[label] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    return smoothed;
  });
}

export default function WeatherDashboard() {
  const [lang, setLang] = useState("en");
  const [monthFilter, setMonthFilter] = useState("both");
  const [smooth, setSmooth] = useState(false);
  const t = TRANSLATIONS[lang];
  const formatDayLabel = t.dayLabel;
  const u = (unit) => t.units[unit] || unit;
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

  const dayRange =
    monthFilter === "dec" ? [0, 31] :
    monthFilter === "jan" ? [31, 62] :
    [0, 62];

  // Build chart data: array of { day, dayLabel, "2020-21": val, "2021-22": val, ... }
  const chartDataByMetric = {};
  for (const metric of METRICS) {
    const points = [];
    for (let day = dayRange[0]; day < dayRange[1]; day++) {
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
    const winterLabels = WINTERS.map((w) => w.label);
    chartDataByMetric[metric.key] = smooth
      ? movingAverage(points, winterLabels)
      : points;
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
        metric: t.metrics[metric.key],
        unit: u(metric.unit),
        dec: decAvg,
        jan: janAvg,
        overall: allAvg,
      });
    }
  }

  const tickIndices =
    monthFilter === "dec" ? [0, 5, 10, 15, 20, 25, 30] :
    monthFilter === "jan" ? [31, 36, 41, 46, 51, 56, 61] :
    [0, 10, 20, 30, 31, 41, 51, 61];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {t.title}
            </h1>
            <p className="text-gray-400 mt-1">
              {t.subtitle}
            </p>
            <p className="text-gray-500 text-sm mt-0.5">
              {t.source}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg bg-gray-900 border border-gray-700 p-0.5 text-sm">
              {[
                { value: "en", label: "EN" },
                { value: "ru", label: "RU" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    lang === opt.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSmooth((s) => !s)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                smooth
                  ? "bg-blue-600 border-blue-500 text-white"
                  : "bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200"
              }`}
            >
              {t.smoothBtn}
            </button>
            <div className="flex rounded-lg bg-gray-900 border border-gray-700 p-0.5 text-sm">
              {[
                { value: "dec", label: t.dec },
                { value: "both", label: t.both },
                { value: "jan", label: t.jan },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMonthFilter(opt.value)}
                  className={`px-4 py-1.5 rounded-md font-medium transition-colors ${
                    monthFilter === opt.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-10">
          {METRICS.map((metric) => (
            <div
              key={metric.key}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <h2 className="text-lg font-semibold text-gray-200 mb-4">
                {t.metrics[metric.key]}
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
                      value != null ? `${value.toFixed(1)} ${u(metric.unit)}` : "N/A"
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
            {t.summaryTitle}
          </h2>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="py-2 pr-4 font-medium">{t.winter}</th>
                <th className="py-2 pr-4 font-medium">{t.metric}</th>
                {monthFilter !== "jan" && <th className="py-2 pr-4 font-medium text-right">{t.decAvg}</th>}
                {monthFilter !== "dec" && <th className="py-2 pr-4 font-medium text-right">{t.janAvg}</th>}
                {monthFilter === "both" && <th className="py-2 pr-4 font-medium text-right">{t.overall}</th>}
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
                    {monthFilter !== "jan" && (
                      <td className="py-1.5 pr-4 text-right text-gray-200">
                        {row.dec != null ? `${row.dec.toFixed(1)} ${row.unit}` : "—"}
                      </td>
                    )}
                    {monthFilter !== "dec" && (
                      <td className="py-1.5 pr-4 text-right text-gray-200">
                        {row.jan != null ? `${row.jan.toFixed(1)} ${row.unit}` : "—"}
                      </td>
                    )}
                    {monthFilter === "both" && (
                      <td className="py-1.5 pr-4 text-right font-medium text-white">
                        {row.overall != null ? `${row.overall.toFixed(1)} ${row.unit}` : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="mt-6 text-center text-gray-600 text-xs">
          {t.footer}
        </footer>
      </div>
    </div>
  );
}
