import React, { useState } from 'react';
import NearbyClinicsMap from './NearbyClinicsMap';
import { MapPin } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export default function ClinicsTab() {
  const { t } = useSettings();
  
  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="w-6 h-6 text-emerald-600" />
        <h2 className="font-bold text-xl text-slate-900">Nearby Care</h2>
      </div>
      <p className="text-slate-600 text-sm mb-6">
        Find nearby hospitals, clinics, and pharmacies. Ensure location services are enabled on your device for accurate results.
      </p>
      
      <NearbyClinicsMap />
    </div>
  );
}
