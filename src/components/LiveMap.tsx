"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Move icons into a function or useMemo to ensure L is only accessed in browser
const getIcons = () => {
  if (typeof window === 'undefined') return { defaultIcon: null, driverIcon: null };
  
  const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  const driverIcon = L.divIcon({
    html: `<div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
          </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const vendorIcon = L.divIcon({
    html: `<div class="w-10 h-10 bg-brand-red rounded-full flex items-center justify-center border-4 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
          </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return { defaultIcon, driverIcon, vendorIcon };
};

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen?: string;
  type?: 'driver' | 'vendor';
  details?: string;
}

interface LiveMapProps {
  drivers?: MapPoint[];
  vendors?: MapPoint[];
  center?: [number, number];
  zoom?: number;
  className?: string;
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
  center = [30.0444, 31.2357], // Default to Cairo
  zoom = 13,
  className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner"
}: LiveMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const icons = useMemo(() => getIcons(), []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !icons.driverIcon) return <div className={className + " bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold"}>جاري تحميل الخريطة...</div>;

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
        {/* عرض الطيارين */}
        {drivers.filter(d => d.lat && d.lng).map((driver) => (
          <Marker 
            key={`driver-${driver.id}`} 
            position={[driver.lat!, driver.lng!]} 
            icon={icons.driverIcon!}
          >
            <Popup className="custom-popup">
              <div className="p-1 font-sans text-right" dir="rtl">
                <p className="font-bold text-blue-600">{driver.name}</p>
                <p className="text-[10px] text-gray-400">آخر ظهور: {driver.lastSeen || "الآن"}</p>
                {driver.details && <p className="text-[10px] text-gray-600 mt-1">{driver.details}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* عرض المطاعم / الطلبات */}
        {vendors.map((vendor) => (
          <Marker 
            key={`vendor-${vendor.id}`} 
            position={[vendor.lat, vendor.lng]} 
            icon={icons.vendorIcon!}
          >
            <Popup className="custom-popup">
              <div className="p-1 font-sans text-right" dir="rtl">
                <p className="font-bold text-brand-red">{vendor.name}</p>
                {vendor.details && <p className="text-[10px] text-gray-600 mt-1">{vendor.details}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
