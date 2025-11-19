import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CategoryTree, CategoryNode } from '../types';
import { CATEGORY_CONFIG } from '../constants';

interface Props {
  tree: CategoryTree;
}

export const DashboardCharts: React.FC<Props> = ({ tree }) => {
  const data = (Object.values(tree) as CategoryNode[]).map(node => ({
    name: CATEGORY_CONFIG[node.name].displayName,
    commits: node.stats.commits,
    issues: node.stats.issues,
    total: node.stats.total
  })).sort((a, b) => b.total - a.total).slice(0, 7); // Top 7 categories

  const pieData = [
     { name: 'Completed', value: (Object.values(tree) as CategoryNode[]).reduce((acc, node) => acc + node.stats.commits, 0), color: '#22c55e' },
     { name: 'Planned', value: (Object.values(tree) as CategoryNode[]).reduce((acc, node) => acc + node.stats.issues, 0), color: '#3b82f6' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity by Category</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                cursor={{fill: '#f8fafc'}}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="commits" name="Completed (Commits)" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="issues" name="Planned (Issues)" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Overall Progress</h3>
        <div className="h-64 w-full flex flex-col items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
             </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};