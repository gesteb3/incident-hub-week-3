import { useEffect, useState } from 'react';
import type { Incident, IncidentFilters, Pagination } from '../api';
import { fetchIncidents } from '../api';
import IncidentFiltersForm from '../IncidentFiltersForm';
import { useCatalogs } from './useCatalogs';
import { errorMessage, formatDate, roleLabels, statusLabels } from './presentation';
import CreateIncidentDialog from './CreateIncidentDialog';
import IncidentDetail from './IncidentDetail';
import Feedback from './Feedback';
import './operations.css';
import { chooseUser, storedUserId, rememberUser, userScope, scopeLabel } from './working-user';

type Query = IncidentFilters & { page: number; limit: number };

export default function IncidentWorkspace() {
  const catalogState = useCatalogs();
  const { catalogs } = catalogState;
  const [actorId, setActorId] = useState(storedUserId);
  const actor = chooseUser(catalogs.users, actorId);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(location.search).get('incidentId') ?? '');
  const [query, setQuery] = useState<Query>({ page: 1, limit: 10 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filterRevision, setFilterRevision] = useState(0);
  const [notice, setNotice] = useState('');
  const hasFilters = !!(query.status || query.priority || query.categoryId || query.technicianId);

  useEffect(() => {
    if (!actor) return;
    rememberUser(actor.id);
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchIncidents({ ...query, ...userScope(actor) }, controller.signal).then((result) => {
      if (controller.signal.aborted) return;
      if (query.page > 1 && !result.data.length) {
        setQuery((current) => ({ ...current, page: Math.max(1, result.meta.totalPages) }));
        return;
      }
      setIncidents(result.data);
      setPagination(result.meta);
      setSelectedId((current) => (actor.role === 'ADMIN' && current)
        || result.data.find(item => item.id === current)?.id || result.data[0]?.id || '');
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) { setError(errorMessage(cause)); setIncidents([]); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, revision, actor?.id, actor?.role]);

  useEffect(() => {
    const url = new URL(location.href);
    if (selectedId) url.searchParams.set('incidentId', selectedId);
    else url.searchParams.delete('incidentId');
    history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [selectedId]);

  function applyFilters(filters: IncidentFilters) {
    setSelectedId('');
    setQuery({ ...filters, page: 1, limit: query.limit });
    setNotice('');
  }

  function created(incident: Incident) {
    setCreating(false);
    setSelectedId(incident.id);
    setQuery({ page: 1, limit: query.limit });
    setFilterRevision((value) => value + 1);
    setNotice(`Incidente ${incident.id.slice(0, 8).toUpperCase()} registrado. ${actor?.role === 'REQUESTER' ? 'El equipo de soporte podrá asignar su atención.' : 'Ya puedes asignar su atención.'}`);
  }

  return <>
    <section className="page-heading"><div><p className="eyebrow">MESA DE AYUDA</p><h1>Incidentes de TI</h1>
      <p className="subtitle">Registra, asigna y da seguimiento a los reportes.</p></div>
      {actor?.role !== 'TECHNICIAN' && <button className="submit-button new-incident-button" type="button" disabled={busy || catalogState.loading || !!catalogState.error || !actor}
        onClick={() => setCreating(true)}><span aria-hidden="true">＋</span> Nuevo incidente</button>}
    </section>
    <section className="work-context" aria-label="Usuario de trabajo">
      <div className="context-person"><span className="context-icon" aria-hidden="true">◉</span><div>
        <label htmlFor="work-user">Trabajar como</label>
        <select id="work-user" value={actor?.id ?? ''} disabled={busy || catalogState.loading || !!catalogState.error}
          onChange={(event) => {
            setActorId(event.target.value); rememberUser(event.target.value);
            setSelectedId(''); setIncidents([]); setLoading(true); setCreating(false);
            setQuery({ page: 1, limit: query.limit }); setFilterRevision(value => value + 1); setNotice('');
          }}>
          {!catalogs.users.length && <option value="">{catalogState.loading ? 'Cargando usuarios…' : 'Sin usuarios disponibles'}</option>}
          {catalogs.users.map((user) => <option key={user.id} value={user.id}>{user.name} · {roleLabels[user.role]}</option>)}
        </select></div></div>
      <span className={`live-indicator ${error || catalogState.error ? 'connection-error' : ''}`} role="status"><span />
        {loading ? 'Actualizando…' : error || catalogState.error ? 'Sin actualizar' : 'Datos actualizados'}</span>
    </section>
    <p className="subtitle">{actor ? scopeLabel(actor) : 'Cargando perfil…'}</p>
    <IncidentFiltersForm key={filterRevision} disabled={loading || busy} {...catalogState}
      fixedTechnicianId={actor?.role === 'TECHNICIAN' ? actor.id : undefined} onApply={applyFilters} />
    {notice && <div className="feedback feedback-success workspace-notice" role="status"><span className="success-mark">✓</span><span>{notice}</span>
      <button type="button" aria-label="Cerrar confirmación" onClick={() => setNotice('')}>×</button></div>}
    <section className="content-grid">
      <aside className="incident-panel panel">
        <div className="panel-heading"><div><p className="eyebrow">BANDEJA DE TRABAJO</p><h2>Incidentes</h2></div>
          <span className="count-pill" aria-label="Total de incidentes">{loading || error ? '—' : pagination.total}</span></div>
        {loading ? <p className="muted-state" role="status">Cargando incidentes…</p>
          : error ? <Feedback message={error} onRetry={() => setRevision((value) => value + 1)} />
            : !incidents.length ? <div className="empty-state compact"><span className="empty-icon" aria-hidden="true">◇</span>
              <strong>{hasFilters ? 'No hay coincidencias' : 'No hay incidentes'}</strong><span>{hasFilters ? 'Prueba otros filtros o pulsa Limpiar.'
                : actor?.role === 'TECHNICIAN' ? 'Todavía no tienes incidentes asignados.' : 'Registra el primer incidente para comenzar.'}</span></div>
              : <div className="incident-list" aria-label="Seleccionar incidente">{incidents.map((incident) =>
                <button className={`incident-card ${incident.id === selectedId ? 'selected' : ''}`} type="button" key={incident.id}
                  aria-pressed={incident.id === selectedId} disabled={busy} onClick={() => { setSelectedId(incident.id); setNotice(''); }}>
                  <span className={`priority-dot priority-${incident.priority.toLowerCase()}`} aria-hidden="true" />
                  <span className="incident-card-copy"><strong>{incident.title}</strong><span>{incident.category.name} · {formatDate(incident.createdAt)}</span></span>
                  <span className={`status-chip status-${incident.status.toLowerCase()}`}>{statusLabels[incident.status]}</span>
                </button>)}</div>}
        {!loading && !error && selectedId && !incidents.some((item) => item.id === selectedId) &&
          <p className="list-context-note">El detalle abierto está fuera de los resultados de esta página.</p>}
        <nav className="pagination" aria-label="Páginas de incidentes">
          <div className="pagination-size"><label htmlFor="page-size">Por página</label><select id="page-size" value={query.limit} disabled={loading || busy}
            onChange={(event) => { setSelectedId(''); setQuery({ ...query, page: 1, limit: Number(event.target.value) }); }}>
            {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
          </select></div>
          <span aria-live="polite">{loading ? 'Cargando…' : error ? '—' : !pagination.total ? '0 resultados' : `Página ${pagination.page} de ${pagination.totalPages}`}</span>
          <div className="pagination-buttons"><button className="secondary-button" type="button" aria-label="Página anterior" disabled={loading || busy || !!error || query.page <= 1}
            onClick={() => { setSelectedId(''); setQuery({ ...query, page: query.page - 1 }); }}>Anterior</button>
            <button className="secondary-button" type="button" aria-label="Página siguiente" disabled={loading || busy || !!error || query.page >= pagination.totalPages}
              onClick={() => { setSelectedId(''); setQuery({ ...query, page: query.page + 1 }); }}>Siguiente</button></div>
        </nav>
      </aside>
      <section className="detail-column" aria-label="Detalle y atención">
        {selectedId && !loading && !error ? <IncidentDetail key={`${actor?.id}:${selectedId}`} id={selectedId} actor={actor} catalogs={catalogs} onBusy={setBusy}
          onChanged={() => { setNotice(''); setRevision((value) => value + 1); }} />
          : <div className="panel empty-detail"><span className="empty-icon" aria-hidden="true">◇</span><strong>{loading ? 'Preparando bandeja…' : 'Selecciona un incidente'}</strong>
            <span>El detalle, la atención y el historial aparecerán aquí.</span></div>}
      </section>
    </section>
    {creating && actor && <CreateIncidentDialog catalogs={catalogs} actor={actor} onClose={() => setCreating(false)} onCreated={created} />}
  </>;
}
