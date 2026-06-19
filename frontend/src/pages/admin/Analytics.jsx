import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAnalyticsDashboard } from '../../api/client';
import PageHeader from '../../components/ui/PageHeader';

const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getAnalyticsDashboard().then(setData);
  }, []);

  if (!data) return null;

  const heatmapDays = data.busiest_days;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="30-day occupancy, utilization trends and desk performance"
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Occupancy Rate', value: `${data.occupancy_rate}%` },
          { label: 'Utilization (30d)', value: `${Math.round(data.occupancy_trend.reduce((s, d) => s + d.occupancy, 0) / 30)}%` },
          { label: 'Total Reservations', value: data.active_reservations },
          {
            label: 'Available Capacity',
            value: data.total_desks + data.total_rooms - data.active_reservations,
          },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{k.label}</p>
            <p className="text-3xl font-bold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold">Occupancy Over Time (30 days)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data.occupancy_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="occupancy" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Booking Activity by Day</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={heatmapDays}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Utilization by Floor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data.floor_utilization}
                dataKey="utilization"
                nameKey="floor"
                cx="50%"
                cy="50%"
                outerRadius={85}
                label={(props) => {
                  const entry = props.payload;
                  return `F${entry.floor ?? ''}: ${entry.utilization ?? 0}%`;
                }}
              >
                {data.floor_utilization.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Top Booked Desks</h3>
          <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Desk</th>
                <th className="pb-2">Bookings</th>
                <th className="pb-2">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.most_used_desks.map((d) => (
                <tr key={d.name} className="border-b border-slate-100">
                  <td className="py-2">{d.name}</td>
                  <td className="py-2">{d.bookings}</td>
                  <td className="py-2">{d.utilization}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Least Used Desks</h3>
          <div className="max-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2">Desk</th>
                <th className="pb-2">Bookings</th>
                <th className="pb-2">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {data.least_used_desks.map((d) => (
                <tr key={d.name} className="border-b border-slate-100">
                  <td className="py-2">{d.name}</td>
                  <td className="py-2">{d.bookings}</td>
                  <td className="py-2">{d.utilization}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );
}
