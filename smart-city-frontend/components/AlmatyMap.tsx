"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L, { type Layer } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
/** District clusters and scenario intensities: `lib/almatyDistricts.ts` */
import { DISTRICTS } from "@/lib/almatyDistricts";
import type { AlmatyMapProps, UiLanguage } from "@/types";

export { DISTRICTS } from "@/lib/almatyDistricts";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Leaflet = require("leaflet") as typeof L;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (Leaflet.Icon.Default.prototype as any)._getIconUrl;
  Leaflet.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

type LeafletWithHeat = typeof L & {
  heatLayer: (
    latlngs: [number, number, number][],
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
      gradient?: Record<number, string>;
    }
  ) => Layer;
};

function intensityColor(intensity: number): string {
  if (intensity >= 0.8) return "#ff4444";
  if (intensity >= 0.5) return "#f0a500";
  return "#00d47e";
}

const ALMATY_BOUNDS = {
  latMin: 43.15,
  latMax: 43.35,
  lngMin: 76.75,
  lngMax: 77.05,
} as const;

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Dense district clusters + city-wide background; ~300–800 points depending on random counts. */
function buildHeatmapPoints(scenario: string): [number, number, number][] {
  const points: [number, number, number][] = [];

  DISTRICTS.forEach((district) => {
    const raw = district.scenario_intensity[
      scenario as keyof (typeof district)["scenario_intensity"]
    ];
    const baseIntensity = raw ?? 0.3;
    const count = 40 + Math.floor(Math.random() * 21);
    const spread = 0.02 + Math.random() * 0.02;

    for (let i = 0; i < count; i++) {
      const lat =
        district.center[0] + (Math.random() - 0.5) * spread;
      const lng =
        district.center[1] + (Math.random() - 0.5) * spread;
      const intensity = clamp01(
        baseIntensity + (Math.random() - 0.5) * 0.15
      );
      points.push([lat, lng, intensity]);
    }
  });

  const bgCount = 150 + Math.floor(Math.random() * 101);
  for (let b = 0; b < bgCount; b++) {
    const lat =
      ALMATY_BOUNDS.latMin +
      Math.random() * (ALMATY_BOUNDS.latMax - ALMATY_BOUNDS.latMin);
    const lng =
      ALMATY_BOUNDS.lngMin +
      Math.random() * (ALMATY_BOUNDS.lngMax - ALMATY_BOUNDS.lngMin);
    const bgIntensity = 0.1 + Math.random() * 0.15;
    points.push([lat, lng, bgIntensity]);
  }

  return points;
}

function HeatmapLayer({ scenario }: { scenario: string }) {
  const map = useMap();
  const heatRef = useRef<Layer | null>(null);

  useEffect(() => {
    const points = buildHeatmapPoints(scenario);

    if (typeof window !== "undefined") {
      const w = window as Window & { L?: typeof L };
      w.L = L;
    }

    let cancelled = false;
    let rafId = 0;
    let layoutAttempts = 0;
    const maxLayoutAttempts = 120;

    const attachHeat = () => {
      if (cancelled) return;

      map.invalidateSize();
      const size = map.getSize();
      if (size.x < 2 || size.y < 2) {
        layoutAttempts += 1;
        if (layoutAttempts <= maxLayoutAttempts) {
          rafId = requestAnimationFrame(attachHeat);
        }
        return;
      }

      void import("leaflet.heat").then(() => {
        if (cancelled) return;

        const LHeat = L as LeafletWithHeat;

        if (heatRef.current) {
          map.removeLayer(heatRef.current);
          heatRef.current = null;
        }

        const heat = LHeat.heatLayer(points, {
          radius: 40,
          blur: 30,
          maxZoom: 17,
          max: 1.0,
          gradient: {
            0.1: "#1e293b",
            0.25: "#22c55e",
            0.5: "#f59e0b",
            0.75: "#ef4444",
            1.0: "#7f1d1d",
          },
        });

        heat.addTo(map);
        heatRef.current = heat;
      });
    };

    const onMapReady = () => {
      rafId = requestAnimationFrame(attachHeat);
    };

    map.whenReady(onMapReady);

    const onResize = () => {
      if (cancelled || !heatRef.current) return;
      map.invalidateSize();
      const size = map.getSize();
      if (size.x < 2 || size.y < 2) return;
      const layer = heatRef.current as Layer & { redraw?: () => void };
      layer.redraw?.();
    };
    map.on("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      map.off("resize", onResize);
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [scenario, map]);

  return null;
}

const TOOLTIP_LOAD: Record<UiLanguage, string> = {
  ru: "нагрузка",
  kz: "жүктеме",
};

function DistrictLabels({
  scenario,
  language,
}: {
  scenario: string;
  language: UiLanguage;
}) {
  const map = useMap();

  useEffect(() => {
    const markers: L.CircleMarker[] = [];

    DISTRICTS.forEach((district) => {
      const raw = district.scenario_intensity[
        scenario as keyof (typeof district)["scenario_intensity"]
      ];
      const intensity = raw ?? 0.3;
      const name = language === "kz" ? district.name_kz : district.name_ru;
      const color = intensityColor(intensity);

      const marker = L.circleMarker(
        [district.center[0], district.center[1]],
        {
          radius: 6,
          fillColor: color,
          color: "rgba(255,255,255,0.3)",
          weight: 1,
          fillOpacity: 0.9,
        }
      )
        .bindTooltip(
          `<div style="
          font-family: 'Space Grotesk', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #e8edf2;
          background: #0c1420;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 6px 10px;
          white-space: nowrap;
        ">
          ${name}<br/>
          <span style="font-family: JetBrains Mono, monospace; font-size: 11px; color: ${color};">
            ${Math.round(intensity * 100)}% ${TOOLTIP_LOAD[language]}
          </span>
        </div>`,
          {
            permanent: false,
            direction: "top",
            className: "custom-tooltip",
            opacity: 1,
          }
        )
        .addTo(map);

      markers.push(marker);
    });

    return () => {
      markers.forEach((m) => {
        map.removeLayer(m);
      });
    };
  }, [scenario, language, map]);

  return null;
}

export default function AlmatyMap({ scenario, language }: AlmatyMapProps) {
  return (
    <MapContainer
      center={[43.238, 76.945]}
      zoom={12}
      className="h-full w-full min-h-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-0"
      style={{ width: "100%", height: "100%", minHeight: 0, background: "#060a0f" }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
        maxZoom={19}
      />
      <HeatmapLayer scenario={scenario} />
      <DistrictLabels scenario={scenario} language={language} />
    </MapContainer>
  );
}
