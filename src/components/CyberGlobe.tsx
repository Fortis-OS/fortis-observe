"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import { MeshPhongMaterial } from "three";

// Frost palette for the globe
const ACCENT = "#F21D43";
const INK = "rgba(242, 242, 245, 0.85)";

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "US": [37.0902, -95.7129],
  "IN": [20.5937, 78.9629],
  "CN": [35.8617, 104.1954],
  "JP": [36.2048, 138.2529],
  "GB": [55.3781, -3.4360],
  "DE": [51.1657, 10.4515],
  "FR": [46.2276, 2.2137],
  "BR": [-14.2350, -51.9253],
  "AU": [-25.2744, 133.7751],
  "CA": [56.1304, -106.3468],
  "RU": [61.5240, 105.3188],
  "SG": [1.3521, 103.8198],
  "NL": [52.1326, 5.2913],
  "IE": [53.1424, -7.6921],
  "TZ": [-6.3690, 34.8888],
  "PK": [30.3753, 69.3451],
  "IR": [32.4279, 53.6880],
  "ID": [-0.7893, 113.9213],
  "BE": [50.5039, 4.4699],
  "MX": [23.6345, -102.5528],
  "CM": [7.3697, 12.3547],
  "AT": [47.5162, 14.5501],
  "KE": [-0.0236, 37.9062],
  "ZA": [-30.5595, 22.9375],
  "NG": [9.0820, 8.6753],
  "EG": [26.8206, 30.8025],
  "TR": [38.9637, 35.2433],
  "SA": [23.8859, 45.0792],
  "IT": [41.8719, 12.5674],
  "ES": [40.4637, -3.7492],
  "KR": [35.9078, 127.7669],
  "MY": [4.2105, 101.9758],
  "PH": [12.8797, 121.7740],
  "TH": [15.8700, 100.9925],
  "VN": [14.0583, 108.2772],
  "PL": [51.9194, 19.1451],
  "Unknown": [0, 0]
};

// User's Node IP Coordinates (Roughly India based on IP)
const MY_LAT = 12.366605;
const MY_LNG = 76.687614;

export default function CyberGlobe({ activeSessions = [] }: { activeSessions?: any[] }) {
  const globeEl = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [arcsData, setArcsData] = useState([]);
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 500, height: 500 });

  // An obsidian sphere instead of the blue night-earth photo
  const globeMaterial = useMemo(
    () => new MeshPhongMaterial({ color: "#121216", emissive: "#060608", shininess: 6, specular: "#2a1016" }),
    []
  );
  // A pulsing red ring at the hosting node
  const rings = useMemo(() => [{ lat: MY_LAT, lng: MY_LNG }], []);

  useEffect(() => {
    // 1. Fetch GeoJSON for country borders
    fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(setCountries);

    // 2. Generate arcs from User Node to all Session IPs
    const arcs = activeSessions.map(session => {
        let lat = session.latitude;
        let lng = session.longitude;

        if (lat == null || lng == null) {
            const country = session.country || "Unknown";
            if (country === "Unknown" || !COUNTRY_COORDS[country] || COUNTRY_COORDS[country][0] === 0) {
                return null;
            }
            const coords = COUNTRY_COORDS[country];
            // Add slight random jitter to coordinates so arcs don't perfectly overlap if they are from the same country
            lat = coords[0] + (Math.random() - 0.5) * 4;
            lng = coords[1] + (Math.random() - 0.5) * 4;
        }

        return {
            startLat: MY_LAT,
            startLng: MY_LNG,
            endLat: lat,
            endLng: lng,
            // two series, like every Frost chart: red and white
            color: Math.random() < 0.6 ? [ACCENT, 'rgba(242,29,67,0.25)'] : [INK, 'rgba(242,242,245,0.2)'],
            ip: session.ip_address
        };
    }).filter(arc => arc !== null);

    setArcsData(arcs as any);

    if (globeEl.current) {
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.5;
        globeEl.current.pointOfView({ lat: MY_LAT, lng: MY_LNG, altitude: 2 });
    }
  }, [activeSessions]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex items-center justify-center w-full h-full cursor-move min-h-[350px]">
        {dimensions.width > 0 && (
            <Globe
                ref={globeEl}
                globeImageUrl={null}
                globeMaterial={globeMaterial}
                backgroundColor="rgba(0,0,0,0)"
                atmosphereColor={ACCENT}
                atmosphereAltitude={0.14}

                // Land as a faint dot grid
                hexPolygonsData={countries.features}
                hexPolygonResolution={3}
                hexPolygonMargin={0.62}
                hexPolygonColor={() => 'rgba(242, 242, 245, 0.30)'}

                // Hairline country borders in Frost red
                polygonsData={countries.features}
                polygonAltitude={0.006}
                polygonCapColor={() => 'rgba(0,0,0,0)'}
                polygonSideColor={() => 'rgba(0,0,0,0)'}
                polygonStrokeColor={() => 'rgba(242, 29, 67, 0.7)'}

                // Visitor endpoints
                pointsData={arcsData}
                pointLat="endLat"
                pointLng="endLng"
                pointColor={() => ACCENT}
                pointAltitude={0.01}
                pointRadius={0.28}

                // Connection arcs
                arcsData={arcsData}
                arcColor="color"
                arcDashLength={0.4}
                arcDashGap={0.15}
                arcDashAnimateTime={2200}
                arcStroke={0.35}

                // Hosting node
                ringsData={rings}
                ringColor={() => (t: number) => `rgba(242, 29, 67, ${1 - t})`}
                ringMaxRadius={4}
                ringPropagationSpeed={2}
                ringRepeatPeriod={1400}

                width={dimensions.width}
                height={dimensions.height}
            />
        )}
    </div>
  );
}
