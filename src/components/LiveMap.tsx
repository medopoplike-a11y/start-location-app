"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// leaflet-rotate: يضيف دعم التدوير بإصبعين (مثل Google Maps) عن طريق تعديل L.Map
import 'leaflet-rotate';
import { vendorIcon, orderIcon, defaultIcon } from '@/lib/map-icons';

// ─── Tile Sources ─────────────────────────────────────────────────────────────
const TILES = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  satellite: "https://mt1.google.com/vt/lyrs=y,h,traffic&x={x}&y={y}&z={z}",
  traffic:   "https://mt1.google.com/vt/lyrs=m,h,traffic&x={x}&y={y}&z={z}",
};

// ─── Driver Icon ──────────────────────────────────────────────────────────────
// Admin mode: shows name, speed badge, direction arrow, pulse ring.
// Driver mode: simple clean dot — no labels, no clutter.
function makeDriverIcon(opts: {
  status?: string;
  isOnline?: boolean;
  heading?: number;
  speed?: number;
  name?: string;
  driverMode?: boolean;
}) {
  if (typeof window === 'undefined') return null;
  const { status, isOnline = true, heading = 0, speed = 0, name = '', driverMode = false } = opts;

  const busy      = status === 'busy';
  const moving    = speed > 0.5;
  const bg        = !isOnline ? '#94a3b8' : busy ? '#f59e0b' : '#10b981';
  const ringColor = !isOnline ? '#cbd5e1' : busy ? '#fbbf24' : '#34d399';

  if (driverMode) {
    // Minimal blue dot for "me" on driver's own screen
    return L.divIcon({
      html: `<div style="
        width:20px;height:20px;background:#3b82f6;border-radius:50%;
        border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,.5);
      "></div>`,
      className: '',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -14],
    });
  }

  const pulse = isOnline ? `
    <div style="position:absolute;inset:-7px;border-radius:50%;
      border:2px solid ${ringColor};opacity:.45;
      animation:mpulse 2s infinite;"></div>` : '';

  const arrow = moving ? `
    <div style="position:absolute;top:-13px;left:50%;
      transform:translateX(-50%) rotate(${heading}deg);
      width:0;height:0;
      border-left:5px solid transparent;
      border-right:5px solid transparent;
      border-bottom:10px solid ${bg};
      filter:drop-shadow(0 1px 2px rgba(0,0,0,.25));"></div>` : '';

  const speedBadge = moving && isOnline ? `
    <div style="position:absolute;top:-25px;left:50%;transform:translateX(-50%);
      background:${bg};color:white;font-size:8px;font-weight:900;
      padding:1px 5px;border-radius:20px;white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,.2);">
      ${Math.round(speed * 3.6)} km/h</div>` : '';

  const shortName = (name || '').split(' ')[0] || (name || '').slice(0, 8);
  const nameLabel = name ? `
    <div style="position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
      background:rgba(15,23,42,.92);color:white;font-size:10px;font-weight:900;
      padding:2px 8px;border-radius:12px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);
      z-index:100;">${name.length > 12 ? shortName : name}</div>` : '';

  return L.divIcon({
    html: `
      <style>@keyframes mpulse{0%,100%{transform:scale(1);opacity:.45}50%{transform:scale(1.45);opacity:.1}}</style>
      <div style="position:relative;width:44px;height:44px;">
        ${pulse}${arrow}${speedBadge}
        <div style="width:44px;height:44px;background:${bg};border-radius:50%;
          border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,.22);
          display:flex;align-items:center;justify-content:center;
          position:relative;z-index:1;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
            fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
            <circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>
          </svg>
        </div>
        ${nameLabel}
      </div>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -30],
  });
}

// Simple icons for vendor/order in driver mode (no labels, smaller)
const makeSimpleVendorIcon = () => typeof window === 'undefined' ? null : L.divIcon({
  html: `<div style="width:32px;height:32px;background:#4f46e5;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(79,70,229,.4);
    display:flex;align-items:center;justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

const makeSimpleOrderIcon = () => typeof window === 'undefined' ? null : L.divIcon({
  html: `<div style="width:28px;height:28px;background:#ef4444;border-radius:50%;
    border:3px solid white;box-shadow:0 2px 8px rgba(239,68,68,.4);
    display:flex;align-items:center;justify-content:center;">
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
      fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

// ─── Types ────────────────────────────────────────────────────────────────────
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
  navigationTarget?: { lat: number; lng: number } | null;
  /** وضع الطيار: خريطة نظيفة بدون مظاهر زائدة */
  driverMode?: boolean;
}

// ─── Routing Component ────────────────────────────────────────────────────────
function RoutingMachine({ target, userLoc }: { target: { lat: number; lng: number }, userLoc: [number, number] }) {
  const [route, setRoute] = useState<[number, number][]>([]);
  const map = useMap();

  useEffect(() => {
    if (!target || !userLoc) return;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${userLoc[1]},${userLoc[0]};${target.lng},${target.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoute(coords);
          
          // Fit map to show both points if not already following closely
          const bounds = L.latLngBounds([userLoc, [target.lat, target.lng]]);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
        }
      } catch (e) {
        console.error("Routing error:", e);
      }
    };

    fetchRoute();
  }, [target, userLoc, map]);

  if (route.length === 0) return null;

  return (
    <Polyline 
      positions={route} 
      color="#4f46e5" 
      weight={6} 
      opacity={0.8} 
      lineCap="round" 
      lineJoin="round"
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function relativeTime(ts?: number) {
  if (!ts || ts <= 0) return 'غير معروف';
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 10)    return 'الآن';
  if (d < 60)    return `منذ ${d} ث`;
  if (d < 3600)  return `منذ ${Math.floor(d / 60)} د`;
  if (d < 86400) return `منذ ${Math.floor(d / 3600)} س`;
  return `منذ ${Math.floor(d / 86400)} يوم`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MapWatcher({ onInteract }: { onInteract: () => void }) {
  const map = useMap();
  useMapEvents({
    dragstart: onInteract,
    zoomstart: onInteract,
  });
  useEffect(() => {
    const id = setInterval(() => map.invalidateSize(), 2000);
    return () => clearInterval(id);
  }, [map]);
  return null;
}

function SetView({ center, zoom, animate }: { center: [number, number]; zoom: number; animate: boolean }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      map.setView(center, zoom, { animate: false });
      first.current = false;
    } else if (animate) {
      map.flyTo(center, zoom, { animate: true, duration: 1.0 });
    }
  }, [center, zoom, animate, map]);
  return null;
}

function ZoomBtn() {
  const map = useMap();
  return (
    <div style={{
      position: 'absolute', bottom: '90px', right: '12px', zIndex: 1000,
      display: 'flex', flexDirection: 'column', gap: '2px',
    }}>
      {[
        { label: '+', action: () => map.zoomIn() },
        { label: '−', action: () => map.zoomOut() },
      ].map(({ label, action }) => (
        <button key={label} onClick={action} style={{
          width: '40px', height: '40px',
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '10px',
          fontSize: '22px', fontWeight: 900,
          color: 'var(--foreground)',
          boxShadow: 'var(--card-shadow)',
          cursor: 'pointer', lineHeight: 1,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>{label}</button>
      ))}
    </div>
  );
}

function RecenterBtn({ target, zoom }: { target: [number, number]; zoom: number }) {
  const map = useMap();
  return (
    <button
      onClick={() => map.flyTo(target, zoom, { animate: true, duration: 0.8 })}
      style={{
        position: 'absolute', bottom: '90px', left: '12px', zIndex: 1000,
        width: '44px', height: '44px',
        background: '#3b82f6',
        border: '3px solid white',
        borderRadius: '50%',
        color: 'white', fontSize: '18px',
        boxShadow: '0 3px 12px rgba(59,130,246,.45)',
        cursor: 'pointer', lineHeight: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      title="العودة لموقعي"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
        fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
      </svg>
    </button>
  );
}

// Smooth animated marker
function SmoothMarker({ point, icon, onClick }: {
  point: MapPoint;
  icon: L.DivIcon | L.Icon;
  onClick?: () => void;
}) {
  const [pos, setPos] = useState<[number, number]>([point.lat, point.lng]);
  const prev = useRef({ lat: point.lat, lng: point.lng });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (prev.current.lat === point.lat && prev.current.lng === point.lng) return;
    const sLat = prev.current.lat, sLng = prev.current.lng;
    const dLat = point.lat - sLat, dLng = point.lng - sLng;
    const dur = 700, t0 = performance.now();
    const run = (now: number) => {
      const t = Math.min((now - t0) / dur, 1);
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      setPos([sLat + dLat * e, sLng + dLng * e]);
      if (t < 1) frame.current = requestAnimationFrame(run);
      else { prev.current = { lat: point.lat, lng: point.lng }; frame.current = null; }
    };
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(run);
    return () => { if (frame.current) cancelAnimationFrame(frame.current); };
  }, [point.lat, point.lng]);

  return (
    <Marker
      position={pos}
      icon={icon}
      zIndexOffset={point.type === 'driver' ? 1000 : 100}
      eventHandlers={{ click: onClick ?? (() => {}) }}
    >
      <Popup closeButton={false}>
        <div style={{ direction: 'rtl', minWidth: '150px', padding: '8px', fontFamily: 'sans-serif' }}>
          <p style={{ fontWeight: 900, fontSize: '13px', color: '#0f172a', marginBottom: '4px' }}>{point.name}</p>
          {point.details && <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{point.details}</p>}
          {point.lastSeenTimestamp && (
            <p style={{ fontSize: '10px', color: '#94a3b8' }}>آخر ظهور: {relativeTime(point.lastSeenTimestamp)}</p>
          )}
          {point.speed != null && point.speed > 0.5 && (
            <p style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 800 }}>
              السرعة: {Math.round(point.speed * 3.6)} km/h
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Admin Controls (theme switcher + follow) ─────────────────────────────────
function AdminControls({
  theme,
  onTheme,
  following,
  onFollow,
  onlineCount,
  totalCount,
}: {
  theme: string;
  onTheme: (t: keyof typeof TILES) => void;
  following: boolean;
  onFollow: (v: boolean) => void;
  onlineCount: number;
  totalCount: number;
}) {
  return (
    <>
      {/* Theme buttons — top right */}
      <div style={{
        position: 'absolute', top: '12px', right: '12px', zIndex: 1000,
        background: 'var(--glass-bg)', backdropFilter: 'blur(8px)',
        borderRadius: '12px', overflow: 'hidden',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--card-shadow)',
      }}>
        {(Object.keys(TILES) as Array<keyof typeof TILES>).map(t => (
          <button key={t} onClick={() => onTheme(t)} style={{
            display: 'block', width: '100%',
            padding: '6px 14px',
            fontSize: '10px', fontWeight: 900,
            background: theme === t ? '#2563eb' : 'transparent',
            color: theme === t ? 'white' : 'var(--foreground)',
            border: 'none', cursor: 'pointer',
            borderBottom: '1px solid var(--glass-border)',
          }}>
            {t === 'standard' ? 'خريطة' : t === 'satellite' ? 'قمر' : 'مرور'}
          </button>
        ))}
      </div>

      {/* Driver count + follow — bottom left */}
      <div style={{
        position: 'absolute', bottom: '16px', left: '12px', zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        {totalCount > 0 && (
          <div style={{
            background: 'var(--glass-bg)', backdropFilter: 'blur(8px)',
            borderRadius: '20px', padding: '5px 12px',
            fontSize: '10px', fontWeight: 900, color: 'var(--foreground)',
            border: '1px solid var(--glass-border)',
            boxShadow: 'var(--card-shadow)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: onlineCount > 0 ? '#10b981' : '#cbd5e1',
              animation: onlineCount > 0 ? 'mpulse 2s infinite' : 'none',
              display: 'inline-block',
            }} />
            {onlineCount} متصل / {totalCount}
          </div>
        )}
        {totalCount > 0 && (
          <button onClick={() => onFollow(!following)} style={{
            padding: '7px 14px', borderRadius: '20px',
            fontSize: '10px', fontWeight: 900,
            background: following ? '#2563eb' : 'var(--glass-bg)',
            color: following ? 'white' : 'var(--foreground)',
            border: `1px solid ${following ? '#1d4ed8' : 'var(--glass-border)'}`,
            boxShadow: following ? '0 3px 10px rgba(37,99,235,.35)' : 'var(--card-shadow)',
            cursor: 'pointer', backdropFilter: 'blur(8px)',
          }}>
            {following ? '🔴 إيقاف المتابعة' : '📍 متابعة تلقائية'}
          </button>
        )}
      </div>
    </>
  );
}

// ─── Auto-Rotate Button (driver mode) ────────────────────────────────────────
function AutoRotateBtn({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: 'absolute', bottom: '148px', right: '12px', zIndex: 1000,
        width: '40px', height: '40px',
        background: active ? '#3b82f6' : 'var(--glass-bg)',
        border: active ? '2px solid #1d4ed8' : '1px solid var(--glass-border)',
        borderRadius: '10px',
        boxShadow: active ? '0 3px 12px rgba(59,130,246,.4)' : 'var(--card-shadow)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyCenter: 'center',
      }}
      title={active ? 'إيقاف التدوير التلقائي' : 'تدوير تلقائي حسب الاتجاه'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? 'white' : 'var(--foreground)'} strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L8 6h3v4a5 5 0 0 0 5 5h1"/>
        <path d="M16 18l4-4-4-4"/>
        <circle cx="12" cy="12" r="2" fill={active ? 'white' : 'var(--foreground)'} stroke="none"/>
      </svg>
    </button>
  );
}

// ─── Bearing / Compass Controls ──────────────────────────────────────────────

/** يطبّق الزاوية (bearing) على الخريطة ويعيّنها عند التغيير */
function BearingSync({ bearing }: { bearing: number }) {
  const map = useMap();
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const m = map as any;
    if (m.setBearing && prev.current !== bearing) {
      m.setBearing(bearing);
      prev.current = bearing;
    }
  }, [map, bearing]);
  return null;
}

/** زر البوصلة: يعرض اتجاه الشمال الحالي ويسمح بإعادة الضبط بالضغط */
function CompassBtn({ bearing, onReset }: { bearing: number; onReset: () => void }) {
  const map = useMap();
  const [currentBearing, setCurrentBearing] = useState(bearing);

  useEffect(() => {
    const m = map as any;
    const handler = () => {
      if (m.getBearing) setCurrentBearing(m.getBearing());
    };
    map.on('rotate', handler);
    return () => { map.off('rotate', handler); };
  }, [map]);

  // Only show when map is rotated
  if (Math.abs(currentBearing) < 2) return null;

  return (
    <button
      onClick={() => { onReset(); setCurrentBearing(0); }}
      style={{
        position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
        width: '42px', height: '42px',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: '50%',
        boxShadow: 'var(--card-shadow)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      title="إعادة ضبط الشمال"
    >
      <div style={{ 
        transform: `rotate(${-currentBearing}deg)`, 
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '12px solid #ef4444' }} />
        <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '12px solid var(--foreground)', opacity: 0.8 }} />
      </div>
    </button>
  );
}

/** في وضع الطيار: يتابع اتجاه حركته ويدوّر الخريطة تلقائياً عند التنقل */
function HeadingFollower({ heading, autoRotate }: { heading: number; autoRotate: boolean }) {
  const map = useMap();
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!autoRotate) return;
    const m = map as any;
    if (m.setBearing && Math.abs((prev.current ?? heading) - heading) > 3) {
      m.setBearing(heading, { animate: true, duration: 0.5 });
      prev.current = heading;
    }
  }, [map, heading, autoRotate]);
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LiveMap({
  drivers = [],
  vendors = [],
  orders = [],
  center = [30.1450, 31.6350],
  zoom = 13,
  className = 'h-[400px] w-full rounded-2xl overflow-hidden shadow-inner',
  isNavigating = false,
  navigationTarget = null,
  driverMode = false,
}: LiveMapProps) {
  const isMounted = typeof window !== 'undefined';
  const [theme, setTheme] = useState<keyof typeof TILES>('standard');
  const [following, setFollowing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bearing, setBearing] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (!isMounted) {
    return (
      <div className={className} style={{ background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '13px' }}>جاري تحميل الخريطة...</span>
      </div>
    );
  }

  const onlineDrivers  = drivers.filter(d => d.isOnline !== false && d.lat && d.lng);
  const offlineDrivers = drivers.filter(d => d.isOnline === false && d.lat && d.lng);
  const selected       = drivers.find(d => d.id === selectedId);

  // Map center logic
  const mapCenter: [number, number] = (() => {
    if (following) {
      if (selected?.lat)        return [selected.lat, selected.lng];
      if (onlineDrivers[0]?.lat) return [onlineDrivers[0].lat, onlineDrivers[0].lng];
    }
    return center;
  })();

  // In driver mode, first driver = "me" → use their location as recenter target
  const myLocation: [number, number] | null = driverMode && drivers[0]?.lat
    ? [drivers[0].lat, drivers[0].lng] : null;

  // Driver heading for auto-rotate
  const driverHeading = drivers[0]?.heading ?? 0;

  // Simple vendor/order icons for driver mode
  const simpleVendorIcon = driverMode ? (makeSimpleVendorIcon() ?? defaultIcon!) : null;
  const simpleOrderIcon  = driverMode ? (makeSimpleOrderIcon()  ?? defaultIcon!) : null;

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', background: '#e2e8f0' }}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        zoomControl={false}
        className="h-full w-full"
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        {...({ rotate: true, touchRotate: true } as any)}
      >
        <SetView center={mapCenter} zoom={driverMode ? zoom : (following ? 17 : zoom)} animate={following} />
        <MapWatcher onInteract={() => { setFollowing(false); if (autoRotate) setAutoRotate(false); }} />
        {/* تطبيق التدوير يدوياً عند تغيير bearing */}
        <BearingSync bearing={bearing} />
        {/* متابعة اتجاه الطيار في وضع التنقل */}
        {driverMode && <HeadingFollower heading={driverHeading} autoRotate={autoRotate} />}
        {/* زر البوصلة — يظهر فقط عند التدوير */}
        <CompassBtn bearing={bearing} onReset={() => setBearing(0)} />

        <TileLayer
          key={theme}
          attribution="© OpenStreetMap"
          url={TILES[theme]}
          maxZoom={21}
        />

        {/* ── Routing Path (Driver Mode) ── */}
        {driverMode && isNavigating && navigationTarget && myLocation && (
          <RoutingMachine target={navigationTarget} userLoc={myLocation} />
        )}

        {/* Paths (admin only) */}
        {!driverMode && drivers.map(d =>
          d.path && d.path.length > 1 ? (
            <Polyline
              key={`p-${d.id}`}
              positions={d.path.map(p => [p.lat, p.lng] as [number, number])}
              color={d.id === selectedId ? '#3b82f6' : d.status === 'busy' ? '#f59e0b' : '#10b981'}
              weight={d.id === selectedId ? 4 : 2.5}
              opacity={d.id === selectedId ? 0.8 : 0.4}
              dashArray={d.isOnline ? undefined : '6 8'}
            />
          ) : null
        )}

        {/* GPS accuracy ring for selected driver (admin only) */}
        {!driverMode && selected?.accuracy && selected.accuracy < 150 && (
          <Circle
            center={[selected.lat, selected.lng]}
            radius={selected.accuracy}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, weight: 1, dashArray: '4 4' }}
          />
        )}

        {/* Vendors */}
        {vendors.filter(v => v.lat && v.lng).map(v => (
          <SmoothMarker
            key={`v-${v.id}`}
            point={{ ...v, type: 'vendor' }}
            icon={driverMode ? (simpleVendorIcon ?? defaultIcon!) : (vendorIcon ?? defaultIcon!)}
          />
        ))}

        {/* Orders / customers */}
        {orders.filter(o => o.lat && o.lng).map(o => (
          <SmoothMarker
            key={`o-${o.id}`}
            point={{ ...o, type: 'order' }}
            icon={driverMode ? (simpleOrderIcon ?? defaultIcon!) : (orderIcon ?? defaultIcon!)}
          />
        ))}

        {/* Drivers */}
        {[...onlineDrivers, ...offlineDrivers].map(d => {
          const icon = makeDriverIcon({
            status: d.status,
            isOnline: d.isOnline !== false,
            heading: d.heading,
            speed: d.speed,
            name: d.name,
            driverMode,
          });
          return (
            <SmoothMarker
              key={`d-${d.id}`}
              point={{ ...d, type: 'driver' }}
              icon={icon ?? defaultIcon!}
              onClick={driverMode ? undefined : () => setSelectedId(id => id === d.id ? null : d.id)}
            />
          );
        })}

        {/* ── Driver mode HUD: zoom + recenter + auto-rotate ── */}
        {driverMode && (
          <>
            <ZoomBtn />
            {myLocation && <RecenterBtn target={myLocation} zoom={zoom} />}
            {/* زر التدوير التلقائي حسب اتجاه الحركة */}
            <AutoRotateBtn active={autoRotate} onToggle={() => setAutoRotate(v => !v)} />
          </>
        )}

        {/* ── Admin mode HUD ── */}
        {!driverMode && (
          <>
            {/* Custom zoom — top right, below theme */}
            <div style={{
              position: 'absolute', top: '130px', right: '12px', zIndex: 1000,
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <ZoomBtn />
            </div>
            <AdminControls
              theme={theme}
              onTheme={setTheme}
              following={following}
              onFollow={setFollowing}
              onlineCount={onlineDrivers.length}
              totalCount={drivers.length}
            />
          </>
        )}
      </MapContainer>

      {/* Selected driver info bar (admin only) */}
      {!driverMode && selected && (
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 1000,
          background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)',
          borderRadius: '16px', padding: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,.12)',
          border: '1px solid rgba(0,0,0,.08)',
          maxWidth: '190px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div>
              <p style={{ fontWeight: 900, fontSize: '13px', color: '#0f172a', marginBottom: '3px' }}>{selected.name}</p>
              <p style={{ fontSize: '10px', fontWeight: 700,
                color: selected.isOnline !== false ? '#10b981' : '#94a3b8' }}>
                {selected.isOnline !== false ? 'متصل الآن' : relativeTime(selected.lastSeenTimestamp)}
              </p>
            </div>
            <button onClick={() => setSelectedId(null)}
              style={{ color: '#cbd5e1', fontSize: '14px', fontWeight: 900, lineHeight: 1,
                background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          {selected.speed != null && selected.speed > 0.5 && (
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
              <span style={{ color: '#94a3b8' }}>السرعة</span>
              <span style={{ fontWeight: 900, color: '#3b82f6' }}>{Math.round(selected.speed * 3.6)} km/h</span>
            </div>
          )}
          <button onClick={() => setFollowing(true)} style={{
            marginTop: '8px', width: '100%', padding: '7px',
            background: '#2563eb', color: 'white',
            fontSize: '10px', fontWeight: 900, borderRadius: '10px',
            border: 'none', cursor: 'pointer',
          }}>📍 متابعة هذا الطيار</button>
        </div>
      )}
    </div>
  );
}
