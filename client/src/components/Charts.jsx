/** Data visualisation components (Chart.js via react-chartjs-2). */
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);

export const COLORS = {
  navy: '#13315c', orange: '#f77f00', green: '#198754', red: '#dc3545', gray: '#6c757d', blue: '#0d6efd', teal: '#20c997',
  palette: ['#13315c', '#f77f00', '#198754', '#dc3545', '#0d6efd', '#6f42c1', '#20c997', '#6c757d'],
};

export function BarChart({ labels, values, label, color = COLORS.navy, horizontal = false, height = 260, max, datasets }) {
  const data = {
    labels,
    datasets: datasets
      ? datasets.map((d, i) => ({ backgroundColor: COLORS.palette[i], borderRadius: 4, ...d }))
      : [{ label, data: values, backgroundColor: color, borderRadius: 4 }],
  };
  return (
    <div style={{ height }}>
      <Bar
        data={data}
        options={{
          maintainAspectRatio: false,
          indexAxis: horizontal ? 'y' : 'x',
          plugins: { legend: { display: !!datasets, position: 'bottom' } },
          scales: { [horizontal ? 'x' : 'y']: { beginAtZero: true, ...(max ? { max } : {}), ticks: { precision: 0 } } },
        }}
      />
    </div>
  );
}

export function DoughnutChart({ labels, values, colors = COLORS.palette, height = 260 }) {
  return (
    <div style={{ height }}>
      <Doughnut
        data={{ labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 1 }] }}
        options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
}

export function LineChart({ labels, datasets, height = 240, yMax }) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: datasets.map((d, i) => ({
            borderColor: COLORS.palette[i], backgroundColor: COLORS.palette[i], tension: 0.3, fill: false, ...d,
          })),
        }}
        options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ...(yMax ? { max: yMax } : {}) } }, plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
}
