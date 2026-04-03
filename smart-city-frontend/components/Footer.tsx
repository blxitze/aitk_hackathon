"use client";

import { ExternalLink, Moon, Sun } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import type { FooterProps } from "@/types";

export default function Footer({ theme, onToggleTheme }: FooterProps) {
  return (
    <footer
      className="mt-12 flex items-center justify-between border-t px-6 py-5"
      style={{
        backgroundColor: "var(--bg-surface)",
        borderColor: "var(--border)",
      }}
    >
      <div className="min-w-0 flex-1 pr-4">
        <p className="font-[family:var(--font-space-grotesk)] text-[13px] leading-snug text-[var(--text-secondary)]">
          Аналитическая система мониторинга города на основе ИИ
        </p>
        <p className="mt-1 font-[family:var(--font-space-grotesk)] text-[11px] leading-snug text-[var(--text-muted)]">
          Сделано командой Bed Action inc. · AITK HACKATHON
        </p>
      </div>

      <div className="flex shrink-0 justify-center px-4">
        <a
          href="https://github.com/blxitze/aitk_hackathon"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-[family:var(--font-space-grotesk)] text-[12px] text-[var(--text-secondary)] no-underline transition-colors duration-150 hover:text-[var(--text-primary)]"
        >
          <ExternalLink size={16} strokeWidth={2} aria-hidden />
          blxitze/aitk_hackathon
        </a>
      </div>

      <div className="flex min-w-0 flex-1 justify-end">
        <div
          className="flex rounded-[8px] border p-[3px]"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border)",
          }}
        >
          <ThemePillButton
            active={theme === "dark"}
            onClick={() => {
              if (theme !== "dark") onToggleTheme();
            }}
            icon={<Moon size={13} strokeWidth={2} aria-hidden />}
            label="Тёмная"
          />
          <ThemePillButton
            active={theme === "light"}
            onClick={() => {
              if (theme !== "light") onToggleTheme();
            }}
            icon={<Sun size={13} strokeWidth={2} aria-hidden />}
            label="Светлая"
            activeScheme="light"
          />
        </div>
      </div>
    </footer>
  );
}

function ThemePillButton({
  active,
  onClick,
  icon,
  label,
  activeScheme = "dark",
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  activeScheme?: "dark" | "light";
}) {
  const activeStyle: CSSProperties =
    activeScheme === "dark"
      ? { backgroundColor: "#0f2040", color: "var(--text-primary)" }
      : { backgroundColor: "#e2e8f0", color: "#0f172a" };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-[6px] border-none px-3 py-1.5 font-[family:var(--font-space-grotesk)] text-[12px] transition-all duration-150 ease-in-out ${
        active ? "" : "bg-transparent text-[var(--text-muted)]"
      }`}
      style={active ? activeStyle : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
