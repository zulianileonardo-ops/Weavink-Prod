"use client";
import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from '@/lib/translation/useTranslation';

/**
 * DashboardCharts - Display bar and pie charts for roadmap analytics
 * @param {Object} props
 * @param {Object} props.tree - Category tree object
 */
export default function DashboardCharts({ tree }) {
  const { t } = useTranslation();

  // Prepare bar chart data (top 10 categories by total items)
  const barChartData = useMemo(() => {
    if (!tree) return [];

    return Object.values(tree)
      .filter(cat => cat.stats.total > 0)
      .sort((a, b) => b.stats.total - a.stats.total)
      .slice(0, 10)
      .map(cat => ({
        name: cat.displayName,
        commits: cat.stats.commits,
        issues: cat.stats.issues,
      }));
  }, [tree]);

  // Prepare pie chart data (completed vs planned)
  const pieChartData = useMemo(() => {
    if (!tree) return [];

    let totalCommits = 0;
    let totalIssues = 0;

    Object.values(tree).forEach(cat => {
      totalCommits += cat.stats.commits;
      totalIssues += cat.stats.issues;
    });

    return [
      {
        name: t('roadmap.stats.completed', 'Completed'),
        value: totalCommits,
        color: '#3AE09A', // themeGreen
      },
      {
        name: t('roadmap.stats.planned', 'Planned'),
        value: totalIssues,
        color: '#3B82F6', // blue-500
      },
    ];
  }, [tree, t]);

  if (!tree) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8">
      {/* Bar Chart - Category Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('roadmap.charts.category_breakdown', 'Category Breakdown')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barChartData}>
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar
              dataKey="commits"
              name={t('roadmap.stats.completed', 'Completed')}
              fill="#3AE09A"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="issues"
              name={t('roadmap.stats.planned', 'Planned')}
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Chart - Completion Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('roadmap.charts.completion_overview', 'Completion Overview')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
