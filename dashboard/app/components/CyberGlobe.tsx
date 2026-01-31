'use client';

import React, { useEffect, useState, useRef } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';

type SessionData = {
  id: string;
  lat: number;
  lng: number;
  status: string;
};

// Home Base Coordinates (San Francisco)
const HOME_BASE = { lat: 37.7749, lng: -122.4194 };

export default function CyberGlobe({ activeSessions }: { activeSessions: SessionData[] }) {
  const globeEl = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [arcs, setArcs] = useState<any[]>([]);
  const [points, setPoints] = useState<any[]>([]);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    // Transform sessions into globe data
    const newArcs = activeSessions.map(session => ({
      startLat: session.lat,
      startLng: session.lng,
      endLat: HOME_BASE.lat,
      endLng: HOME_BASE.lng,
      color: session.status === 'TARPIT'
        ? ['rgba(255, 51, 102, 0.8)', 'rgba(255, 51, 102, 0.3)']
        : session.status === 'INK'
          ? ['rgba(0, 170, 255, 0.8)', 'rgba(0, 170, 255, 0.3)']
          : ['rgba(0, 255, 136, 0.8)', 'rgba(0, 255, 136, 0.3)'],
      dashLength: session.status === 'TARPIT' ? 0.2 : 0.4,
      dashGap: 0.1,
      dashAnimateTime: session.status === 'TARPIT' ? 300 : session.status === 'IDLE' ? 2000 : 800,
    }));

    const newPoints = activeSessions.map(session => ({
      lat: session.lat,
      lng: session.lng,
      size: session.status === 'TARPIT' ? 0.8 : session.status === 'INK' ? 0.7 : 0.5,
      color: session.status === 'TARPIT'
        ? 'rgba(255, 51, 102, 1)'
        : session.status === 'INK'
          ? 'rgba(0, 170, 255, 1)'
          : 'rgba(0, 255, 136, 1)'
    }));

    // Add Home Base point (larger, white)
    newPoints.push({
      lat: HOME_BASE.lat,
      lng: HOME_BASE.lng,
      size: 1.0,
      color: 'rgba(255, 255, 255, 1)'
    });

    setArcs(newArcs);
    setPoints(newPoints);
  }, [activeSessions]);

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
      globeEl.current.controls().autoRotateSpeed = 0.3;
      globeEl.current.controls().enableZoom = true;
      globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });
    }
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        atmosphereColor="rgba(0, 255, 136, 0.3)"
        atmosphereAltitude={0.2}

        // Points (attack origins)
        pointsData={points}
        pointAltitude={0.02}
        pointColor="color"
        pointRadius="size"
        pointsMerge={false}

        // Arcs (attack paths)
        arcsData={arcs}
        arcColor="color"
        arcDashLength="dashLength"
        arcDashGap="dashGap"
        arcDashAnimateTime="dashAnimateTime"
        arcAltitude={0.25}
        arcStroke={0.6}

        // Rings at impact point
        ringsData={activeSessions.length > 0 ? [{ lat: HOME_BASE.lat, lng: HOME_BASE.lng }] : []}
        ringColor={() => 'rgba(0, 255, 136, 0.5)'}
        ringMaxRadius={3}
        ringPropagationSpeed={1}
        ringRepeatPeriod={1500}
      />
    </div>
  );
}
