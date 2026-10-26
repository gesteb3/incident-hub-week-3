import { useEffect, useState, type CSSProperties } from 'react';
import { fetchMetrics, type Incident, type IncidentMetrics } from './api';
import './dashboard.css';
import { useCatalogs } from './incidents/useCatalogs';
import { chooseUser, storedUserId, userScope, scopeLabel } from './incidents/working-user';

const states: Record<Incident['status'], { label: string; color: string }> = {
  NUEVO: { label: 'Nuevo', color: '#7892ab' },
  ASIGNADO: { label: 'Asignado', color: '#497b96' },
  EN_PROCESO: { label: 'En proceso', color: '#bf914f' },
  RESUELTO: { label: 'Resuelto', color: '#72ab93' },
  CERRADO: { label: 'Cerrado', color: '#276b57' },
};
const categoryColors: Record<string, string> = {
  Hardware: '#679a92', Redes: '#5c86a5', Accesos: '#bc9560', Software: '#879e72', Otros: '#9586a8',
};
const number = new Intl.NumberFormat('es-GT');
const percent = new Intl.NumberFormat('es-GT', { style: 'percent', maximumFractionDigits: 0 });
const time = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' });
const share = (count: number, total: number) => total > 0 ? count / total : 0;

function Icon({ kind }: { kind: 'total' | 'open' | 'closed' | 'critical' | 'refresh' }) {
  const paths = {
    total: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
    open: <><path d="M4 10V5h16v5M4 10h5l2 3h2l2-3h5v9H4z" /></>,
    closed: <><circle cx="12" cy="12" r="8" /><path d="m8 12 3 3 5-6" /></>,
    critical: <><path d="m12 3 10 17H2zM12 9v5M12 17h.01" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 8a7 7 0 0 1 11.6-2L20 9M4 15l2.8 3A7 7 0 0 0 18.4 16" /></>,
  };
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

function StateChart({ metrics }: { metrics: IncidentMetrics }) {
  let offset = 0;
  return (
    <article className="chart-panel panel">
      <div className="chart-heading"><div><p className="eyebrow">ESTADO DE ATENCIÓN</p><h2>Del reporte al cierre</h2></div><span className="chart-tag">5 estados</span></div>
      <div className="state-chart-layout">
        <div className="donut-wrap">
          <svg className="state-donut" viewBox="0 0 200 200" role="img" aria-label={`Distribución por estado. ${metrics.byStatus.map((item) => `${states[item.status].label}: ${item.count}`).join('. ')}`}>
            <circle cx="100" cy="100" r="76" fill="none" stroke="#edf2f2" strokeWidth="18" />
            {metrics.byStatus.map((item) => {
              const size = share(item.count, metrics.total) * 100;
              const start = offset;
              offset += size;
              return size > 0 ? <circle key={item.status} cx="100" cy="100" r="76" fill="none" stroke={states[item.status].color}
                strokeWidth="18" pathLength="100" strokeDasharray={`${size} ${100 - size}`} strokeDashoffset={-start} transform="rotate(-90 100 100)">
                <title>{states[item.status].label}: {item.count}</title>
              </circle> : null;
            })}
            <text x="100" y="98" textAnchor="middle" className="donut-total">{number.format(metrics.total)}</text>
            <text x="100" y="121" textAnchor="middle" className="donut-caption">incidentes</text>
          </svg>
        </div>
        <ul className="state-legend">
          {metrics.byStatus.map((item) => <li key={item.status}><span className="chart-dot" style={{ background: states[item.status].color }} /><span>{states[item.status].label}</span><strong>{number.format(item.count)}</strong><small>{percent.format(share(item.count, metrics.total))}</small></li>)}
        </ul>
      </div>
      <div className="chart-footnote"><span className="resolved-dot" />{number.format(metrics.resolved)} {metrics.resolved === 1 ? 'resuelto pendiente' : 'resueltos pendientes'} de cierre</div>
    </article>
  );
}

export function DashboardContent({ metrics }: { metrics: IncidentMetrics }) {
  const unassigned = metrics.byTechnician.find((item) => item.technicianId === null)?.count ?? 0;
  const cards = [
    { key: 'total', label: 'Total de incidentes', value: metrics.total, detail: 'Reportes registrados', hint: 'Todos los estados', className: 'metric-total' },
    { key: 'open', label: 'Abiertos', value: metrics.open, detail: 'Nuevos, asignados y en proceso', hint: 'Pendientes de resolución', className: 'metric-open' },
    { key: 'closed', label: 'Cerrados', value: metrics.closed, detail: 'Atención finalizada', hint: `${percent.format(share(metrics.closed, metrics.total))} del total registrado`, className: 'metric-closed' },
    { key: 'critical', label: 'Críticos pendientes', value: metrics.critical, detail: 'Prioridad crítica y estado abierto', hint: metrics.critical > 0 ? 'Requieren atención prioritaria' : 'Sin críticos abiertos', className: 'metric-critical' },
  ] as const;

  return <>
    <div className="metrics-grid">
      {cards.map((card) => <article className={`metric-card ${card.className}`} key={card.key} aria-label={`${card.label}: ${card.value}`}>
        <div className="metric-top"><span>{card.label}</span><span className="metric-icon"><Icon kind={card.key} /></span></div>
        <strong className="metric-number">{number.format(card.value)}</strong>
        <p className="metric-detail">{card.detail}</p>
        <div className="metric-foot"><span className="metric-pin" />{card.hint}</div>
      </article>)}
    </div>

    <div className="dashboard-charts">
      <StateChart metrics={metrics} />
      <article className="chart-panel panel">
        <div className="chart-heading"><div><p className="eyebrow">POR CATEGORÍA</p><h2>Tipos de reporte</h2></div><span className="chart-tag">{metrics.byCategory.length} categorías</span></div>
        <p className="chart-description">Participación sobre el total de incidentes.</p>
        <ul className="category-chart" aria-label="Distribución por categoría">
          {metrics.byCategory.map((item) => <li key={item.categoryId}>
            <div className="bar-label"><span>{item.name}</span><span><strong>{number.format(item.count)}</strong><small>{percent.format(share(item.count, metrics.total))}</small></span></div>
            <div className="bar-track"><div className="bar-fill" style={{ width: `${share(item.count, metrics.total) * 100}%`, background: categoryColors[item.name] ?? '#679a92' }} /></div>
          </li>)}
        </ul>
        {metrics.byCategory.length === 0 && <p className="chart-empty">Las categorías aparecerán cuando se registren incidentes.</p>}
        <div className="chart-footnote">Conteos de todos los estados, incluidos los cerrados.</div>
      </article>
    </div>

    <article className="chart-panel panel technician-panel">
      <div className="chart-heading"><div><p className="eyebrow">ASIGNACIÓN</p><h2>Distribución por responsable</h2></div><span className={`assignment-badge ${unassigned > 0 ? 'has-unassigned' : ''}`}>{number.format(unassigned)} sin asignar</span></div>
      <p className="chart-description">Incluye incidentes de todos los estados.</p>
      <div className="technician-table" role="table" aria-label="Distribución por técnico">
        <div className="technician-table-head" role="row"><span role="columnheader">Responsable</span><span role="columnheader">Proporción del total</span><span role="columnheader">Incidentes</span></div>
        {metrics.byTechnician.map((item) => <div className="technician-row" role="row" key={item.technicianId ?? 'unassigned'}>
          <span className="technician-name" role="cell"><span className={`technician-avatar ${item.technicianId === null ? 'unassigned-avatar' : ''}`} aria-hidden="true">{item.technicianId === null ? '—' : item.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><strong>{item.name}</strong></span>
          <span className="technician-share" role="cell"><span className="bar-track"><span className="bar-fill" style={{ width: `${share(item.count, metrics.total) * 100}%`, background: item.technicianId === null ? '#bd945a' : '#609786' } as CSSProperties} /></span><small>{percent.format(share(item.count, metrics.total))}</small></span>
          <strong className="technician-count" role="cell">{number.format(item.count)}</strong>
        </div>)}
      </div>
      {metrics.byTechnician.length === 0 && <p className="chart-empty">Todavía no hay incidentes para distribuir.</p>}
    </article>
  </>;
}

export default function Dashboard() {
  const catalogState = useCatalogs();
  const actor = chooseUser(catalogState.catalogs.users, storedUserId());
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!actor) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchMetrics(controller.signal, userScope(actor))
      .then((data) => { if (!controller.signal.aborted) setMetrics(data); })
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los indicadores.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload, actor?.id, actor?.role]);

  return <section className="dashboard" aria-busy={loading}>
    <header className="dashboard-heading">
      <div><p className="eyebrow">MESA DE AYUDA / INDICADORES</p><h1>Resumen de atención<span className="heading-dot">.</span></h1><p className="subtitle">Estado general de los incidentes registrados.</p></div>
      <div className="dashboard-tools">
        <span className="scope-badge">{actor ? `${actor.name} · ${scopeLabel(actor)}` : 'Cargando perfil…'}</span>
        <button className="secondary-button refresh-metrics" disabled={loading} onClick={() => setReload((value) => value + 1)} type="button"><Icon kind="refresh" />{loading ? 'Actualizando…' : 'Actualizar'}</button>
      </div>
    </header>
    <div className="dashboard-dateline"><span className={`data-status-dot ${error ? 'is-stale' : ''}`} /><span role="status">{error ? 'No se pudieron actualizar los datos' : loading ? 'Consultando indicadores…' : 'Última actualización'}{metrics && <time dateTime={metrics.generatedAt}> · {time.format(new Date(metrics.generatedAt))}</time>}</span><span className="dateline-rule" /></div>
    {error && <div className="dashboard-error" role="alert"><strong>{metrics ? 'Se muestran los últimos datos disponibles.' : 'No se pudieron cargar los indicadores.'}</strong><span>{error}</span><button className="secondary-button" type="button" disabled={loading} onClick={() => setReload((value) => value + 1)}>Reintentar</button></div>}
    {!metrics && loading && <div className="dashboard-loading" aria-label="Cargando indicadores"><div className="metrics-grid">{[1, 2, 3, 4].map((key) => <div className="metric-skeleton" key={key}><span /><strong /><span /></div>)}</div><div className="chart-skeleton" /></div>}
    {catalogState.error && <div role="alert" className="dashboard-error">{catalogState.error}<button type="button" onClick={catalogState.retry}>Reintentar</button></div>}
    {metrics && <DashboardContent metrics={metrics} />}
  </section>;
}
