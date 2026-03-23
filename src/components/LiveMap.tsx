"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = L.divIcon({
  html: `<div class="w-10 h-10 bg-brand-orange rounded-full flex items-center justify-center border-4 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

interface DriverLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen?: string;
}

interface LiveMapProps {
  drivers: DriverLocation[];
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
  drivers, 
  center = [30.0444, 31.2357], // Default to Cairo
  zoom = 13,
  className = "h-[400px] w-full rounded-2xl overflow-hidden shadow-inner"
}: LiveMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className={className + " bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold"}>جاري تحميل الخريطة...</div>;

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
        {drivers.map((driver) => (
          <Marker 
            key={driver.id} 
            position={[driver.lat, driver.lng]} 
            icon={driverIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 font-sans text-right" dir="rtl">
                <p className="font-bold text-gray-900">{driver.name}</p>
                <p className="text-[10px] text-gray-400">آخر ظهور: {driver.lastSeen || "الآن"}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
