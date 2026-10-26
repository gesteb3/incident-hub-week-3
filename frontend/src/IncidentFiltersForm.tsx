import { useState, type FormEvent } from 'react';
import type { Catalogs, IncidentFilters } from './api';

type Props = {
  disabled: boolean;
  onApply: (filters: IncidentFilters) => void;
  catalogs: Catalogs;
  loading: boolean;
  error: string;
  retry: () => void;
  fixedTechnicianId?: string;
};

export default function IncidentFiltersForm({ disabled, onApply, catalogs, loading, error, retry, fixedTechnicianId }: Props) {
  const [filters, setFilters] = useState<IncidentFilters>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(filters);
  }

  return (
    <form className="filters panel" onSubmit={submit} aria-label="Filtrar incidentes">
      <div className="filter-field">
        <label htmlFor="filter-status">Estado</label>
        <select id="filter-status" disabled={disabled} value={filters.status ?? ''}
          onChange={(event) => setFilters({ ...filters, status: event.target.value as IncidentFilters['status'] || undefined })}>
          <option value="">Todos los estados</option>
          <option value="NUEVO">Nuevo</option>
          <option value="ASIGNADO">Asignado</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="RESUELTO">Resuelto</option>
          <option value="CERRADO">Cerrado</option>
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="filter-priority">Prioridad</label>
        <select id="filter-priority" disabled={disabled} value={filters.priority ?? ''}
          onChange={(event) => setFilters({ ...filters, priority: event.target.value as IncidentFilters['priority'] || undefined })}>
          <option value="">Todas las prioridades</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="filter-category">Categoría</label>
        <select id="filter-category" disabled={disabled || loading || !!error} value={filters.categoryId ?? ''}
          onChange={(event) => setFilters({ ...filters, categoryId: event.target.value || undefined })}>
          <option value="">{loading ? 'Cargando categorías…' : 'Todas las categorías'}</option>
          {catalogs.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="filter-technician">Técnico</label>
        <select id="filter-technician" disabled={disabled || loading || !!error || !!fixedTechnicianId} value={fixedTechnicianId ?? filters.technicianId ?? ''}
          onChange={(event) => setFilters({ ...filters, technicianId: event.target.value || undefined })}>
          <option value="">{loading ? 'Cargando técnicos…' : 'Todos los técnicos'}</option>
          {catalogs.technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
        </select>
      </div>
      <div className="filter-actions">
        <button className="submit-button" disabled={disabled} type="submit">Aplicar filtros</button>
        <button className="secondary-button" disabled={disabled} type="button" onClick={() => {
          setFilters({});
          onApply({});
        }}>Limpiar</button>
      </div>
      {error && <div className="catalog-error" role="alert">{error} <button type="button" disabled={disabled} onClick={retry}>Reintentar</button></div>}
    </form>
  );
}
