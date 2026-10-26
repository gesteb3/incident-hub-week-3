import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createIncident, type Catalogs, type Incident, type User } from '../api';
import { errorMessage, priorityLabels } from './presentation';
import Feedback from './Feedback';

type Props = { catalogs: Catalogs; actor: User; onClose: () => void; onCreated: (incident: Incident) => void };

export default function CreateIncidentDialog({ catalogs, actor, onClose, onCreated }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Incident['priority']>('MEDIUM');
  const [reporterId, setReporterId] = useState(actor.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (title.trim().length < 5 || description.trim().length < 10) {
      setError('Escribe al menos 5 caracteres en el título y 10 en la descripción.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const incident = await createIncident({ title: title.trim(), description: description.trim(), categoryId, priority, reporterId });
      onCreated(incident);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  }

  return <dialog className="create-dialog" ref={dialog} aria-labelledby="create-title"
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="dialog-heading">
      <div><p className="eyebrow">MESA DE AYUDA</p><h2 id="create-title">Nuevo incidente</h2></div>
      <button type="button" className="icon-button" aria-label="Cerrar formulario" disabled={busy} onClick={onClose}>×</button>
    </div>
    <p className="dialog-intro">Cuéntanos qué ocurrió y qué servicio está afectado.</p>
    <form className="operation-form" aria-label="Registrar incidente" onSubmit={submit}>
      <fieldset disabled={busy}>
        <div className="field"><label htmlFor="new-title">Título <span aria-hidden="true">*</span></label>
          <input id="new-title" autoFocus required minLength={5} maxLength={160} value={title}
            placeholder="Ej. No puedo acceder al correo" onChange={(event) => setTitle(event.target.value)} />
          <small>Una frase que describa el problema.</small></div>
        <div className="field"><label htmlFor="new-description">Descripción <span aria-hidden="true">*</span></label>
          <textarea id="new-description" required minLength={10} maxLength={5000} rows={4} value={description}
            placeholder="Indica desde cuándo ocurre, a quién afecta y qué has intentado."
            onChange={(event) => setDescription(event.target.value)} />
          <small>{description.length}/5000 caracteres</small></div>
        <div className="form-columns">
          <div className="field"><label htmlFor="new-category">Categoría <span aria-hidden="true">*</span></label>
            <select id="new-category" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Selecciona una categoría</option>
              {catalogs.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></div>
          <div className="field"><label htmlFor="new-priority">Prioridad</label>
            <select id="new-priority" value={priority} onChange={(event) => setPriority(event.target.value as Incident['priority'])}>
              {Object.entries(priorityLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select></div>
        </div>
        <div className="priority-guidance">{priority === 'CRITICAL' ? 'Crítica: un servicio esencial está detenido y afecta a varias personas.'
          : priority === 'HIGH' ? 'Alta: el problema impide trabajar y requiere atención prioritaria.'
            : priority === 'LOW' ? 'Baja: el trabajo puede continuar mientras se atiende el problema.'
              : 'Media: existe una afectación parcial o una alternativa temporal.'}</div>
        <div className="field"><label htmlFor="new-reporter">Reportado por</label>
          <select id="new-reporter" required disabled={actor.role === 'REQUESTER'} value={reporterId} onChange={(event) => setReporterId(event.target.value)}>
            {catalogs.users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select></div>
      </fieldset>
      {error && <Feedback message={error} />}
      <div className="dialog-footer"><span>Se registrará con estado Nuevo.</span>
        <div><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancelar</button>
          <button type="submit" className="submit-button" disabled={busy || !catalogs.categories.length}>
            {busy ? 'Registrando…' : 'Registrar incidente'}</button></div>
      </div>
    </form>
  </dialog>;
}
