'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { formatINR } from '@/lib/currency';

const CHART_COLORS = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#ef4444', // red
  '#64748b', // slate
];

interface SpendingTrendChartProps {
  data: { date: string; amount: number; income?: number }[];
  onBarClick?: (date: string) => void;
}

export function SpendingTrendChart({ data, onBarClick }: SpendingTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400">
        No spending data for this period
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.date.length > 5 ? d.date.slice(5) : d.date,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={formattedData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onClick={(e: any) => {
            if (e && e.activePayload && e.activePayload[0] && onBarClick) {
              onBarClick(e.activePayload[0].payload.date);
            }
          }}
        >
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="displayDate"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              borderColor: '#374151',
              borderRadius: '0.75rem',
              color: '#f9fafb',
              fontSize: '12px',
            }}
            formatter={(value: any, name: any) => [
              formatINR(Number(value) || 0),
              name === 'amount' ? 'Expense' : 'Income',
            ]}
          />
          <Legend
            verticalAlign="top"
            height={36}
            formatter={(val) => (val === 'amount' ? 'Expense' : 'Income')}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#expenseGradient)"
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="4 4"
            fillOpacity={1}
            fill="url(#incomeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CategoryPieChartProps {
  data: { category: string; amount: number; percentage: number }[];
  onSelectCategory?: (category: string) => void;
}

export function CategoryPieChart({ data, onSelectCategory }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400">
        No expense transactions to categorize
      </div>
    );
  }

  const topCategories = data.slice(0, 7);
  const remaining = data.slice(7);
  if (remaining.length > 0) {
    const otherSum = remaining.reduce((acc, curr) => acc + curr.amount, 0);
    const otherPct = remaining.reduce((acc, curr) => acc + curr.percentage, 0);
    topCategories.push({
      category: 'Other Categories',
      amount: otherSum,
      percentage: Math.round(otherPct * 10) / 10,
    });
  }

  return (
    <div className="h-72 w-full flex flex-col md:flex-row items-center justify-between">
      <div className="h-full w-full md:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={topCategories}
              dataKey="amount"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              onClick={(entry: any) => {
                if (onSelectCategory && entry && entry.category) {
                  onSelectCategory(entry.category);
                }
              }}
            >
              {topCategories.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  className="cursor-pointer transition-opacity hover:opacity-80"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                borderRadius: '0.75rem',
                color: '#f9fafb',
                fontSize: '12px',
              }}
              formatter={(val: any, name: any, item: any) => [
                `${formatINR(Number(val) || 0)} (${item.payload.percentage}%)`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full md:w-1/2 max-h-56 overflow-y-auto space-y-1.5 pr-2">
        {topCategories.map((item, idx) => (
          <div
            key={item.category}
            onClick={() => onSelectCategory && onSelectCategory(item.category)}
            className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <div className="flex items-center space-x-2 truncate">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {item.category}
              </span>
            </div>
            <div className="font-semibold text-gray-900 dark:text-white shrink-0 ml-2">
              {formatINR(item.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BankBarChartProps {
  data: { bank: string; amount: number; percentage: number }[];
  onSelectBank?: (bank: string) => void;
}

export function BankBarChart({ data, onSelectBank }: BankBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400">
        No bank data available
      </div>
    );
  }

  const topBanks = data.slice(0, 6);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={topBanks}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          onClick={(e: any) => {
            if (e && e.activePayload && e.activePayload[0] && onSelectBank) {
              onSelectBank(e.activePayload[0].payload.bank);
            }
          }}
        >
          <XAxis
            type="number"
            stroke="#94a3b8"
            fontSize={11}
            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="bank"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              borderColor: '#374151',
              borderRadius: '0.75rem',
              color: '#f9fafb',
              fontSize: '12px',
            }}
            formatter={(val: any) => [formatINR(Number(val) || 0), 'Expenditure']}
          />
          <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
            {topBanks.map((entry, index) => (
              <Cell
                key={`bank-cell-${index}`}
                fill={CHART_COLORS[(index + 1) % CHART_COLORS.length]}
                className="cursor-pointer hover:opacity-85"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PaymentMethodBarChartProps {
  data: { method: string; amount: number; percentage: number }[];
  onSelectMethod?: (method: string) => void;
}

export function PaymentMethodBarChart({ data, onSelectMethod }: PaymentMethodBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400">
        No payment method breakdown available
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          onClick={(e: any) => {
            if (e && e.activePayload && e.activePayload[0] && onSelectMethod) {
              onSelectMethod(e.activePayload[0].payload.method);
            }
          }}
        >
          <XAxis
            dataKey="method"
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              borderColor: '#374151',
              borderRadius: '0.75rem',
              color: '#f9fafb',
              fontSize: '12px',
            }}
            formatter={(val: any, name: any, item: any) => [
              `${formatINR(Number(val) || 0)} (${item.payload.percentage}%)`,
              'Total',
            ]}
          />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`pm-cell-${index}`}
                fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]}
                className="cursor-pointer hover:opacity-80"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
