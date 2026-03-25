"use client";

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { defaultIcon, driverIcon, vendorIcon } from '@/lib/map-icons';

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

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
            icon={vendorIcon!}
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
