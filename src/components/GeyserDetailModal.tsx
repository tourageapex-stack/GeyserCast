import React, { useEffect, useState } from 'react';
import { X, Clock, Flame, ShieldCheck, BarChart3, HelpCircle, Activity, History, Zap, Video, CheckCircle2, AlertTriangle, Thermometer, Droplets, ArrowUp, Info, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, CartesianGrid } from 'recharts';
import { Geyser, Eruption, Prediction } from '../types';
import { formatTimeInTimezone, formatWindowRange, formatMinutesToHoursAndMinutes, getDayLabelInTimezone } from '../utils/time';
import { getGeyserImageData } from '../utils/geyserImages';

interface GeyserDetailModalProps {
  geyserId: string | null;
  onClose: () => void;
  use24Hour: boolean;
  useAi?: boolean;
}

export const GeyserDetailModal: React.FC<GeyserDetailModalProps> = ({ geyserId, onClose, use24Hour, useAi = false }) => {
  const [geyser, setGeyser] = useState<Geyser | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [eruptions, setEruptions] = useState<Eruption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!geyserId) return;

    setLoading(true);
    Promise.all([
      fetch(`/api/geysers/${geyserId}`).then((r) => r.json()),
      fetch(`/api/predictions/${geyserId}?useAi=${useAi}`).then((r) => r.json()),
      fetch(`/api/eruptions?geyserId=${geyserId}&limit=100`).then((r) => r.json()),
    ])
      .then(([g, p, e]) => {
        setGeyser(g);
        setPrediction(p);
        setEruptions(e);
      })
      .catch((err) => console.error('[Modal Load Error]', err))
      .finally(() => setLoading(false));
  }, [geyserId, useAi]);

  if (!geyserId) return null;

  // Process data for charts
  const intervalData = eruptions
    .slice()
    .reverse()
    .map((e, idx, arr) => {
      if (idx === 0) return null;
      const prev = arr[idx - 1];
      const diffMin = (new Date(e.eruptionTime).getTime() - new Date(prev.eruptionTime).getTime()) / 60000;
      return {
        date: new Date(e.eruptionTime).toLocaleDateString(),
        interval: Math.round(diffMin * 10) / 10,
        index: idx,
      };
    })
    .filter(Boolean) as { date: string; interval: number; index: number }[];

  // Distribution by hour of day
  const hourCounts: { [hour: number]: number } = {};
  for (let i = 0; i < 24; i++) hourCounts[i] = 0;
  eruptions.forEach((e) => {
    const hr = new Date(e.eruptionTime).getHours();
    hourCounts[hr] = (hourCounts[hr] || 0) + 1;
  });

  const hourDistributionData = Object.entries(hourCounts).map(([hr, count]) => ({
    hour: `${hr}:00`,
    count,
  }));

  // Historical statistics
  const intervalsOnly = intervalData.map((d) => d.interval);
  const count = eruptions.length;
  const meanInterval = intervalsOnly.length ? Math.round(intervalsOnly.reduce((a, b) => a + b, 0) / intervalsOnly.length) : 0;
  const sortedIntervals = [...intervalsOnly].sort((a, b) => a - b);
  const medianInterval = sortedIntervals.length ? sortedIntervals[Math.floor(sortedIntervals.length / 2)] : 0;
  const minInterval = sortedIntervals.length ? sortedIntervals[0] : 0;
  const maxInterval = sortedIntervals.length ? sortedIntervals[sortedIntervals.length - 1] : 0;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto text-stone-100 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-stone-950/80 hover:bg-stone-800 text-stone-200 p-2 rounded-xl transition border border-stone-700 z-20 shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {loading || !geyser ? (
          <div className="p-12 text-center text-amber-400 font-bold animate-pulse">
            Loading Geyser Details & Predictions...
          </div>
        ) : (
          <div>
            {/* Hero Picture Header - Direct authentic photography */}
            {(() => {
              const imgData = getGeyserImageData(geyser);
              return (
                <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-t-2xl bg-stone-950">
                  <img
                    src={imgData.imageUrl}
                    alt={geyser.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src !== imgData.fallbackUrl) {
                        img.src = imgData.fallbackUrl;
                      }
                    }}
                    className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent flex flex-col justify-end p-6">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-amber-400 mb-1">
                      <span className="bg-stone-900/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-stone-700">
                        {geyser.basin}
                      </span>
                      <span className="bg-stone-900/80 px-2 py-0.5 rounded text-stone-200">• {geyser.area}</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
                      {geyser.name}
                    </h2>
                    {geyser.alternateNames.length > 0 && (
                      <p className="text-xs text-stone-300 mt-1 drop-shadow">
                        Also known as: {geyser.alternateNames.join(', ')}
                      </p>
                    )}
                    <div className="absolute bottom-2.5 right-4 text-[10px] text-stone-200 bg-stone-950/85 backdrop-blur-sm px-3 py-1 rounded-md border border-stone-800 hidden sm:block shadow-md">
                      <span className="font-medium">{imgData.imageCaption}</span>
                      {imgData.photographerCredit && (
                        <span className="text-amber-400/90 ml-1.5 font-sans">({imgData.photographerCredit})</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="p-6 space-y-6">
              {/* Detailed Geyser Specifications Grid */}
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-2">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-2">
                    <Info className="w-4 h-4 text-amber-400" />
                    <span>Detailed Information & Geology</span>
                  </h3>
                  <span className="text-xs bg-amber-950/80 text-amber-300 border border-amber-800/50 px-2.5 py-0.5 rounded-full font-bold">
                    {geyser.metadata?.predictability || 'Medium'} Predictability
                  </span>
                </div>

                {/* 4-Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-stone-900/80 p-3 rounded-lg border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-semibold">
                      <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                      <span>Eruption Height</span>
                    </div>
                    <div className="text-sm font-bold text-stone-100 font-mono mt-1">
                      {geyser.metadata?.heightFt || '75 – 150 ft'}
                    </div>
                  </div>

                  <div className="bg-stone-900/80 p-3 rounded-lg border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-semibold">
                      <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                      <span>Water Temp</span>
                    </div>
                    <div className="text-sm font-bold text-stone-100 font-mono mt-1">
                      {geyser.metadata?.tempFahrenheit || '200°F (93°C)'}
                    </div>
                  </div>

                  <div className="bg-stone-900/80 p-3 rounded-lg border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-semibold">
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      <span>Discharge Volume</span>
                    </div>
                    <div className="text-sm font-bold text-stone-100 font-mono mt-1">
                      {geyser.metadata?.waterVolume || '~3,500 gal'}
                    </div>
                  </div>

                  <div className="bg-stone-900/80 p-3 rounded-lg border border-stone-800">
                    <div className="flex items-center space-x-1.5 text-stone-400 text-xs font-semibold">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>Thermal Type</span>
                    </div>
                    <div className="text-sm font-bold text-amber-300 mt-1 truncate">
                      {geyser.metadata?.thermalType || 'Cone Geyser'}
                    </div>
                  </div>
                </div>

                {/* Overview Description */}
                {(geyser.metadata?.overview || geyser.metadata?.description) && (
                  <p className="text-xs text-stone-300 leading-relaxed pt-1">
                    {geyser.metadata?.overview || geyser.metadata?.description}
                  </p>
                )}
              </div>

              {/* Fun Facts & Trivia Section */}
              {geyser.metadata?.funFacts && geyser.metadata.funFacts.length > 0 && (
                <div className="bg-stone-950/90 border border-amber-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Fun Facts & Yellowstone Geyser Trivia</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {geyser.metadata.funFacts.map((fact, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-900/90 border border-stone-800 rounded-lg p-3 text-xs text-stone-200 flex items-start space-x-2.5 shadow-sm"
                      >
                        <span className="bg-amber-950 text-amber-400 border border-amber-800/60 w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{fact}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Prediction Banner */}
              {prediction && (() => {
                const { dayLabel, isToday } = getDayLabelInTimezone(prediction.predictedTime);
                return (
                  <div className="bg-stone-950 border border-amber-500/40 rounded-xl p-5 shadow-inner grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2 space-y-1">
                      <div className="flex items-center space-x-2 text-xs text-stone-400 font-semibold uppercase">
                        <Flame className="w-4 h-4 text-amber-400" />
                        <span>NEXT PREDICTED ERUPTION</span>
                        {!isToday && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1">
                            {dayLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-4xl font-extrabold font-mono text-amber-400 flex flex-wrap items-baseline gap-2">
                        <span>{formatTimeInTimezone(prediction.predictedTime, use24Hour)}</span>
                        {!isToday && (
                          <span className="text-sm font-sans font-bold text-amber-300/80">
                            ({dayLabel})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-300">
                        Prediction Window:{' '}
                        <span className="font-mono text-amber-200 font-bold">
                          {formatWindowRange(prediction.windowStart, prediction.windowEnd, use24Hour)}
                        </span>
                      </div>
                    </div>

                    <div className="text-left md:text-right space-y-2 border-t md:border-t-0 md:border-l border-stone-800 pt-3 md:pt-0 md:pl-4">
                      <div className="bg-amber-950 border border-amber-500 text-amber-300 font-bold px-3 py-1.5 rounded-lg text-sm inline-block">
                        {prediction.confidence}% Confidence
                      </div>
                      <div className="text-xs text-stone-400">
                        Engine: <span className="text-stone-200 font-semibold">{prediction.modelName} ({prediction.modelVersion})</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* "Why this prediction?" Explanation Box */}
              {prediction && (
                <div className="bg-stone-950/80 border border-sky-800/60 rounded-xl p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                    <HelpCircle className="w-4 h-4" />
                    <span>Why this prediction?</span>
                  </div>
                  <ul className="text-xs text-stone-300 space-y-1.5 list-disc pl-5">
                    <li>Current interval since last eruption: <strong>~{formatMinutesToHoursAndMinutes(prediction.features.currentIntervalMinutes)}</strong></li>
                    <li>Historical median interval: <strong>~{formatMinutesToHoursAndMinutes(prediction.features.historicalMedianMinutes)}</strong></li>
                    <li>Recent interval trend: <strong>{prediction.features.recentIntervalTrend}</strong></li>
                    <li>Usable historical observations: <strong>{prediction.features.usableObservationsCount} records</strong></li>
                    <li>Model uncertainty margin: <strong>±{formatMinutesToHoursAndMinutes(prediction.features.modelUncertaintyMinutes)}</strong></li>
                    {prediction.features.durationEffect && (
                      <li>Duration factor: <strong>{prediction.features.durationEffect}</strong></li>
                    )}
                    <li>Observation quality score: <strong>{Math.round(prediction.features.observationQualityScore * 100)}%</strong></li>
                  </ul>
                </div>
              )}

              {/* Historical Statistics Grid */}
              <div>
                <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Historical Eruption Statistics</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <div className="text-xs text-stone-400 font-medium">Recorded Eruptions</div>
                    <div className="text-xl font-bold text-stone-100 font-mono mt-1">{count}</div>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <div className="text-xs text-stone-400 font-medium">Mean Interval</div>
                    <div className="text-xl font-bold text-amber-400 font-mono mt-1">{formatMinutesToHoursAndMinutes(meanInterval)}</div>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <div className="text-xs text-stone-400 font-medium">Median Interval</div>
                    <div className="text-xl font-bold text-amber-400 font-mono mt-1">{formatMinutesToHoursAndMinutes(medianInterval)}</div>
                  </div>
                  <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <div className="text-xs text-stone-400 font-medium">Min / Max Range</div>
                    <div className="text-xl font-bold text-stone-200 font-mono mt-1">{formatMinutesToHoursAndMinutes(minInterval)} / {formatMinutesToHoursAndMinutes(maxInterval)}</div>
                  </div>
                </div>
              </div>

              {/* Last 10 Eruptions Detailed Log */}
              <div>
                <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <History className="w-4 h-4 text-amber-400" />
                  <span>Last 10 Eruptions (Detailed Observation Log)</span>
                </h3>

                {eruptions.length === 0 ? (
                  <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 text-stone-400 text-xs italic text-center">
                    No recorded eruptions available for this geyser.
                  </div>
                ) : (
                  <div className="bg-stone-950 rounded-xl border border-stone-800 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-900 text-stone-400 font-semibold border-b border-stone-800 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Eruption Time</th>
                            <th className="py-2.5 px-3">Interval</th>
                            <th className="py-2.5 px-3">Duration</th>
                            <th className="py-2.5 px-3">Quality & Method</th>
                            <th className="py-2.5 px-3">GT Record ID</th>
                            <th className="py-2.5 px-3">Comment / Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/80">
                          {eruptions.slice(0, 10).map((erup, idx) => {
                            const prevErup = eruptions[idx + 1];
                            const intervalMin = prevErup
                              ? (new Date(erup.eruptionTime).getTime() - new Date(prevErup.eruptionTime).getTime()) / 60000
                              : null;

                            return (
                              <tr key={erup.id} className="hover:bg-stone-900/60 transition-colors">
                                <td className="py-3 px-3 font-mono font-medium text-amber-200 whitespace-nowrap">
                                  <div>{formatTimeInTimezone(erup.eruptionTime, use24Hour)}</div>
                                  <div className="text-[10px] text-stone-500">
                                    {new Date(erup.eruptionTime).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                                  {intervalMin !== null ? (
                                    <span className="text-stone-200 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                                      {formatMinutesToHoursAndMinutes(intervalMin)}
                                    </span>
                                  ) : (
                                    <span className="text-stone-500">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono text-stone-300 whitespace-nowrap">
                                  {erup.duration ? (
                                    <span className="text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40 font-bold">
                                      {formatMinutesToHoursAndMinutes(erup.duration)}
                                    </span>
                                  ) : (
                                    <span className="text-stone-500">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <div className="flex flex-wrap gap-1">
                                    {erup.exact && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                                        <CheckCircle2 className="w-3 h-3" />
                                        <span>Exact</span>
                                      </span>
                                    )}
                                    {erup.approximate && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800/50">
                                        <span>Approx</span>
                                      </span>
                                    )}
                                    {erup.electronic && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800/50">
                                        <Zap className="w-3 h-3" />
                                        <span>Logger</span>
                                      </span>
                                    )}
                                    {erup.webcam && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800/50">
                                        <Video className="w-3 h-3" />
                                        <span>Webcam</span>
                                      </span>
                                    )}
                                    {erup.questionable && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800/50">
                                        <AlertTriangle className="w-3 h-3" />
                                        <span>Questionable</span>
                                      </span>
                                    )}
                                    {erup.major && (
                                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-900/60 text-amber-200 border border-amber-700/50">
                                        <span>Major</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-mono text-stone-400 text-[11px] whitespace-nowrap">
                                  {erup.geysertimesId ? `#${erup.geysertimesId}` : 'Cached'}
                                </td>
                                <td className="py-3 px-3 text-stone-300 text-xs max-w-xs truncate">
                                  {erup.comment || <span className="text-stone-500 italic">No notes</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Charts */}
              <div className="space-y-6 pt-2">
                {/* Chart 1: Interval History Line Chart */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-300">
                    <span>HISTORICAL INTERVAL TREND (MINUTES)</span>
                    <span className="text-stone-400 font-normal">{intervalData.length} Recent Observations</span>
                  </div>
                  <div className="h-48 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={intervalData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="date" stroke="#71717a" tick={{ fontSize: 10 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 10 }} unit="m" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }}
                          formatter={(val: any) => [formatMinutesToHoursAndMinutes(Number(val)), 'Interval']}
                        />
                        <Line type="monotone" dataKey="interval" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Chart 2: Eruption Time Distribution (Hour of Day) */}
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2">
                  <div className="text-xs font-bold text-stone-300 uppercase">
                    Eruption Frequency by Hour of Day
                  </div>
                  <div className="h-44 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourDistributionData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="hour" stroke="#71717a" tick={{ fontSize: 9 }} />
                        <YAxis stroke="#71717a" tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#f4f4f5' }}
                        />
                        <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
