"use client";

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { driverIcon, driverBusyIcon, vendorIcon, orderIcon } from '@/lib/map-icons';

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
  lastSeen?: string;
  type?: 'driver' | 'vendor' | 'order';
  status?: string;
  details?: string;
  isOnline?: boolean;
}

interface LiveMapProps {
  drivers?: MapPoint[];
  vendors?: MapPoint[];
  orders?: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
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
function AnimatedMarker({ point, icon }: { point: MapPoint, icon: L.DivIcon | L.Icon }) {
  const markerRef = useRef<L.Marker>(null);
  const prevPosRef = useRef<[number, number]>([point.lat, point.lng]);

  useEffect(() => {
    if (markerRef.current) {
      const marker = markerRef.current;
      const newPos: [number, number] = [point.lat, point.lng];
      
      if (newPos[0] !== prevPosRef.current[0] || newPos[1] !== prevPosRef.current[1]) {
        // Direct Leaflet DOM manipulation for ultra-smooth movement
        // This bypasses React's render cycle for the actual coordinate change
        marker.setLatLng(newPos);
        prevPosRef.current = newPos;
      }
    }
  }, [point.lat, point.lng]);

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

// Helper component to update map view when center changes
function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function LiveMap({ 
  drivers = [], 
  vendors = [],
  orders = [],
  center = [30.1450, 31.6350], // Default to El Shorouk City
  zoom = 13,
  className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner"
}: LiveMapProps) {
  const isMounted = typeof window !== 'undefined';

  if (!isMounted || !driverIcon) return <div className={className + " bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold"}>جاري تحميل الخريطة...</div>;

  return (
    <div className={className}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true}
        className="h-full w-full z-10"
      >
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
          <Marker 
            key={`order-${order.id}`} 
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
        ))}

        {/* عرض المناديب - Rendered last to be on top */}
        {drivers.filter(d => d.lat && d.lng).map((driver) => {
          let icon = driver.isOnline !== false ? (driver.status === 'busy' ? driverBusyIcon! : driverIcon!) : driverOfflineIcon!;
          return (
            <AnimatedMarker 
              key={`driver-${driver.id}`} 
              point={driver} 
              icon={icon} 
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
