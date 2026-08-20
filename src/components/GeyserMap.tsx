import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UpcomingGeyserItem } from '../types';
import { formatTimeInTimezone, formatTimeWithDayLabel } from '../utils/time';

interface GeyserMapProps {
  items: UpcomingGeyserItem[];
  userLat: number;
  userLon: number;
  selectedGeyserId: string | null;
  onSelectGeyser: (id: string) => void;
  use24Hour: boolean;
}

export const GeyserMap: React.FC<GeyserMapProps> = ({
  items,
  userLat,
  userLon,
  selectedGeyserId,
  onSelectGeyser,
  use24Hour,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [44.4605, -110.8281],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      polylineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m) => (m as L.Marker).remove());
    markersRef.current = {};

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    // Add User Location Pin
    const userIcon = L.divIcon({
      className: 'user-pin-marker',
      html: `<div style="background-color: #0284c7; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    const userMarker = L.marker([userLat, userLon], { icon: userIcon }).addTo(map);
    userMarker.bindPopup(`<b>Your Current Location</b><br/>Yellowstone Park`);
    markersRef.current['user'] = userMarker;

    // Add Geyser Markers. Visitor-window forecasts render last so they sit on top.
    const sortedItems = [...items].sort((a, b) => {
      const aLive = a.minutesUntilEruption >= -360 && a.minutesUntilEruption <= 36 * 60;
      const bLive = b.minutesUntilEruption >= -360 && b.minutesUntilEruption <= 36 * 60;
      if (aLive === bLive) return 0;
      return aLive ? 1 : -1;
    });

    sortedItems.forEach((item) => {
      const { geyser, prediction, minutesUntilEruption, walkRoute, canMakeIt } = item;
      const inWindow = minutesUntilEruption >= -360 && minutesUntilEruption <= 36 * 60;

      let color = '#57534e';
      let size = 12;

      if (inWindow) {
        size = 22;
        color = '#3b82f6';
        if (minutesUntilEruption <= 0) {
          color = '#ef4444';
        } else if (minutesUntilEruption <= 30) {
          color = '#f97316';
        } else if (minutesUntilEruption <= 60) {
          color = '#eab308';
        }
      }

      const pulseClass = inWindow && minutesUntilEruption <= 0 ? 'animate-ping' : '';

      const iconHtml = `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2.5px solid #ffffff; font-size: 10px; font-weight: bold; color: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.4); position: relative">
        <span class="${pulseClass}" style="position: absolute; inset: -3px; border-radius: 50%; background-color: ${color}; opacity: 0.4;"></span>
        ${inWindow ? geyser.name[0] : ''}
      </div>`;

      const customIcon = L.divIcon({
        className: 'geyser-pin-marker',
        html: iconHtml,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const formattedTime = formatTimeWithDayLabel(prediction.predictedTime, use24Hour);
      const predictionLabel = inWindow
        ? `Predicted: ${formattedTime} (${minutesUntilEruption > 0 ? `in ${minutesUntilEruption}m` : 'Now'})`
        : 'No current visitor-window forecast';

      const popupContent = document.createElement('div');
      popupContent.className = 'text-stone-900 p-1 font-sans';
      popupContent.innerHTML = `
        <div style="font-weight: bold; font-size: 14px; color: #b45309;">${geyser.name}</div>
        <div style="font-size: 12px; color: #475569;">${geyser.basin}</div>
        <div style="margin-top: 6px; font-size: 13px; font-weight: bold;">
          🔥 ${predictionLabel}
        </div>
        <div style="font-size: 11px; margin-top: 4px; color: #0284c7;">
          🚶 Walk: ${walkRoute.durationMinutes} min (${walkRoute.distanceMiles} mi)
        </div>
        <div style="font-size: 11px; font-weight: bold; margin-top: 4px;">
          ${inWindow ? canMakeIt.label : geyser.area}
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1 px-2 rounded text-xs transition';
      btn.innerText = 'View Details';
      btn.onclick = () => onSelectGeyser(geyser.id);
      popupContent.appendChild(btn);

      const marker = L.marker([geyser.latitude, geyser.longitude], { icon: customIcon }).addTo(map);
      marker.bindPopup(popupContent);
      markersRef.current[geyser.id] = marker;

      // Draw polyline if selected
      if (selectedGeyserId === geyser.id) {
        marker.openPopup();
        const latlngs: L.LatLngExpression[] = [
          [userLat, userLon],
          [geyser.latitude, geyser.longitude],
        ];
        polylineRef.current = L.polyline(latlngs, {
          color: '#f59e0b',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.9,
        }).addTo(map);

        map.setView([geyser.latitude, geyser.longitude], 14);
      }
    });
  }, [items, userLat, userLon, selectedGeyserId, use24Hour, onSelectGeyser]);

  return (
    <div className="w-full h-[550px] sm:h-[650px] rounded-2xl overflow-hidden border border-stone-800 shadow-xl relative z-10">
      <div ref={mapContainerRef} className="w-full h-full" />
      {/* Legend Overlay */}
      <div className="absolute bottom-4 left-4 bg-stone-900/90 border border-stone-700 p-3 rounded-xl text-xs text-stone-200 z-[1000] shadow-lg backdrop-blur space-y-1">
        <div className="font-bold text-amber-400 mb-1">Geyser Forecast Legend</div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
          <span>Erupting now / overdue</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block"></span>
          <span>Erupting &lt;30m</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
          <span>Erupting &lt;60m</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
          <span>Erupting &gt;60m</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-stone-500 inline-block"></span>
          <span>Catalog (no current window)</span>
        </div>
        <div className="flex items-center space-x-2 pt-1 border-t border-stone-800">
          <span className="w-3 h-3 rounded-full bg-sky-600 border border-white inline-block"></span>
          <span>Your Location</span>
        </div>
      </div>
    </div>
  );
};
