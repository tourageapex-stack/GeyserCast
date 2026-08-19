import React, { useState, useEffect } from 'react';
import { Compass, Clock, MapPin, Footprints, Car, ShieldCheck, Flame } from 'lucide-react';
import { UpcomingGeyserItem } from '../types';
import { formatTimeInTimezone, formatRelativeMinutes, formatMinutesToHoursAndMinutes } from '../utils/time';

interface ItineraryPlannerProps {
  userLat: number;
  userLon: number;
  use24Hour: boolean;
  onSelectGeyser: (id: string) => void;
}

export const ItineraryPlanner: React.FC<ItineraryPlannerProps> = ({
  userLat,
  userLon,
  use24Hour,
  onSelectGeyser,
}) => {
  const [availableHours, setAvailableHours] = useState<number>(2);
  const [safetyBuffer, setSafetyBuffer] = useState<number>(10);
  const [travelMode, setTravelMode] = useState<'walking' | 'driving'>('walking');
  const [itineraryItems, setItineraryItems] = useState<UpcomingGeyserItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchItinerary();
  }, [availableHours, safetyBuffer, travelMode, userLat, userLon]);

  const fetchItinerary = () => {
    setLoading(true);
    const minutes = availableHours * 60;
    fetch(`/api/itinerary?userLat=${userLat}&userLon=${userLon}&minutes=${minutes}&buffer=${safetyBuffer}&mode=${travelMode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.itinerary)) {
          setItineraryItems(data.itinerary);
        }
      })
      .catch((err) => console.error('[Itinerary Fetch Error]', err))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-2xl p-6 shadow-xl text-stone-100">
        <div className="flex items-center space-x-3 mb-2">
          <div className="bg-amber-600 p-2.5 rounded-xl text-stone-950 font-bold shadow">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-amber-300">Plan My Next Few Hours</h2>
            <p className="text-xs text-stone-400">
              Build an optimal geyser viewing route based on live predictions & trail walking times.
            </p>
          </div>
        </div>

        {/* Input Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-stone-800 text-xs">
          {/* Available Time */}
          <div>
            <label className="block text-stone-400 font-semibold mb-1">AVAILABLE TIME</label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4].map((h) => (
                <button
                  key={h}
                  onClick={() => setAvailableHours(h)}
                  className={`flex-1 py-2 rounded-lg font-bold transition border ${
                    availableHours === h
                      ? 'bg-amber-600 text-stone-950 border-amber-500 shadow'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                  }`}
                >
                  {h} {h === 1 ? 'Hour' : 'Hours'}
                </button>
              ))}
            </div>
          </div>

          {/* Travel Mode */}
          <div>
            <label className="block text-stone-400 font-semibold mb-1">TRAVEL MODE</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setTravelMode('walking')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition border ${
                  travelMode === 'walking'
                    ? 'bg-amber-600 text-stone-950 border-amber-500 shadow'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                <Footprints className="w-4 h-4" />
                <span>Walking Trails</span>
              </button>
              <button
                onClick={() => setTravelMode('driving')}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2 rounded-lg font-bold transition border ${
                  travelMode === 'driving'
                    ? 'bg-amber-600 text-stone-950 border-amber-500 shadow'
                    : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Driving + Walk</span>
              </button>
            </div>
          </div>

          {/* Safety Buffer */}
          <div>
            <label className="block text-stone-400 font-semibold mb-1">SAFETY BUFFER</label>
            <div className="flex space-x-1">
              {[0, 5, 10, 15].map((b) => (
                <button
                  key={b}
                  onClick={() => setSafetyBuffer(b)}
                  className={`flex-1 py-2 rounded-lg font-bold transition border ${
                    safetyBuffer === b
                      ? 'bg-amber-600 text-stone-950 border-amber-500 shadow'
                      : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                  }`}
                >
                  {b} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Itinerary Results Timeline */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-amber-300 flex items-center justify-between">
          <span>Recommended Geyser Itinerary</span>
          <span className="text-xs font-normal text-stone-400">
            {itineraryItems.length} Opportunities within {availableHours}h
          </span>
        </h3>

        {loading ? (
          <div className="p-8 text-center text-amber-400 font-bold animate-pulse">
            Calculating realistic travel routes & prediction windows...
          </div>
        ) : itineraryItems.length === 0 ? (
          <div className="p-8 text-center text-stone-400 bg-stone-950 rounded-xl border border-stone-800">
            No geysers predicted to erupt within {availableHours} hour(s) matching your location and safety buffer.
          </div>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-stone-800 before:z-0">
            {itineraryItems.map((item, idx) => {
              const { geyser, prediction, minutesUntilEruption, walkRoute, driveRoute, canMakeIt } = item;
              const route = travelMode === 'walking' ? walkRoute : driveRoute;

              return (
                <div
                  key={geyser.id}
                  className="relative z-10 flex items-start space-x-4 bg-stone-950 border border-stone-800 p-4 rounded-xl shadow-md hover:border-amber-500/50 transition"
                >
                  {/* Step Number Badge */}
                  <div className="bg-amber-600 text-stone-950 font-bold w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow text-sm">
                    {idx + 1}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-semibold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                          {geyser.basin}
                        </span>
                        <h4 className="text-lg font-bold text-stone-100 hover:text-amber-300 transition">
                          <button onClick={() => onSelectGeyser(geyser.id)} className="text-left">
                            {geyser.name}
                          </button>
                        </h4>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold font-mono text-amber-400">
                          {formatTimeInTimezone(prediction.predictedTime, use24Hour)}
                        </div>
                        <div className="text-xs text-stone-400">{formatRelativeMinutes(minutesUntilEruption)}</div>
                      </div>
                    </div>

                    {/* Travel Time & Margin Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-stone-800/80">
                      <div className="flex items-center space-x-1.5 text-stone-300">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        <span>
                          Travel Time: <strong>{formatMinutesToHoursAndMinutes(route.durationMinutes)}</strong> ({route.distanceMiles} mi)
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-stone-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Arrival Margin: <strong>{canMakeIt.marginMinutes >= 0 ? `+${formatMinutesToHoursAndMinutes(canMakeIt.marginMinutes)}` : `-${formatMinutesToHoursAndMinutes(Math.abs(canMakeIt.marginMinutes))}`}</strong>
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-amber-300 font-semibold">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Confidence: {prediction.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
