"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import { driverIcon, driverBusyIcon, vendorIcon, orderIcon } from '@/lib/map-icons';

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen?: string;
  type?: 'driver' | 'vendor' | 'order';
  status?: string;
  details?: string;
}

interface LiveMapProps {
  drivers?: MapPoint[];
  vendors?: MapPoint[];
  orders?: MapPoint[];
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
        {drivers.filter(d => d.lat && d.lng).map((driver) => (
          <Marker 
            key={`driver-${driver.id}`} 
            position={[driver.lat!, driver.lng!]} 
            icon={driver.status === 'busy' ? driverBusyIcon! : driverIcon!}
            zIndexOffset={1000} // High z-index to stay on top
          >
            <Popup className="custom-popup">
              <div className="p-2 font-sans text-right min-w-[150px]" dir="rtl">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-black text-slate-900">{driver.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                    driver.status === 'busy' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  }`}>
                    {driver.status === 'busy' ? "في طلب" : "متاح"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    آخر ظهور: {driver.lastSeen || "الآن"}
                  </p>
                  {driver.details && (
                    <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      {driver.details}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
