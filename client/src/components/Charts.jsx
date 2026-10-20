/** Data visualisation components (Chart.js via react-chartjs-2). */
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);

// dark theme defaults for every chart
ChartJS.defaults.color = '#8b95ab';
ChartJS.defaults.borderColor = 'rgba(139,149,171,.15)';
ChartJS.defaults.font.family = "'Inter', system-ui, sans-serif";
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;

export const COLORS = {
  lime: '#d4ff3f', coral: '#ff5a3c', blue: '#4da3ff', violet: '#b06bff', mint: '#2ee6a6', yellow: '#ffc53d', gray: '#5d6780', white: '#e6ebf5',
  // old names kept so every page keeps working
  navy: '#4da3ff', orange: '#ff5a3c', green: '#d4ff3f', red: '#ff5a3c', teal: '#2ee6a6',
  palette: ['#d4ff3f', '#ff5a3c', '#4da3ff', '#b06bff', '#2ee6a6', '#ffc53d', '#ff7ab6', '#5d6780'],
};

export function BarChart({ labels, values, label, color = COLORS.lime, horizontal = false, height = 260, max, datasets }) {
  const data = {
    labels,
    datasets: datasets
      ? datasets.map((d, i) => ({ backgroundColor: COLORS.palette[i], borderRadius: 6, ...d }))
      : [{ label, data: values, backgroundColor: color, borderRadius: 6 }],
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
        data={{ labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] }}
        options={{ maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } }}
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
            borderColor: COLORS.palette[i], backgroundColor: COLORS.palette[i], tension: 0.35, fill: false, borderWidth: 3, pointRadius: 4, ...d,
          })),
        }}
        options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, ...(yMax ? { max: yMax } : {}) } }, plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
}
