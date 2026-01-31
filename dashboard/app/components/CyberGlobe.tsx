'use client';

import React, { useEffect, useState, useRef } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';

type SessionData = {
  id: string;
  lat: number;
  lng: number;
  status: string;
};

// Home Base Coordinates (e.g., San Francisco)
const HOME_BASE = { lat: 37.7749, lng: -122.4194 };

export default function CyberGlobe({ activeSessions }: { activeSessions: SessionData[] }) {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const [arcs, setArcs] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);

  useEffect(() => {
    // Transform sessions into globe data
    const newArcs = activeSessions.map(session => ({
      startLat: session.lat,
      startLng: session.lng,
      endLat: HOME_BASE.lat,
      endLng: HOME_BASE.lng,
      color: session.status === 'TARPIT' ? ['red', 'red'] : 
             session.status === 'INK' ? ['blue', 'blue'] : 
             ['#00ff00', '#00ff00'],
      dashLength: 0.4,
      dashGap: 0.2,
      dashAnimateTime: session.status === 'IDLE' ? 2000 : 500, // Faster if attacking
    }));

    const newPoints = activeSessions.map(session => ({
      lat: session.lat,
      lng: session.lng,
      size: 0.5,
      color: session.status === 'TARPIT' ? 'red' : 
             session.status === 'INK' ? 'blue' : 'green'
    }));

    // Add Home Base point
    newPoints.push({
      lat: HOME_BASE.lat,
      lng: HOME_BASE.lng,
      size: 0.8,
      color: 'white'
    });

    setArcs(newArcs);
    setPoints(newPoints);
  }, [activeSessions]);

  useEffect(() => {
    // Auto-rotate
    if (globeEl.current) {
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.5;
        globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
    }
  }, []);

  return (
    <div className="w-full h-[400px] flex items-center justify-center overflow-hidden relative z-10">
      <Globe
        ref={globeEl}
        width={800}
        height={400}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        atmosphereColor="#00ff00"
        atmosphereAltitude={0.15}
        
        // Data Layers
        pointsData={points}
        pointAltitude={0.01}
        pointColor="color"
        pointRadius="size"
        pointPulseRing={true}

        arcsData={arcs}
        arcColor="color"
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashAnimateTime="dashAnimateTime"
        arcAltitude={0.3}
        arcStroke={0.5}
      />
      
      {/* Overlay Title */}
      <div className="absolute bottom-4 left-4 text-xs text-green-700 tracking-[0.3em] font-mono pointer-events-none">
         GEOSPATIAL THREAT VECTOR ANALYSIS //
      </div>
    </div>
  );
}
