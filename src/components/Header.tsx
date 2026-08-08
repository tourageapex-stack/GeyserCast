import React from 'react';
import { RefreshCw, Clock, Flame, Map, Layers, Compass, Bot, Activity, Info, Heart } from 'lucide-react';
import { SyncStatus } from '../types';
import { getMountainTimeNow } from '../utils/time';

interface HeaderProps {
  activeTab: 'upcoming' | 'map' | 'all' | 'itinerary' | 'ai' | 'admin' | 'about';
  setActiveTab: (tab: 'upcoming' | 'map' | 'all' | 'itinerary' | 'ai' | 'admin' | 'about') => void;
  syncStatus: SyncStatus | null;
  onRefreshSync: () => void;
  use24Hour: boolean;
  setUse24Hour: (val: boolean) => void;
  favoritesCount: number;
  onToggleFavoritesFilter: () => void;
  showFavoritesOnly: boolean;
  useAi: boolean;
  setUseAi: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  syncStatus,
  onRefreshSync,
  use24Hour,
  setUse24Hour,
  favoritesCount,
  onToggleFavoritesFilter,
  showFavoritesOnly,
  useAi,
  setUseAi,
}) => {
  const [mountainTime, setMountainTime] = React.useState(getMountainTimeNow(use24Hour));

  React.useEffect(() => {
    setMountainTime(getMountainTimeNow(use24Hour));
    const timer = setInterval(() => {
      setMountainTime(getMountainTimeNow(use24Hour));
    }, 1000);
    return () => clearInterval(timer);
  }, [use24Hour]);

  const lastSyncMinutes = syncStatus?.lastSyncAt
    ? Math.max(0, Math.round((Date.now() - new Date(syncStatus.lastSyncAt).getTime()) / 60000))
    : null;

  return (
    <header className="bg-stone-900 text-stone-100 border-b border-stone-800 sticky top-0 z-40 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="bg-amber-600 p-2 rounded-xl text-stone-950 font-bold shadow">
            <Flame className="w-6 h-6 text-stone-950" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-amber-400">
              Yellowstone Geyser Predictor
            </h1>
            <p className="text-xs text-stone-400">
              Live Forecasts & Travel Times • GeyserTimes.org Data Engine
            </p>
          </div>
        </div>

        {/* Live Status & Mountain Time */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Live Status Badge */}
          <div className="flex items-center space-x-2 bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700">
            {syncStatus?.status === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : syncStatus?.status === 'error' ? (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            <span className="text-stone-300 font-medium">
              {syncStatus?.status === 'error'
                ? 'Cached Repo'
                : lastSyncMinutes !== null
                ? `Updated ${lastSyncMinutes}m ago`
                : 'Live Data'}
            </span>
            <button
              onClick={onRefreshSync}
              className="text-amber-400 hover:text-amber-300 transition p-1 hover:bg-stone-700 rounded"
              title="Refresh GeyserTimes Data"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {/* Mountain Time Clock */}
          <div className="flex items-center space-x-1.5 bg-stone-800 px-3 py-1.5 rounded-lg border border-stone-700 text-stone-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{mountainTime} MT</span>
          </div>

          {/* Prediction Mode AI Toggle */}
          <div className="flex items-center bg-stone-950 p-1 rounded-xl border border-stone-800 space-x-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 px-2 hidden sm:inline">Prediction Mode:</span>
            <button
              onClick={() => setUseAi(false)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                !useAi
                  ? 'bg-amber-600 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Strictly use GeyserTimes.org official intervals and data"
            >
              <span>GeyserTimes.org</span>
            </button>
            <button
              onClick={() => setUseAi(true)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                useAi
                  ? 'bg-sky-500 text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
              title="Use AI multi-candidate Machine Learning predictions"
            >
              <Bot className="w-3 h-3" />
              <span>AI Predictions</span>
            </button>
          </div>

          {/* 12h/24h Format Toggle */}
          <button
            onClick={() => setUse24Hour(!use24Hour)}
            className="bg-stone-800 hover:bg-stone-700 text-stone-300 px-2.5 py-1.5 rounded-lg border border-stone-700 font-medium transition"
          >
            {use24Hour ? '24h' : '12h'}
          </button>

          {/* Favorites Filter Button */}
          <button
            onClick={onToggleFavoritesFilter}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border transition font-medium ${
              showFavoritesOnly
                ? 'bg-rose-900/60 border-rose-500 text-rose-300'
                : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>Favorites</span>
            {favoritesCount > 0 && (
              <span className="bg-rose-500 text-stone-950 font-bold px-1.5 py-0.2 rounded-full text-[10px]">
                {favoritesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="bg-stone-950 border-t border-stone-800 overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 flex space-x-1 py-1">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Erupting Soon</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Map className="w-4 h-4" />
            <span>Interactive Map</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All Geysers</span>
          </button>

          <button
            onClick={() => setActiveTab('itinerary')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'itinerary'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Itinerary Planner</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>Gemini AI</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'admin'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Backtest & Admin</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
              activeTab === 'about'
                ? 'bg-amber-600 text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </button>
        </div>
      </div>
    </header>
  );
};
