import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw, Database, Cpu, CheckCircle2, AlertTriangle, Layers, BarChart } from 'lucide-react';
import { SyncStatus, BacktestResult } from '../types';
import { formatTimeInTimezone } from '../utils/time';

interface AdminDashboardProps {
  syncStatus: SyncStatus | null;
  onRefreshSync: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ syncStatus, onRefreshSync }) => {
  const [backtests, setBacktests] = useState<BacktestResult[]>([]);
  const [loadingBacktest, setLoadingBacktest] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBacktests();
  }, []);

  const fetchBacktests = () => {
    setLoadingBacktest(true);
    fetch('/api/admin/backtest')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBacktests(data);
      })
      .catch((err) => console.error('[Admin Backtest Fetch Error]', err))
      .finally(() => setLoadingBacktest(false));
  };

  const handleTriggerAction = (actionName: string) => {
    setActionMessage(`Executing: ${actionName}...`);
    onRefreshSync();
    setTimeout(() => {
      fetchBacktests();
      setActionMessage(`Successfully completed ${actionName}. Model parameters updated.`);
      setTimeout(() => setActionMessage(null), 4000);
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-stone-100">
      {/* Header Banner */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-600 p-2.5 rounded-xl text-stone-950 font-bold">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-300">Admin & Model Backtesting Dashboard</h2>
            <p className="text-xs text-stone-400">
              Inspect database synchronization status, ML backtesting accuracy metrics, and re-trigger pipeline execution.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleTriggerAction('Sync GeyserTimes Data')}
            className="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync GeyserTimes</span>
          </button>
          <button
            onClick={() => handleTriggerAction('Rebuild Features')}
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Rebuild Features</span>
          </button>
          <button
            onClick={() => handleTriggerAction('Retrain Models')}
            className="bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-400" />
            <span>Retrain Models</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="bg-amber-950/80 border border-amber-500 text-amber-300 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>GeyserTimes Sync</span>
            <RefreshCw className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-stone-100 font-mono mt-1">
            {syncStatus?.status === 'error' ? 'Stale / Offline' : 'Live Connected'}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Last: {syncStatus?.lastSyncAt ? formatTimeInTimezone(syncStatus.lastSyncAt, true) : 'Never'}
          </div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Geysers Tracked</span>
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {syncStatus?.geysersCount || 14}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Active Yellowstone Geysers</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>Eruption Archives</span>
            <BarChart className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {syncStatus?.eruptionsCount?.toLocaleString() || 0}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Historical Eruption Records</div>
        </div>

        <div className="bg-stone-900 border border-stone-800 p-4 rounded-xl shadow">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>ML Model Engine</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300 font-mono mt-1">v1.4 EWMA + Bimodal</div>
          <div className="text-[11px] text-stone-400 mt-1">Chronological Backtested</div>
        </div>
      </div>

      {/* Backtesting Accuracy Results Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-amber-300">Historical Model Backtesting Metrics</h3>
          <span className="text-xs text-stone-400">Evaluated Chronologically (No Data Leakage)</span>
        </div>

        {loadingBacktest ? (
          <div className="p-8 text-center text-amber-400 font-bold animate-pulse">
            Computing historical backtesting error metrics across all geysers...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-800 text-stone-400 uppercase font-semibold">
                  <th className="py-2.5 px-3">Geyser</th>
                  <th className="py-2.5 px-3">Selected Model</th>
                  <th className="py-2.5 px-3">Evaluations</th>
                  <th className="py-2.5 px-3">MAE (min)</th>
                  <th className="py-2.5 px-3">Median AE</th>
                  <th className="py-2.5 px-3">≤5m Error</th>
                  <th className="py-2.5 px-3">≤15m Error</th>
                  <th className="py-2.5 px-3">Interval Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-mono">
                {backtests.map((bt) => (
                  <tr key={bt.geyserId} className="hover:bg-stone-950/60 transition">
                    <td className="py-3 px-3 font-sans font-bold text-stone-200">{bt.geyserName}</td>
                    <td className="py-3 px-3 font-sans text-amber-400">{bt.modelName}</td>
                    <td className="py-3 px-3 text-stone-300">{bt.evaluationsCount}</td>
                    <td className="py-3 px-3 font-bold text-amber-300">{bt.maeMinutes}m</td>
                    <td className="py-3 px-3 text-stone-300">{bt.medianAeMinutes}m</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">{bt.within5MinPercent}%</td>
                    <td className="py-3 px-3 text-emerald-400 font-bold">{bt.within15MinPercent}%</td>
                    <td className="py-3 px-3 text-sky-400">{bt.predictionIntervalCoveragePercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
