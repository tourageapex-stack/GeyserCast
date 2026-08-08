import React from 'react';
import { Clock, MapPin, Navigation, Heart, Bell, ChevronRight, ShieldCheck, Flame, Car } from 'lucide-react';
import { UpcomingGeyserItem } from '../types';
import { formatTimeInTimezone, formatWindowRange, formatRelativeMinutes, formatMinutesToHoursAndMinutes, getDayLabelInTimezone } from '../utils/time';

interface PredictionCardProps {
  item: UpcomingGeyserItem;
  use24Hour: boolean;
  safetyBuffer: number;
  onSetSafetyBuffer: (val: number) => void;
  isFavorite: boolean;
  onToggleFavorite: (geyserId: string) => void;
  onSelectGeyser: (geyserId: string) => void;
  isFollowed: boolean;
  onToggleFollow: (geyserId: string) => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  item,
  use24Hour,
  safetyBuffer,
  onSetSafetyBuffer,
  isFavorite,
  onToggleFavorite,
  onSelectGeyser,
  isFollowed,
  onToggleFollow,
}) => {
  const { geyser, prediction, minutesUntilEruption, walkRoute, driveRoute, canMakeIt } = item;

  const formattedPredictedTime = formatTimeInTimezone(prediction.predictedTime, use24Hour);
  const { dayLabel, isToday } = getDayLabelInTimezone(prediction.predictedTime);
  const windowRangeStr = formatWindowRange(prediction.windowStart, prediction.windowEnd, use24Hour);

  // Status color logic for "Can I Make It?"
  const makeItBadgeStyle =
    canMakeIt.status === 'probably'
      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
      : canMakeIt.status === 'tight'
      ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
      : 'bg-rose-950/80 border-rose-500/60 text-rose-300';

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-lg hover:border-amber-500/40 transition flex flex-col justify-between space-y-4 text-stone-100">
      {/* Top Header: Geyser Name, Basin & Favorite Button */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-800 text-amber-400 border border-stone-700">
              {geyser.basin}
            </span>
            <span className="text-xs text-stone-400">• {geyser.area}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-amber-300 mt-1 hover:text-amber-200 transition">
            <button onClick={() => onSelectGeyser(geyser.id)} className="text-left">
              {geyser.name}
            </button>
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onToggleFollow(geyser.id)}
            className={`p-2 rounded-xl border transition ${
              isFollowed
                ? 'bg-amber-950/80 border-amber-500 text-amber-400'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title={isFollowed ? 'Notifications On' : 'Notify when eruption approaches'}
          >
            <Bell className={`w-4 h-4 ${isFollowed ? 'fill-amber-400' : ''}`} />
          </button>
          <button
            onClick={() => onToggleFavorite(geyser.id)}
            className={`p-2 rounded-xl border transition ${
              isFavorite
                ? 'bg-rose-950/80 border-rose-500 text-rose-400'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Prediction Clock Block */}
      <div className="bg-stone-950 border border-stone-800/80 rounded-xl p-4 flex items-center justify-between shadow-inner">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-stone-400 font-medium">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>PREDICTED ERUPTION</span>
            {!isToday && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 ml-1">
                {dayLabel}
              </span>
            )}
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-amber-400 tracking-tight mt-0.5 flex flex-wrap items-baseline gap-2">
            <span>{formattedPredictedTime}</span>
            {!isToday && (
              <span className="text-xs font-sans font-bold text-amber-300/80">
                ({dayLabel})
              </span>
            )}
          </div>
          <div className="text-xs text-stone-400 font-medium mt-1">
            Likely Window: <span className="text-stone-200 font-mono">{windowRangeStr}</span>
          </div>
        </div>

        <div className="text-right">
          <div className="bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold px-3 py-1 rounded-lg text-sm inline-block shadow">
            {prediction.confidence}% Confidence
          </div>
          <div className="text-sm font-semibold text-amber-200 mt-2">
            {formatRelativeMinutes(minutesUntilEruption)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Model: <span className="text-stone-300">{prediction.modelName}</span>
          </div>
        </div>
      </div>

      {/* Travel Time & "Can I Make It?" Section */}
      <div className="bg-stone-950/60 border border-stone-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-300 border-b border-stone-800/80 pb-2">
          <div className="flex items-center space-x-1.5">
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>ESTIMATED TRAVEL TIME</span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-stone-400">
            <span>Buffer:</span>
            <div className="flex space-x-1">
              {[0, 5, 10, 15].map((b) => (
                <button
                  key={b}
                  onClick={() => onSetSafetyBuffer(b)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                    safetyBuffer === b
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {b}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-stone-400 text-[10px] uppercase font-bold">Trail Walk</div>
              <div className="text-stone-200 font-bold text-sm">
                🚶 {formatMinutesToHoursAndMinutes(walkRoute.durationMinutes)} ({walkRoute.distanceMiles} mi)
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-stone-900/80 p-2 rounded-lg border border-stone-800">
            <Car className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-stone-400 text-[10px] uppercase font-bold">Drive + Parking</div>
              <div className="text-stone-200 font-bold text-sm">
                🚗 {formatMinutesToHoursAndMinutes(driveRoute.durationMinutes)} ({driveRoute.distanceMiles} mi)
              </div>
            </div>
          </div>
        </div>

        {/* Can I Make It Indicator Badge */}
        <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-bold ${makeItBadgeStyle}`}>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Can I Make It? {canMakeIt.label}</span>
          </div>
          <span className="text-[11px] opacity-80">
            Margin: {canMakeIt.marginMinutes >= 0 ? `+${formatMinutesToHoursAndMinutes(canMakeIt.marginMinutes)}` : `-${formatMinutesToHoursAndMinutes(Math.abs(canMakeIt.marginMinutes))}`}
          </span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between text-xs text-stone-400 pt-1">
        <div className="flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Last eruption interval: ~{formatMinutesToHoursAndMinutes(Math.abs(prediction.features.currentIntervalMinutes))} ago</span>
        </div>

        <button
          onClick={() => onSelectGeyser(geyser.id)}
          className="flex items-center space-x-1 text-amber-400 font-bold hover:text-amber-300 transition py-1 px-2.5 bg-stone-800 hover:bg-stone-700 rounded-lg border border-stone-700"
        >
          <span>View Details & Charts</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
