'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const sgd = (v: number) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 }).format(v);
const compact = (v: number) => new Intl.NumberFormat('en-SG', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
const axis = { fontSize: 11, fill: '#72786f' };

export function SpendingChart({ data }: { data: Array<{ month: string; spent: number; refunded: number }> }) {
  return <div className="chart-box"><ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#e8e9e2" />
      <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
      <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={44} />
      <Tooltip formatter={(v) => sgd(Number(v))} cursor={{ fill: '#f6f6ef' }} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      <Bar dataKey="spent" name="Spent" fill="#315c43" radius={[4, 4, 0, 0]} />
      <Bar dataKey="refunded" name="Refunded" fill="#b8cfa6" radius={[4, 4, 0, 0]} />
    </BarChart>
  </ResponsiveContainer></div>;
}

export function NetWorthChart({ data }: { data: Array<{ date: string; cash: number; stocks: number; property: number }> }) {
  return <div className="chart-box"><ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#e8e9e2" />
      <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} />
      <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={48} />
      <Tooltip formatter={(v) => sgd(Number(v))} />
      <Legend wrapperStyle={{ fontSize: 11 }} />
      <Area type="monotone" dataKey="property" name="Property equity" stackId="1" stroke="#7a9c55" fill="#d8ef9b" />
      <Area type="monotone" dataKey="stocks" name="Stocks" stackId="1" stroke="#4a7a8c" fill="#cfe1e8" />
      <Area type="monotone" dataKey="cash" name="Cash" stackId="1" stroke="#315c43" fill="#a9c4a0" />
    </AreaChart>
  </ResponsiveContainer></div>;
}
