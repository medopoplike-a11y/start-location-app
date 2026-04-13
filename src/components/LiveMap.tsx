"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Clock, Zap, Map as MapIcon, Layers } from 'lucide-react';

import { driverIcon, driverBusyIcon, vendorIcon, orderIcon } from '@/lib/map-icons';

// Advanced Technical Styles for "Real" Integrated Look (v0.9.47)
const MAP_THEMES = {
  standard: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  professional: "https://mt1.google.com/vt/lyrs=m,h,traffic&x={x}&y={y}&z={z}",
  satellite: "https://mt1.google.com/vt/lyrs=y,h,traffic&x={x}&y={y}&z={z}",
  terrain: "https://mt1.google.com/vt/lyrs=p,h,traffic&x={x}&y={y}&z={z}"
};

// Create a Gray Icon for offline drivers
const driverOfflineIcon = typeof window !== 'undefined' ? L.divIcon({
  html: `<div class="w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2 grayscale">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
}) : null;

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  path?: Array<{lat: number, lng: number}>;
  targetLat?: number;
  targetLng?: number;
  lastSeen?: string;
  lastSeenTimestamp?: number;
  type?: 'driver' | 'vendor' | 'order';
  status?: string;
  details?: string;
  isOnline?: boolean;
  heading?: number;
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

// Helper function for relative time
function getRelativeTime(timestamp?: number) {
  if (!timestamp) return "غير معروف";
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000);
  
  if (diff < 10) return "الآن";
  if (diff < 60) return `منذ ${diff} ثانية`;
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  return `منذ ${Math.floor(diff / 3600)} ساعة`;
}

// Helper component for smooth marker movement
function AnimatedMarker({ point, icon, mapRotation = 0, mapTilt = 0 }: { point: MapPoint, icon: L.DivIcon | L.Icon, mapRotation?: number, mapTilt?: number }) {
  const markerRef = useRef<L.Marker>(null);
  const animationRef = useRef<number>(0);
  const prevPosRef = useRef<[number, number]>([point.lat, point.lng]);
  const targetPosRef = useRef<[number, number]>([point.lat, point.lng]);
  const startTimeRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(0);
  const [duration, setDuration] = useState(2000);

  // Counter-rotate the marker icon to keep it upright
  useEffect(() => {
    if (markerRef.current) {
      const element = markerRef.current.getElement();
      if (element) {
        // Counter-rotate to stay upright regardless of map rotation/tilt
        // We use transition to match the map's rotation speed
        element.style.transition = 'transform 0.5s ease-in-out';
        element.style.transform = `rotateZ(${mapRotation}deg) rotateX(${-mapTilt}deg)`;
      }
    }
  }, [mapRotation, mapTilt]);

  useEffect(() => {
    if (markerRef.current) {
      const newPos: [number, number] = [point.lat, point.lng];
      
      if (newPos[0] !== targetPosRef.current[0] || newPos[1] !== targetPosRef.current[1]) {
        // Calculate dynamic duration based on update frequency
        const nowTs = point.lastSeenTimestamp || Date.now();
        if (prevTimestampRef.current > 0) {
          const diff = nowTs - prevTimestampRef.current;
          // Set duration to slightly less than update interval for smooth transition
          // but clamp it between 500ms and 5000ms
          setDuration(Math.max(500, Math.min(diff * 0.9, 5000)));
        }
        prevTimestampRef.current = nowTs;

        // Start new interpolation animation
        prevPosRef.current = [markerRef.current.getLatLng().lat, markerRef.current.getLatLng().lng];
        targetPosRef.current = newPos;
        startTimeRef.current = performance.now();

        const animate = (currentTime: number) => {
          const elapsed = currentTime - startTimeRef.current;
          const progress = Math.min(elapsed / duration, 1);
          
          // Smooth easing
          const easeProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

          if (markerRef.current) {
            const currentLat = prevPosRef.current[0] + (targetPosRef.current[0] - prevPosRef.current[0]) * easeProgress;
            const currentLng = prevPosRef.current[1] + (targetPosRef.current[1] - prevPosRef.current[1]) * easeProgress;
            markerRef.current.setLatLng([currentLat, currentLng]);
          }

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };

        cancelAnimationFrame(animationRef.current);
        animationRef.current = requestAnimationFrame(animate);
      }
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [point.lat, point.lng, duration]);

  const [displayTime, setRelativeTime] = useState(getRelativeTime(point.lastSeenTimestamp));

  // Update relative time ticker every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setRelativeTime(getRelativeTime(point.lastSeenTimestamp));
    }, 5000);
    return () => clearInterval(timer);
  }, [point.lastSeenTimestamp]);

  return (
    <Marker 
      ref={markerRef}
      position={[point.lat, point.lng]} 
      icon={icon}
      zIndexOffset={1000}
    >
      <Popup className="custom-popup">
        <div className="p-2 font-sans text-right min-w-[150px]" dir="rtl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col">
              <p className="font-black text-slate-900 leading-none">{point.name}</p>
              {point.isOnline === false && (
                <span className="text-[8px] text-red-500 font-bold mt-1">غير متصل حالياً</span>
              )}
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
              point.status === 'busy' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
            }`}>
              {point.status === 'busy' ? "في طلب" : "متاح"}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              آخر ظهور: <span className="font-bold text-slate-700">{displayTime}</span>
            </p>
            {point.details && (
              <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                {point.details}
              </p>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// New helper component for map event handling
function MapEvents({ onZoom, onInteraction }: { onZoom: (zoom: number) => void, onInteraction: () => void }) {
  const map = useMap();
  
  useMapEvents({
    zoomend: (e) => {
      onZoom(e.target.getZoom());
    },
    dragstart: () => {
      onInteraction();
    },
    zoomstart: () => {
      onInteraction();
    },
    touchstart: () => {
      onInteraction();
    },
    mousedown: () => {
      onInteraction();
    }
  });

  // TECHNICAL FIX: Auto-rotate map labels and adjust viewport correctly
  // This makes Leaflet feel more "Technical" and "Alive"
  useEffect(() => {
    if (!map) return;
    const interval = setInterval(() => {
      map.invalidateSize();
    }, 1000);
    return () => clearInterval(interval);
  }, [map]);

  return null;
}

// 1. New Component for Road-based Routing (OSRM)
function RoutingMachine({ from, to, color = '#3b82f6' }: { from: [number, number], to: [number, number], color?: string }) {
  const [route, setRoute] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!from[0] || !to[0]) return;

    const fetchRoute = async () => {
      try {
        // Use OSRM Public API for road-based routing
        const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoute(coords);
        }
      } catch (e) {
        console.warn("Routing failed, falling back to straight line", e);
        setRoute([from, to]);
      }
    };

    fetchRoute();
  }, [from[0], from[1], to[0], to[1]]);

  if (route.length === 0) return null;

  return (
    <Polyline 
      positions={route}
      pathOptions={{ 
        color, 
        weight: 5, 
        opacity: 0.7,
        lineJoin: 'round',
        dashArray: '1, 10' // Dot effect for navigation feel
      }}
    />
  );
}

