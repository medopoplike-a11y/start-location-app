"use client";

import L from 'leaflet';

// Ensure this code runs only in the browser
let defaultIcon: L.Icon | null = null;
let driverIcon: L.DivIcon | null = null;
let driverBusyIcon: L.DivIcon | null = null;
let vendorIcon: L.DivIcon | null = null;
let orderIcon: L.DivIcon | null = null;

if (typeof window !== 'undefined') {
  defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  driverIcon = L.divIcon({
    html: `<div class="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
          </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  driverBusyIcon = L.divIcon({
    html: `<div class="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
          </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  vendorIcon = L.divIcon({
    html: `<div class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-store"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
          </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  orderIcon = L.divIcon({
    html: `<div class="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl transform -translate-x-1/2 -translate-y-1/2">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export { defaultIcon, driverIcon, driverBusyIcon, vendorIcon, orderIcon };
