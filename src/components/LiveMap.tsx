"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Navigation, Clock, Zap, Map as MapIcon, Layers } from 'lucide-react';

import { driverIcon, driverBusyIcon, vendorIcon, orderIcon, defaultIcon } from '@/lib/map-icons';

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

  useEffect(() => {
    if (!map) return;
    const interval = setInterval(() => {
      map.invalidateSize();
    }, 1000);
    return () => clearInterval(interval);
  }, [map]);

  return null;
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
  const [mapTheme] = useState<keyof typeof MAP_THEMES>('standard');
  
  if (!isMounted || !driverIcon) return <div className={className + " bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold"}>جاري تشغيل محرك الملاحة...</div>;

  return (
    <div className={`${className} relative group transition-all duration-300 overflow-hidden bg-slate-100`}>
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
          zoom={isFollowing ? 18 : zoom} 
          force={isFollowing} 
        />
        
        {/* Main Map Layer (v0.9.52 - Simplified) */}
        <TileLayer
          attribution='&copy; OpenStreetMap'
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
            icon={vendorIcon || defaultIcon!}
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
              icon={orderIcon || defaultIcon!}
              zIndexOffset={200}
            >
              <Popup className="custom-popup">
                <div className="p-2 font-sans text-right min-w-[150px]" dir="rtl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
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
          </div>
        ))}

        {/* عرض المناديب - Rendered last to be on top */}
        {drivers.filter(d => d.lat && d.lng).map((driver) => {
          let icon = driver.isOnline !== false ? (driver.status === 'busy' ? driverBusyIcon : driverIcon) : driverOfflineIcon;
          
          return (
            <Marker 
              key={`driver-${driver.id}`}
              position={[driver.lat, driver.lng]} 
              icon={icon || defaultIcon!}
              zIndexOffset={1000}
            >
              <Popup className="custom-popup">
                <div className="p-2 font-sans text-right min-w-[150px]" dir="rtl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <p className="font-black text-slate-900 leading-none">{driver.name}</p>
                      {driver.isOnline === false && (
                        <span className="text-[8px] text-red-500 font-bold mt-1">غير متصل حالياً</span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                      driver.status === 'busy' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                    }`}>
                      {driver.status === 'busy' ? "في طلب" : "متاح"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      آخر ظهور: <span className="font-bold text-slate-700">{getRelativeTime(driver.lastSeenTimestamp)}</span>
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Simplified Control Panel (v0.9.52) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3">
        <button 
          onClick={() => setIsFollowing(!isFollowing)}
          className={`p-4 rounded-[24px] shadow-2xl transition-all border flex items-center justify-center ${
            isFollowing 
            ? 'bg-blue-600 text-white border-blue-400 scale-110 shadow-blue-500/20' 
            : 'bg-white/90 backdrop-blur-md text-slate-600 border-white/20'
          }`}
          title={isFollowing ? "إيقاف التتبع" : "إعادة التمركز"}
        >
          <Navigation className={`w-6 h-6 ${isFollowing ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}
