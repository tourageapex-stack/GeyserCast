import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, RefreshCw, SlidersHorizontal, MapPin, Heart, Bell, X, Check, Flame, Clock, ArrowUpDown, Navigation } from 'lucide-react';
import { Header } from './components/Header';
import { PredictionCard } from './components/PredictionCard';
import { GeyserMap } from './components/GeyserMap';
import { GeyserDetailModal } from './components/GeyserDetailModal';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { GeminiAssistant } from './components/GeminiAssistant';
import { AdminDashboard } from './components/AdminDashboard';
import { AboutModal } from './components/AboutModal';
import { UpcomingGeyserItem, FilterState, SyncStatus, Geyser } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'map' | 'all' | 'itinerary' | 'ai' | 'admin' | 'about'>('upcoming');
  const [items, setItems] = useState<UpcomingGeyserItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // User Location (Default: Old Faithful Visitor Center)
  const [userLat, setUserLat] = useState<number>(44.4596);
  const [userLon, setUserLon] = useState<number>(-110.8281);
  const [userLocationName, setUserLocationName] = useState<string>('Old Faithful Area (Default)');

  // Preferences & Filters
  const [use24Hour, setUse24Hour] = useState<boolean>(true);
  const [useAi, setUseAi] = useState<boolean>(() => {
    try {
      return JSON.parse(localStorage.getItem('geyser_use_ai') || 'false');
    } catch {
      return false;
    }
  });
  const [safetyBuffer, setSafetyBuffer] = useState<number>(10);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('geyser_favorites') || '["old-faithful", "daisy"]');
    } catch {
      return ['old-faithful', 'daisy'];
    }
  });

  const [followed, setFollowed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('geyser_followed') || '["old-faithful"]');
    } catch {
      return ['old-faithful'];
    }
  });

  const [selectedGeyserId, setSelectedGeyserId] = useState<string | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic filter lists
  const [availableBasins, setAvailableBasins] = useState<string[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedGeysers: [],
    selectedBasins: [],
    selectedAreas: [],
    timeWindowRange: 'all',
    minConfidence: 30,
    maxDistanceMiles: null,
    onlyFavorites: false,
    sortBy: 'time',
  });

  // Fetch initial predictions & basins/areas
  useEffect(() => {
    fetchData();
    fetchBasinsAndAreas();
    requestBrowserLocation();
  }, [userLat, userLon, safetyBuffer, useAi]);

  useEffect(() => {
    localStorage.setItem('geyser_use_ai', JSON.stringify(useAi));
  }, [useAi]);

  useEffect(() => {
    localStorage.setItem('geyser_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('geyser_followed', JSON.stringify(followed));
  }, [followed]);

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/predictions/upcoming?userLat=${userLat}&userLon=${userLon}&buffer=${safetyBuffer}&useAi=${useAi}`).then((r) => r.json()),
      fetch('/api/admin/status').then((r) => r.json()),
    ])
      .then(([predData, syncData]) => {
        if (Array.isArray(predData)) setItems(predData);
        if (syncData) setSyncStatus(syncData);
      })
      .catch((err) => console.error('[Fetch Data Error]', err))
      .finally(() => setLoading(false));
  };

  const fetchBasinsAndAreas = () => {
    fetch('/api/basins').then((r) => r.json()).then(setAvailableBasins).catch(() => {});
    fetch('/api/areas').then((r) => r.json()).then(setAvailableAreas).catch(() => {});
  };

  const requestBrowserLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLon(pos.coords.longitude);
          setUserLocationName('My GPS Location');
          showToast('Updated location to current browser GPS position');
        },
        (err) => {
          console.log('[Geolocation declined/unavailable, using Old Faithful coordinates]');
        }
      );
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleFavorite = (geyserId: string) => {
    setFavorites((prev) => {
      const exists = prev.includes(geyserId);
      const next = exists ? prev.filter((id) => id !== geyserId) : [...prev, geyserId];
      showToast(exists ? 'Removed from favorites' : 'Added to favorites');
      return next;
    });
  };

  const handleToggleFollow = (geyserId: string) => {
    setFollowed((prev) => {
      const exists = prev.includes(geyserId);
      const next = exists ? prev.filter((id) => id !== geyserId) : [...prev, geyserId];

      if (!exists && 'Notification' in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            showToast('Browser notifications enabled for followed geyser!');
          }
        });
      } else {
        showToast(exists ? 'Stopped following notifications' : 'Followed geyser notifications');
      }

      return next;
    });
  };

  // Filtered & Sorted Prediction Feed
  const filteredItems = useMemo(() => {
    const list = items.filter((item) => {
      const { geyser, prediction, minutesUntilEruption, walkRoute } = item;

      // 1. Search Query Fuzzy Matching
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matchName = geyser.name.toLowerCase().includes(q);
        const matchNormalized = geyser.normalizedName.includes(q);
        const matchBasin = geyser.basin.toLowerCase().includes(q);
        const matchArea = geyser.area.toLowerCase().includes(q);
        const matchAlt = geyser.alternateNames.some((alt) => alt.toLowerCase().includes(q));
        if (!matchName && !matchNormalized && !matchBasin && !matchArea && !matchAlt) return false;
      }

      // 2. Basin filter
      if (filters.selectedBasins.length > 0 && !filters.selectedBasins.includes(geyser.basin)) {
        return false;
      }

      // 3. Area filter
      if (filters.selectedAreas.length > 0 && !filters.selectedAreas.includes(geyser.area)) {
        return false;
      }

      // 4. Time Window Filter
      if (filters.timeWindowRange !== 'all') {
        let maxMinutes = 1440;
        if (filters.timeWindowRange === '15m') maxMinutes = 15;
        else if (filters.timeWindowRange === '30m') maxMinutes = 30;
        else if (filters.timeWindowRange === '1h') maxMinutes = 60;
        else if (filters.timeWindowRange === '2h') maxMinutes = 120;
        else if (filters.timeWindowRange === '4h') maxMinutes = 240;
        else if (filters.timeWindowRange === 'today') maxMinutes = 720;

        if (minutesUntilEruption > maxMinutes || minutesUntilEruption < -30) return false;
      }

      // 5. Confidence filter
      if (prediction.confidence < filters.minConfidence) return false;

      // 6. Max Distance Filter
      if (filters.maxDistanceMiles !== null && walkRoute.distanceMiles > filters.maxDistanceMiles) {
        return false;
      }

      // 7. Favorites Filter
      if (filters.onlyFavorites && !favorites.includes(geyser.id)) {
        return false;
      }

      return true;
    });

    // Sort list based on selected criteria
    return list.sort((a, b) => {
      if (filters.sortBy === 'distance') {
        // Primary: Closest distance first
        const distDiff = a.walkRoute.distanceMiles - b.walkRoute.distanceMiles;
        if (Math.abs(distDiff) > 0.01) {
          return distDiff;
        }
        // Secondary: Earliest eruption time first
        return a.minutesUntilEruption - b.minutesUntilEruption;
      } else {
        // Primary: Earliest eruption time first
        const timeDiff = a.minutesUntilEruption - b.minutesUntilEruption;
        if (timeDiff !== 0) {
          return timeDiff;
        }
        // Secondary: Closest distance first
        return a.walkRoute.distanceMiles - b.walkRoute.distanceMiles;
      }
    });
  }, [items, filters, favorites]);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-stone-950">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-amber-500 text-stone-950 font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs border border-amber-400 animate-bounce">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        syncStatus={syncStatus}
        onRefreshSync={fetchData}
        use24Hour={use24Hour}
        setUse24Hour={setUse24Hour}
        favoritesCount={favorites.length}
        onToggleFavoritesFilter={() =>
          setFilters((prev) => ({ ...prev, onlyFavorites: !prev.onlyFavorites }))
        }
        showFavoritesOnly={filters.onlyFavorites}
        useAi={useAi}
        setUseAi={setUseAi}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Search & Quick Filters Bar */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-3">
          {/* Prominent Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search geyser name (e.g. 'Old Faithful', 'beeh'), basin, or area..."
              className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-3 top-3 text-stone-500 hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter & Sort Buttons */}
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Sort Controls */}
            <div className="bg-stone-950 border border-stone-800 p-1 rounded-xl flex items-center space-x-1">
              <span className="text-[10px] font-bold text-stone-500 uppercase px-1.5 hidden sm:inline-flex items-center space-x-1">
                <ArrowUpDown className="w-3 h-3 text-stone-400" />
                <span>Sort:</span>
              </span>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'time' }))}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition ${
                  filters.sortBy === 'time'
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Sort by earliest predicted eruption time first"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Time</span>
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'distance' }))}
                className={`px-2.5 py-1 rounded-lg font-bold flex items-center space-x-1 transition ${
                  filters.sortBy === 'distance'
                    ? 'bg-amber-600 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
                title="Sort by closest distance first"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Distance</span>
              </button>
            </div>

            {/* Time Window Buttons */}
            <div className="bg-stone-950 border border-stone-800 p-1 rounded-xl flex space-x-1">
              {(['all', '30m', '1h', '2h', '4h'] as const).map((tw) => (
                <button
                  key={tw}
                  onClick={() => setFilters((prev) => ({ ...prev, timeWindowRange: tw }))}
                  className={`px-2.5 py-1 rounded-lg font-bold transition ${
                    filters.timeWindowRange === tw
                      ? 'bg-amber-600 text-stone-950'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {tw === 'all' ? 'All' : tw}
                </button>
              ))}
            </div>

            {/* Filter Drawer Toggle */}
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className="flex items-center space-x-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 px-3.5 py-2 rounded-xl font-bold transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Filters</span>
              {(filters.selectedBasins.length > 0 || filters.minConfidence > 30 || filters.sortBy === 'distance') && (
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* Filter Drawer Sheet */}
        {showFilterDrawer && (
          <div className="bg-stone-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4 text-xs animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Multi-Criteria Filters & Sorting</span>
              </span>
              <button
                onClick={() =>
                  setFilters({
                    searchQuery: '',
                    selectedGeysers: [],
                    selectedBasins: [],
                    selectedAreas: [],
                    timeWindowRange: 'all',
                    minConfidence: 30,
                    maxDistanceMiles: null,
                    onlyFavorites: false,
                    sortBy: 'time',
                  })
                }
                className="text-stone-400 hover:text-amber-400 underline font-medium"
              >
                Reset All Filters
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Sort Order */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1.5 uppercase">SORT ORDER</label>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'time' }))}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition border flex items-center justify-center space-x-1 ${
                      filters.sortBy === 'time'
                        ? 'bg-amber-600 text-stone-950 border-amber-500'
                        : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Time</span>
                  </button>
                  <button
                    onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'distance' }))}
                    className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition border flex items-center justify-center space-x-1 ${
                      filters.sortBy === 'distance'
                        ? 'bg-amber-600 text-stone-950 border-amber-500'
                        : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Distance</span>
                  </button>
                </div>
              </div>

              {/* Basin Filter */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1.5 uppercase">BASIN</label>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {availableBasins.map((basin) => {
                    const isSelected = filters.selectedBasins.includes(basin);
                    return (
                      <button
                        key={basin}
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            selectedBasins: isSelected
                              ? prev.selectedBasins.filter((b) => b !== basin)
                              : [...prev.selectedBasins, basin],
                          }))
                        }
                        className={`w-full text-left px-2.5 py-1 rounded-lg border font-medium transition ${
                          isSelected
                            ? 'bg-amber-600 text-stone-950 border-amber-500 font-bold'
                            : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                        }`}
                      >
                        {basin}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confidence Slider */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1.5 uppercase">
                  MIN CONFIDENCE: <span className="text-amber-400 font-mono font-bold">{filters.minConfidence}%</span>
                </label>
                <input
                  type="range"
                  min={30}
                  max={95}
                  step={5}
                  value={filters.minConfidence}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, minConfidence: Number(e.target.value) }))
                  }
                  className="w-full accent-amber-500 bg-stone-950 mt-2"
                />
              </div>

              {/* Max Distance Filter */}
              <div>
                <label className="block text-stone-400 font-semibold mb-1.5 uppercase">MAX TRAIL DISTANCE</label>
                <div className="flex space-x-1">
                  {[null, 1, 5, 10].map((dist) => (
                    <button
                      key={dist ?? 'any'}
                      onClick={() => setFilters((prev) => ({ ...prev, maxDistanceMiles: dist }))}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition border ${
                        filters.maxDistanceMiles === dist
                          ? 'bg-amber-600 text-stone-950 border-amber-500'
                          : 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                      }`}
                    >
                      {dist === null ? 'Any' : `<${dist} mi`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content Rendering */}

        {/* TAB 1: Erupting Soon (Main Feed) */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between text-xs text-stone-400 gap-2">
              <span className="font-semibold text-stone-300">
                Showing {filteredItems.length} predicted eruptions
              </span>
              <span className="flex items-center space-x-1 text-amber-400 font-medium bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-lg">
                <ArrowUpDown className="w-3 h-3" />
                <span>
                  {filters.sortBy === 'time'
                    ? 'Sorted by earliest eruption time (closest distance tie-breaker)'
                    : 'Sorted by closest distance (earliest time tie-breaker)'}
                </span>
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-amber-400 font-bold animate-pulse">
                Fetching real GeyserTimes predictions & travel routes...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-stone-900 rounded-2xl border border-stone-800 text-stone-400 space-y-2">
                <p className="font-bold text-stone-200">No geyser predictions match your active filters.</p>
                <button
                  onClick={() =>
                    setFilters({
                      searchQuery: '',
                      selectedGeysers: [],
                      selectedBasins: [],
                      selectedAreas: [],
                      timeWindowRange: 'all',
                      minConfidence: 30,
                      maxDistanceMiles: null,
                      onlyFavorites: false,
                    })
                  }
                  className="text-amber-400 hover:underline font-bold text-xs"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item) => (
                  <PredictionCard
                    key={item.geyser.id}
                    item={item}
                    use24Hour={use24Hour}
                    safetyBuffer={safetyBuffer}
                    onSetSafetyBuffer={setSafetyBuffer}
                    isFavorite={favorites.includes(item.geyser.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onSelectGeyser={setSelectedGeyserId}
                    isFollowed={followed.includes(item.geyser.id)}
                    onToggleFollow={handleToggleFollow}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Interactive Map */}
        {activeTab === 'map' && (
          <GeyserMap
            items={filteredItems}
            userLat={userLat}
            userLon={userLon}
            selectedGeyserId={selectedGeyserId}
            onSelectGeyser={setSelectedGeyserId}
            use24Hour={use24Hour}
          />
        )}

        {/* TAB 3: All Geysers List */}
        {activeTab === 'all' && (
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-amber-300">All Yellowstone Geysers Repository</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredItems.map(({ geyser, prediction }) => (
                <div
                  key={geyser.id}
                  onClick={() => setSelectedGeyserId(geyser.id)}
                  className="bg-stone-950 border border-stone-800 hover:border-amber-500/50 p-4 rounded-xl cursor-pointer transition space-y-1"
                >
                  <span className="text-[10px] font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                    {geyser.basin}
                  </span>
                  <h4 className="font-bold text-stone-100 text-base">{geyser.name}</h4>
                  <div className="text-xs text-stone-400 font-mono">
                    Typical interval: ~{prediction.features.historicalMedianMinutes}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: Itinerary Planner */}
        {activeTab === 'itinerary' && (
          <ItineraryPlanner
            userLat={userLat}
            userLon={userLon}
            use24Hour={use24Hour}
            onSelectGeyser={setSelectedGeyserId}
          />
        )}

        {/* TAB 5: Gemini AI Assistant */}
        {activeTab === 'ai' && (
          <GeminiAssistant
            onApplyNaturalFilter={(updates, summary) => {
              setFilters((prev) => ({ ...prev, ...updates }));
              setActiveTab('upcoming');
              showToast(summary);
            }}
            userLat={userLat}
            userLon={userLon}
          />
        )}

        {/* TAB 6: Admin & Backtest */}
        {activeTab === 'admin' && (
          <AdminDashboard syncStatus={syncStatus} onRefreshSync={fetchData} />
        )}

        {/* TAB 7: About */}
        {activeTab === 'about' && <AboutModal />}
      </main>

      {/* Geyser Detail Modal */}
      {selectedGeyserId && (
        <GeyserDetailModal
          geyserId={selectedGeyserId}
          onClose={() => setSelectedGeyserId(null)}
          use24Hour={use24Hour}
          useAi={useAi}
        />
      )}
    </div>
  );
}
