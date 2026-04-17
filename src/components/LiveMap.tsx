"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { vendorIcon, orderIcon, defaultIcon } from '@/lib/map-icons';

// ─── Map Tile Sources ────────────────────────────────────────────────────────
const MAP_THEMES = {
  standard: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    label: "خريطة",
    attribution: '© OpenStreetMap'
  },
  satellite: {
    url: "https://mt1.google.com/vt/lyrs=y,h,traffic&x={x}&y={y}&z={z}",
    label: "قمر",
    attribution: '© Google'
  },
  traffic: {
    url: "https://mt1.google.com/vt/lyrs=m,h,traffic&x={x}&y={y}&z={z}",
    label: "مرور",
    attribution: '© Google'
  }
};

// ─── Dynamic Driver Icon Generator ──────────────────────────────────────────
// Creates a custom icon per driver based on status, online state & heading.
const makeDriverIcon = (
  status: 'available' | 'busy' | string,
  isOnline: boolean,
  heading: number = 0,
  name: string = '',
  speed: number = 0
) => {
  if (typeof window === 'undefined') return null;

  const isMoving = speed > 0.5;
  const isAvailable = status !== 'busy';

  // Color palette
  const bgColor   = !isOnline ? '#94a3b8' : isAvailable ? '#10b981' : '#f59e0b';
  const ringColor = !isOnline ? '#cbd5e1' : isAvailable ? '#34d399' : '#fbbf24';
  const pulse     = isOnline ? `
    <div style="
      position:absolute;inset:-6px;border-radius:50%;
      border:2px solid ${ringColor};opacity:0.5;
      animation:map-pulse 2s infinite;
    "></div>` : '';

  // Direction arrow — only show when moving
  const arrow = isMoving ? `
    <div style="
      position:absolute;top:-14px;left:50%;transform:translateX(-50%) rotate(${heading}deg);
      width:0;height:0;
      border-left:5px solid transparent;
      border-right:5px solid transparent;
      border-bottom:10px solid ${bgColor};
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.3));
    "></div>` : '';

  // Speed badge
  const speedBadge = isMoving && isOnline ? `
    <div style="
      position:absolute;top:-26px;left:50%;transform:translateX(-50%);
      background:${bgColor};color:white;font-size:8px;font-weight:900;
      padding:1px 5px;border-radius:20px;white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,.25);
    ">${Math.round(speed * 3.6)} km/h</div>` : '';

  // Name label
  const shortName = name.split(' ')[0] || name;
  const nameLabel = `
    <div style="
      position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
      background:rgba(15,23,42,0.85);color:white;font-size:9px;font-weight:800;
      padding:2px 7px;border-radius:20px;white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.3);letter-spacing:.3px;
    ">${shortName}</div>`;

  const html = `
    <style>
      @keyframes map-pulse {
        0%   { transform: scale(1);   opacity:.5; }
        50%  { transform: scale(1.4); opacity:.15; }
        100% { transform: scale(1);   opacity:.5; }
      }
    </style>
    <div style="position:relative;width:44px;height:44px;">
      ${pulse}
      ${arrow}
      ${speedBadge}
      <div style="
        width:44px;height:44px;background:${bgColor};
        border-radius:50%;border:4px solid white;
        box-shadow:0 4px 12px rgba(0,0,0,.25);
        display:flex;align-items:center;justify-content:center;
        position:relative;z-index:1;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
        </svg>
      </div>
      ${nameLabel}
    </div>`;

  return L.divIcon({
    html,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -30],
  });
};

// ─── Interfaces ──────────────────────────────────────────────────────────────
export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  path?: Array<{lat: number; lng: number}>;
  lastSeen?: string;
  lastSeenTimestamp?: number;
  type?: 'driver' | 'vendor' | 'order';
  status?: string;
  details?: string;
  isOnline?: boolean;
  heading?: number;
  speed?: number;
  accuracy?: number;
}

