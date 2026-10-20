import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, StatCard } from '../components/common';
import { BarChart, DoughnutChart, LineChart, COLORS } from '../components/Charts';
import { positionName, pointsLabel } from '../pipes';

const RESULT = { home: ['Победа домаќин', COLORS.navy], draw: ['Нерешено', COLORS.gray], away: ['Победа гостин', COLORS.orange] };
const POINT_COLORS = { 5: COLORS.green, 3: COLORS.blue, 2: COLORS.navy, 0: COLORS.red };

function Card({ title, children }) {
  return <div className="col-lg-6"><div className="card h-100"><div className="card-header">{title}</div><div className="card-body">{children}</div></div></div>;
}

/** Additional presentation of data with charts. */
export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(() => api.getOverview(), []);
  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const { counts, topScorers, topGoalkeepers, goalsByPosition, results, goalsPerRound, pointsSplit, topPredictors } = data;

  return (
    <>
      <PageHeader eyebrow="Бројки и графикони" title="Статистика" subtitle="Агрегирани податоци од натпреварите и прогнозите" />
      <div className="row g-3 mb-4">
        {[['played', 'Одиграни'], ['scheduled', 'Закажани'], ['players', 'Играчи'], ['clubs', 'Клубови'], ['predictions', 'Прогнози'], ['users', 'Корисници']].map(([k, l]) => (
          <div className="col-6 col-md-4 col-xl-2" key={k}><StatCard value={counts[k]} label={l} /></div>
        ))}
      </div>
      <div className="row g-3">
        <Card title="Топ стрелци">
          <BarChart labels={topScorers.map((s) => s.name)} values={topScorers.map((s) => s.goals)} label="Голови" color={COLORS.orange} horizontal height={300} />
        </Card>
        <Card title="Голови по позиција">
          <DoughnutChart labels={goalsByPosition.map((p) => positionName(p._id))} values={goalsByPosition.map((p) => p.goals)} height={300} />
        </Card>
        <Card title="Исход на натпреварите">
          <DoughnutChart labels={results.map((r) => RESULT[r._id]?.[0] || r._id)} values={results.map((r) => r.count)} colors={results.map((r) => RESULT[r._id]?.[1] || COLORS.gray)} />
        </Card>
        <Card title="Просечно голови по коло">
          <LineChart labels={goalsPerRound.map((r) => `${r._id}. коло`)} datasets={[{ label: 'Голови по натпревар', data: goalsPerRound.map((r) => r.avgGoals) }]} />
        </Card>
        <Card title="Најдобри голмани (одбрани)">
          <BarChart labels={topGoalkeepers.map((g) => g.name)} values={topGoalkeepers.map((g) => g.saves)} label="Одбрани" color={COLORS.navy} />
        </Card>
        <Card title="Прогнози според освоени поени">
          <DoughnutChart labels={pointsSplit.map((p) => `${p._id} п. – ${pointsLabel(p._id)}`)} values={pointsSplit.map((p) => p.count)} colors={pointsSplit.map((p) => POINT_COLORS[p._id] || COLORS.gray)} />
        </Card>
        <div className="col-12">
          <div className="card"><div className="card-header">Најуспешни навивачи</div><div className="card-body">
            <BarChart labels={topPredictors.map((u) => u.username)} values={topPredictors.map((u) => u.points)} label="Поени" color={COLORS.green} />
          </div></div>
        </div>
      </div>
    </>
  );
}
