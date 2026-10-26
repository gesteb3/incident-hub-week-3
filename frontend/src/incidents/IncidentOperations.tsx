import { useState, type FormEvent } from 'react';
import { assignTechnician, changeStatus, type Catalogs, type Incident, type User } from '../api';
import { errorMessage, nextStatus, statusActions, statusLabels, statusOrder } from './presentation';
import Feedback from './Feedback';

type Props = {
  incident: Incident; actor?: User; technicians: Catalogs['technicians'];
  onChanged: (incident: Incident) => void; onBusy: (busy: boolean) => void;
  disabled?: boolean;
};

export default function IncidentOperations({ incident, actor, technicians, onChanged, onBusy, disabled = false }: Props) {
  const [technicianId, setTechnicianId] = useState(incident.technician?.id ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'assignment' | 'status' | null>(null);
  const [error, setError] = useState('');
  const target = nextStatus[incident.status];
  const needsReason = target === 'RESUELTO' || target === 'CERRADO';
  const canOperate = actor?.role === 'TECHNICIAN' || actor?.role === 'ADMIN';
  const canAssign = actor?.role === 'ADMIN' && incident.status !== 'RESUELTO' && incident.status !== 'CERRADO';
  const currentStep = statusOrder.indexOf(incident.status);

  async function save(kind: 'assignment' | 'status', event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || disabled || !actor || !canOperate) return;
    if (kind === 'status' && needsReason && reason.trim().length < 10) {
      setError('Describe el motivo con al menos 10 caracteres.');
      return;
    }
    setBusy(kind);
    onBusy(true);
    setError('');
    try {
      const updated = kind === 'assignment'
        ? await assignTechnician(incident.id, technicianId, actor.id)
        : await changeStatus(incident.id, target!, actor.id, reason.trim() || undefined);
      setReason('');
      onChanged(updated);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(null); onBusy(false); }
  }

  return <section className="operations panel" aria-labelledby="operations-title">
    <div className="panel-heading"><div><p className="eyebrow">ATENCIÓN</p><h2 id="operations-title">Gestionar incidente</h2></div>
      <span className="count-pill">{currentStep + 1} de 5 etapas</span></div>
    <ol className="status-track" aria-label="Etapas del incidente">
      {statusOrder.map((status, index) => <li key={status} className={index < currentStep ? 'step-done' : index === currentStep ? 'step-current' : ''}
        aria-current={status === incident.status ? 'step' : undefined}>
        <span aria-hidden="true">{index < currentStep ? '✓' : index + 1}</span><strong>{statusLabels[status]}</strong>
      </li>)}
    </ol>
    {incident.status === 'CERRADO' ? <p className="terminal-note"><span aria-hidden="true">✓</span> La atención de este incidente ha finalizado. Puedes consultar su historial y añadir comentarios.</p>
      : !canOperate ? <p className="terminal-note">La asignación y el cambio de estado están disponibles para técnicos y administradores.</p>
        : <div className={`operations-grid ${!canAssign ? 'single-operation' : ''}`}>
          {canAssign && <form className="operation-form" aria-label="Asignar técnico" onSubmit={(event) => save('assignment', event)}>
            <div className="field"><label htmlFor="assigned-technician">Técnico responsable</label>
              <select id="assigned-technician" required disabled={!!busy || disabled} value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                <option value="">Selecciona un técnico</option>
                {incident.technician && !technicians.some((item) => item.id === incident.technician?.id)
                  && <option value={incident.technician.id} disabled>{incident.technician.name} (inactivo)</option>}
                {technicians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <small>{incident.status === 'NUEVO' ? 'Al asignarlo, el incidente pasará a Asignado.' : 'La reasignación conserva el estado actual.'}</small></div>
            <button className="secondary-button" type="submit" disabled={!!busy || disabled || !technicianId || technicianId === incident.technician?.id}>
              {busy === 'assignment' ? 'Guardando…' : incident.technician ? 'Guardar asignación' : 'Asignar técnico'}</button>
          </form>}
          {target ? <form className="operation-form" aria-label="Cambiar estado" onSubmit={(event) => save('status', event)}>
            <div className="field"><label htmlFor="status-reason">{needsReason ? 'Motivo de la atención' : 'Nota de atención (opcional)'}</label>
              <textarea id="status-reason" value={reason} disabled={!!busy || disabled} rows={2} maxLength={1000} minLength={10} required={needsReason}
                aria-describedby="reason-help" onChange={(event) => setReason(event.target.value)}
                placeholder={target === 'CERRADO' ? 'Confirma cómo se validó la solución.' : target === 'RESUELTO' ? 'Describe la solución aplicada.' : 'Indica qué vas a revisar.'} />
              <small id="reason-help">{needsReason ? 'Obligatorio: de 10 a 1000 caracteres. Quedará en el historial.' : 'Si añades una nota, escribe al menos 10 caracteres.'}</small></div>
            <button className="submit-button" type="submit" disabled={!!busy || disabled || (needsReason && reason.trim().length < 10) || (!!reason && reason.trim().length < 10)}>
              {busy === 'status' ? 'Guardando…' : statusActions[target]}<span aria-hidden="true">→</span></button>
          </form> : <div className="operation-hint"><span className="empty-icon" aria-hidden="true">↗</span><strong>Asigna un responsable</strong><p>Después podrás iniciar la atención y registrar la solución.</p></div>}
        </div>}
    {error && <Feedback message={error} />}
  </section>;
}