interface LiveMapProps {
  drivers?: MapPoint[];
  vendors?: MapPoint[];
  orders?: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  autoCenterOnDrivers?: boolean;
  isNavigating?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getRelativeTime(timestamp?: number) {
  if (!timestamp || timestamp <= 0) return 'غير معروف';
  const diff = Math.floor((Date.now() - timestamp) / 1000);
  if (diff < 0)     return 'الآن';
  if (diff < 10)    return 'الآن';
  if (diff < 60)    return `منذ ${diff} ث`;
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} س`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// ─── Internal Components ─────────────────────────────────────────────────────
function MapInteractionTracker({ onInteraction }: { onInteraction: () => void }) {
  const map = useMap();
  useMapEvents({
    dragstart: onInteraction,
    zoomstart: onInteraction,
    touchstart: onInteraction,
  });
  useEffect(() => {
    const id = setInterval(() => map.invalidateSize(), 2000);
    return () => clearInterval(id);
  }, [map]);
  return null;
}

function AutoCenter({ center, zoom, follow }: { center: [number, number]; zoom: number; follow: boolean }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      map.setView(center, zoom, { animate: false });
      first.current = false;
    } else if (follow) {
      map.flyTo(center, zoom, { animate: true, duration: 1.2, easeLinearity: 0.3 });
    }
  }, [center, zoom, map, follow]);
  return null;
}

function ZoomToDriver({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 17, { animate: true, duration: 1.5 });
  }, [target, map]);
  return null;
}

// Smooth-moving marker with interpolation
function SmoothMarker({ point, icon, onClick }: {
  point: MapPoint;
  icon: L.DivIcon | L.Icon;
  onClick?: () => void;
}) {
  const [pos, setPos] = useState<[number, number]>([point.lat, point.lng]);
  const prev = useRef({ lat: point.lat, lng: point.lng });
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prev.current.lat === point.lat && prev.current.lng === point.lng) return;

    const startLat = prev.current.lat;
    const startLng = prev.current.lng;
    const dLat = point.lat - startLat;
    const dLng = point.lng - startLng;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setPos([startLat + dLat * ease, startLng + dLng * ease]);
      if (t < 1) frameRef.current = requestAnimationFrame(animate);
      else {
        prev.current = { lat: point.lat, lng: point.lng };
        frameRef.current = null;
      }
    };
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [point.lat, point.lng]);

  return (
    <Marker
      position={pos}
      icon={icon}
      zIndexOffset={point.type === 'driver' ? 1000 : 100}
      eventHandlers={{ click: onClick || (() => {}) }}
    >
      <Popup className="custom-popup" closeButton={false}>
        <div className="p-3 font-sans text-right min-w-[180px]" dir="rtl">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="font-black text-slate-900 text-sm leading-tight">{point.name}</p>
              {point.type === 'driver' && (
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-2 h-2 rounded-full ${point.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  <span className={`text-[10px] font-black ${point.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {point.isOnline ? 'متصل' : 'غير متصل'}
                  </span>
                </div>
              )}
            </div>
            {point.type === 'driver' && (
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${
                point.status === 'busy' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {point.status === 'busy' ? '📦 في طلب' : '✅ متاح'}
              </span>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100">
            {point.lastSeenTimestamp && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">آخر ظهور</span>
                <span className="font-bold text-slate-700">{getRelativeTime(point.lastSeenTimestamp)}</span>
              </div>
            )}
            {point.speed != null && point.speed > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">السرعة</span>
                <span className="font-bold text-blue-600">{Math.round(point.speed * 3.6)} km/h</span>
              </div>
            )}
            {point.accuracy != null && point.accuracy > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">دقة GPS</span>
                <span className={`font-bold ${point.accuracy < 20 ? 'text-emerald-600' : point.accuracy < 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  ±{Math.round(point.accuracy)}م
                </span>
              </div>
            )}
            {point.heading != null && point.heading > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">الاتجاه</span>
                <span className="font-bold text-slate-700">{Math.round(point.heading)}°</span>
              </div>
            )}
            {point.details && (
              <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-50">{point.details}</p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LiveMap({
  drivers = [],
  vendors = [],
  orders = [],
  center = [30.1450, 31.6350],
  zoom = 13,
  className = 'h-[400px] w-full rounded-2xl overflow-hidden shadow-inner',
  autoCenterOnDrivers = false,
}: LiveMapProps) {
  const isMounted = typeof window !== 'undefined';
  const [theme, setTheme] = useState<keyof typeof MAP_THEMES>('standard');
  const [following, setFollowing] = useState(autoCenterOnDrivers);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [showDriverList, setShowDriverList] = useState(false);
  const [, tick] = useState(0);

  // Re-render relative times every 30s
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const selectedDriver = drivers.find(d => d.id === selectedDriverId);
  const onlineDrivers  = drivers.filter(d => d.isOnline !== false && d.lat && d.lng);
  const offlineDrivers = drivers.filter(d => d.isOnline === false && d.lat && d.lng);

  // Dynamic center: follow selected driver or first online driver
  const mapCenter: [number, number] = (() => {
    if (following) {
      if (selectedDriver?.lat) return [selectedDriver.lat, selectedDriver.lng];
      if (onlineDrivers[0]?.lat) return [onlineDrivers[0].lat, onlineDrivers[0].lng];
    }
    return center;
  })();

  const handleDriverClick = useCallback((driver: MapPoint) => {
    setSelectedDriverId(prev => prev === driver.id ? null : driver.id);
    setFlyTarget([driver.lat, driver.lng]);
    setTimeout(() => setFlyTarget(null), 100);
    setFollowing(false);
  }, []);

  if (!isMounted) {
    return (
      <div className={`${className} bg-slate-100 flex items-center justify-center`}>
        <div className="text-slate-400 font-bold text-sm">جاري تحميل الخريطة...</div>
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-slate-100`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
      >
        <AutoCenter center={mapCenter} zoom={following ? 17 : zoom} follow={following} />
        <ZoomToDriver target={flyTarget} />
        <MapInteractionTracker onInteraction={() => { setFollowing(false); }} />

        <TileLayer
          key={theme}
          attribution={MAP_THEMES[theme].attribution}
          url={MAP_THEMES[theme].url}
          maxZoom={21}
        />

        {/* ── Driver Paths ── */}
        {drivers.map(d =>
          d.path && d.path.length > 1 ? (
            <Polyline
              key={`path-${d.id}`}
              positions={d.path.map(p => [p.lat, p.lng] as [number, number])}
              color={d.id === selectedDriverId ? '#3b82f6' : (d.status === 'busy' ? '#f59e0b' : '#10b981')}
              weight={d.id === selectedDriverId ? 4 : 2.5}
              opacity={d.id === selectedDriverId ? 0.85 : 0.45}
              dashArray={d.isOnline ? undefined : '6 8'}
            />
          ) : null
        )}

        {/* ── GPS Accuracy Circle for selected driver ── */}
        {selectedDriver?.accuracy && selectedDriver.accuracy > 0 && selectedDriver.accuracy < 200 && (
          <Circle
            center={[selectedDriver.lat, selectedDriver.lng]}
            radius={selectedDriver.accuracy}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.06, weight: 1, dashArray: '4 4' }}
          />
        )}

        {/* ── Vendors ── */}
        {vendors.filter(v => v.lat && v.lng).map(v => (
          <SmoothMarker key={`v-${v.id}`} point={{ ...v, type: 'vendor' }} icon={vendorIcon || defaultIcon!} />
        ))}

        {/* ── Orders ── */}
        {orders.filter(o => o.lat && o.lng).map(o => (
          <SmoothMarker key={`o-${o.id}`} point={{ ...o, type: 'order' }} icon={orderIcon || defaultIcon!} />
        ))}

        {/* ── Drivers (online first, then offline) ── */}
        {[...onlineDrivers, ...offlineDrivers].map(d => {
          const icon = makeDriverIcon(
            d.status || 'available',
            d.isOnline !== false,
            d.heading || 0,
            d.name,
            d.speed || 0
          );
          return (
            <SmoothMarker
              key={`d-${d.id}`}
              point={{ ...d, type: 'driver' }}
              icon={icon || defaultIcon!}
              onClick={() => handleDriverClick(d)}
            />
          );
        })}
      </MapContainer>

      {/* ── HUD: Top-right controls ── */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Zoom Controls */}
        <ZoomControl />

        {/* Theme Switcher */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {(Object.keys(MAP_THEMES) as Array<keyof typeof MAP_THEMES>).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`w-full px-3 py-1.5 text-[10px] font-black transition-colors ${
                theme === t
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {MAP_THEMES[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── HUD: Bottom-left — follow & driver list toggle ── */}
      <div className="absolute bottom-4 left-3 z-[1000] flex flex-col gap-2 items-start">
        {drivers.length > 0 && (
          <button
            onClick={() => setShowDriverList(s => !s)}
            className="flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 text-[10px] font-black text-slate-700 hover:bg-white transition-all"
          >
            <span className={`w-2 h-2 rounded-full ${onlineDrivers.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
            {onlineDrivers.length} متصل / {drivers.length}
          </button>
        )}

        {(selectedDriver || onlineDrivers.length > 0) && (
          <button
            onClick={() => {
              setFollowing(f => !f);
              setSelectedDriverId(null);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg border text-[10px] font-black transition-all ${
              following
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/30'
                : 'bg-white/90 backdrop-blur-md text-slate-700 border-slate-200 hover:bg-white'
            }`}
          >
            {following ? '🔴 إيقاف المتابعة' : '📍 متابعة تلقائية'}
          </button>
        )}
      </div>

      {/* ── Driver List Overlay ── */}
      {showDriverList && drivers.length > 0 && (
        <div className="absolute bottom-16 left-3 z-[1000] w-56 max-h-72 overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200">
          <div className="p-3 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">الطيارين</p>
          </div>
          <div className="divide-y divide-slate-50">
            {drivers.map(d => (
              <button
                key={d.id}
                onClick={() => {
                  handleDriverClick(d);
                  setShowDriverList(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-right hover:bg-slate-50 transition-colors ${
                  selectedDriverId === d.id ? 'bg-blue-50' : ''
                }`}
              >
                <span className={`shrink-0 w-2.5 h-2.5 rounded-full ${
                  d.isOnline !== false ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-900 truncate">{d.name}</p>
                  <p className={`text-[9px] font-bold truncate ${
                    d.isOnline !== false ? 'text-emerald-600' : 'text-slate-400'
                  }`}>
                    {d.isOnline !== false
                      ? (d.status === 'busy' ? '📦 في طلب' : '✅ متاح')
                      : `آخر ظهور: ${getRelativeTime(d.lastSeenTimestamp)}`}
                  </p>
                </div>
                {d.speed != null && d.speed > 0.5 && (
                  <span className="shrink-0 text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                    {Math.round(d.speed * 3.6)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Selected driver info bar ── */}
      {selectedDriver && (
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-3 max-w-[200px]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">{selectedDriver.name}</p>
              <p className={`text-[10px] font-bold mt-0.5 ${
                selectedDriver.isOnline !== false ? 'text-emerald-600' : 'text-slate-400'
              }`}>
                {selectedDriver.isOnline !== false ? 'متصل الآن' : getRelativeTime(selectedDriver.lastSeenTimestamp)}
              </p>
            </div>
            <button
              onClick={() => setSelectedDriverId(null)}
              className="text-slate-300 hover:text-slate-600 text-xs leading-none mt-0.5"
            >✕</button>
          </div>
          {selectedDriver.speed != null && selectedDriver.speed > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[9px] text-slate-400">السرعة</span>
              <span className="text-[10px] font-black text-blue-600">{Math.round(selectedDriver.speed * 3.6)} km/h</span>
            </div>
          )}
          <button
            onClick={() => { setFollowing(true); }}
            className="mt-2 w-full py-1.5 bg-blue-600 text-white text-[9px] font-black rounded-lg hover:bg-blue-700 transition-colors"
          >
            📍 متابعة هذا الطيار
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Custom Zoom Control ─────────────────────────────────────────────────────
function ZoomControl() {
  const map = useMap();
  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      <button
        onClick={() => map.zoomIn()}
        className="flex items-center justify-center w-8 h-8 text-slate-700 hover:bg-slate-50 text-lg font-black transition-colors border-b border-slate-100"
      >+</button>
      <button
        onClick={() => map.zoomOut()}
        className="flex items-center justify-center w-8 h-8 text-slate-700 hover:bg-slate-50 text-lg font-black transition-colors"
      >−</button>
    </div>
  );
}