// Helper component to update map view ONLY when explicitly requested or on first mount
function ChangeView({ center, zoom, force }: { center: [number, number]; zoom: number; force?: boolean }) {
  const map = useMap();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      map.setView(center, zoom, { animate: false });
      isFirstMount.current = false;
    } else if (force) {
      // Use flyTo for smoother "Google Maps" feel when following
      map.flyTo(center, zoom, {
        animate: true,
        duration: 1.5,
        easeLinearity: 0.25
      });
    }
  }, [center, zoom, map, force]);
  
  return null;
}

export default function LiveMap({ 
  drivers = [], 
  vendors = [],
  orders = [],
  center = [30.1450, 31.6350], // Default to El Shorouk City
  zoom = 13,
  className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner",
  autoCenterOnDrivers = false,
  isNavigating = false
}: LiveMapProps) {
  const isMounted = typeof window !== 'undefined';
  const [isFollowing, setIsFollowing] = useState(autoCenterOnDrivers);
  const [mapTheme, setMapTheme] = useState<keyof typeof MAP_THEMES>('professional');
  const [showTraffic, setShowTraffic] = useState(true);
  
  if (!isMounted || !driverIcon) return <div className={className + " bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold"}>جاري تحميل المحرك الذكي...</div>;

  return (
    <div className={`${className} relative group transition-all duration-300 overflow-hidden bg-slate-100`}>
      {/* 
          V0.9.47: Integrated "Real Map" Engine
          Using Direct Vector-like Tiles with Integrated Real-time Traffic.
      */}
      <div className="absolute inset-0">
        <MapContainer 
          center={center} 
          zoom={zoom} 
          scrollWheelZoom={true}
          zoomControl={false}
          className="h-full w-full z-10"
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
        >
          <ChangeView 
            center={center} 
            zoom={zoom} 
            force={isFollowing} 
          />
          
          {/* Main Map Layer (v0.9.47) */}
          <TileLayer
            attribution='&copy; Google Maps Data'
            url={MAP_THEMES[mapTheme]}
            maxZoom={20}
          />
          
          <MapEvents 
            onZoom={(z) => {}} 
            onInteraction={() => setIsFollowing(false)} 
          />

          {/* عرض المحلات */}
        {vendors.filter(v => v.lat && v.lng).map((vendor) => (
          <Marker 
            key={`vendor-${vendor.id}`} 
            position={[vendor.lat, vendor.lng]} 
            icon={vendorIcon!}
            zIndexOffset={100}
          >
            <Popup className="custom-popup">
              <div className="p-2 font-sans text-right min-w-[150px]" dir="rtl">
                <p className="font-black text-indigo-600 mb-1">{vendor.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-2">محل شريك</p>
                {vendor.details && (
                  <p className="text-[10px] text-slate-600 bg-indigo-50/50 p-1.5 rounded-lg border border-indigo-100">
                    {vendor.details}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* عرض الطلبات النشطة */}
        {orders.filter(o => o.lat && o.lng).map((order) => (
          <div key={`order-group-${order.id}`}>
            <Marker 
              position={[order.lat, order.lng]} 
              icon={orderIcon!}
              zIndexOffset={200}
            >
              <Popup className="custom-popup">
                <div className="p-2 font-sans text-right min-w-[150px]" dir="rtl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <p className="font-black text-rose-600">طلب: {order.name}</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 mb-2">{order.status}</p>
                  {order.details && (
                    <p className="text-[10px] text-slate-600 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100">
                      {order.details}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            
            {/* Draw road-based route to target if available */}
            {order.targetLat && order.targetLng && (
              <RoutingMachine 
                from={[order.lat, order.lng]} 
                to={[order.targetLat, order.targetLng]} 
                color="#f43f5e" 
              />
            )}
          </div>
        ))}

          {/* عرض المناديب - Rendered last to be on top */}
        {drivers.filter(d => d.lat && d.lng).map((driver) => {
          let icon = driver.isOnline !== false ? (driver.status === 'busy' ? driverBusyIcon! : driverIcon!) : driverOfflineIcon!;
          return (
            <div key={`driver-group-${driver.id}`}>
              <AnimatedMarker 
                point={driver} 
                icon={icon} 
              />
              
              {/* Draw road-based route for active driver if they have a target */}
              {driver.targetLat && driver.targetLng && (
                <RoutingMachine 
                  from={[driver.lat, driver.lng]} 
                  to={[driver.targetLat, driver.targetLng]} 
                  color={driver.status === 'busy' ? '#f59e0b' : '#10b981'} 
                />
              )}

              {/* Draw movement trail (Breadcrumbs) - V0.9.9 */}
              {driver.path && driver.path.length > 1 && (
                <Polyline 
                  positions={driver.path.map(p => [p.lat, p.lng] as [number, number])}
                  pathOptions={{ 
                    color: driver.status === 'busy' ? '#f59e0b' : '#10b981', 
                    weight: 2,
                    opacity: 0.4,
                    smoothFactor: 1
                  }}
                />
              )}
            </div>
          );
        })}
        </MapContainer>
      </div>

      {/* Smart Control Panel (v0.9.47) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
        {/* Recenter Button */}
        <button 
          onClick={() => setIsFollowing(true)}
          className={`p-4 rounded-[24px] shadow-2xl transition-all border flex items-center justify-center ${
            isFollowing 
            ? 'bg-blue-600 text-white border-blue-400 scale-110' 
            : 'bg-white/90 backdrop-blur-md text-slate-600 border-white/20'
          }`}
          title={isFollowing ? "إيقاف التتبع" : "إعادة التمركز"}
        >
          <Navigation className={`w-6 h-6 ${isFollowing ? 'fill-current' : ''}`} />
        </button>

        {/* Theme Toggle Button */}
        <div className="bg-white/90 backdrop-blur-md rounded-[24px] shadow-2xl border border-white/20 overflow-hidden flex flex-col">
          <button 
            onClick={() => setMapTheme('professional')}
            className={`p-4 transition-colors ${mapTheme === 'professional' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            title="خريطة احترافية"
          >
            <MapIcon className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setMapTheme('satellite')}
            className={`p-4 transition-colors border-t border-slate-100 ${mapTheme === 'satellite' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            title="قمر صناعي"
          >
            <Layers className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setMapTheme('standard')}
            className={`p-4 transition-colors border-t border-slate-100 ${mapTheme === 'standard' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            title="خريطة كلاسيكية"
          >
            <Zap className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
