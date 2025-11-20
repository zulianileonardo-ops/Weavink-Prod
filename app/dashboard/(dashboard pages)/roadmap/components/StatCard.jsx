"use client";
import React from 'react';

/**
 * StatCard - Display statistics with icon
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.label - Stat label
 * @param {string|number} props.value - Stat value
 * @param {string} props.color - Color variant (green, blue, gray, purple)
 */
export default function StatCard({ icon, label, value, color = 'gray' }) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const colorClass = colorClasses[color] || colorClasses.gray;

  return (
    <div className={`p-6 rounded-xl border ${colorClass} transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-center gap-2 mb-2">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
