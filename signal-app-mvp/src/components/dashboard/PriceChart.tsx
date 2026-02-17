'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PriceChartProps {
  data: Array<{ date: string; price: number; sma9: number; sma21: number }>;
}

export function PriceChart({ data }: PriceChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="price" stroke="#3b82f6" name="Price" />
        <Line type="monotone" dataKey="sma9" stroke="#10b981" name="SMA 9" strokeDasharray="5 5" />
        <Line type="monotone" dataKey="sma21" stroke="#f59e0b" name="SMA 21" strokeDasharray="5 5" />
      </LineChart>
    </ResponsiveContainer>
  );
}
