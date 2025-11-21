// src/components/HomeCards.jsx
import React from "react";

// Composant Card
export function Card({ children }) {
  return (
    <div className="bg-(--card-bg-dark)/60 backdrop-blur rounded-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)] p-6">
      {children}
    </div>
  );
}

// StatCard
export function StatCard({ title, value, chip }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-sm text-white/60">{title}</span>
        {chip && (
          <span className="px-2 py-0.5 rounded-full text-xs bg-(--success-dark)/15 text-(--success-dark) border border-(--success-dark)/20">
            {chip}
          </span>
        )}
      </div>
      <div className="mt-3 text-3xl font-semibold">{value}</div>
      <div className="mt-4 h-8 w-full bg-white/5 rounded-xl overflow-hidden">
        <div className="h-full w-1/2 bg-(--primary-dark)/30" />
      </div>
    </Card>
  );
}

// Skeleton
export function Skeleton({ height = 180 }) {
  return (
    <div
      className="animate-pulse bg-white/5 rounded-xl"
      style={{ height: `${height}px` }}
    />
  );
}

// EmptyState
export function EmptyState({ label, small = false }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/5 ${
        small ? "p-4" : "p-6"
      }`}
    >
      <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
        <span className="opacity-70">ℹ️</span>
      </div>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}
