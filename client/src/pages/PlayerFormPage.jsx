import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { Player } from '../models';
import FormField from '../components/FormField';
import { PageHeader, Loader, ErrorAlert } from '../components/common';
import { validate, playerSchema, POSITIONS, COUNTRIES } from '../utils/validators';
import { positionName, HAND, formatDate } from '../pipes';

/** One component for both "add player" (/players/new) and "view & edit player" (/players/:id/edit). */
export default function PlayerFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const clubs = useAsync(() => api.getClubs(), []);
  const existing = useAsync(() => (editing ? api.getPlayer(id) : Promise.resolve(new Player())), [id]);

  const [player, setPlayer] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (existing.data) setPlayer(existing.data); }, [existing.data]);

  if (existing.loading || !player) return existing.error ? <ErrorAlert error={existing.error} /> : <Loader />;

  const onChange = (name, value) => {
    setPlayer((p) => Object.assign(new Player(), p, { [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(player, playerSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerError(null);
    try {
      const saved = await api.savePlayer(player);
      navigate(`/players/${saved._id}`, { replace: editing });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  const title = editing ? `Уреди: ${existing.data.fullName}` : 'Нов играч';
  return (
    <>
      <PageHeader
        title={title}
        icon={editing ? 'bi-pencil-square' : 'bi-person-plus'}
        breadcrumbs={editing ? [['Играчи', '/players'], [existing.data.fullName, `/players/${id}`], ['Уреди']] : [['Играчи', '/players'], ['Нов']]}
      />
      <div className="card shadow-sm">
        <div className="card-body">
          {serverError && <div className="alert alert-danger">{serverError}</div>}
          <form className="row g-3" onSubmit={submit} noValidate>
            <FormField className="col-md-6" label="Име" name="firstName" value={player.firstName} onChange={onChange} error={errors.firstName} required />
            <FormField className="col-md-6" label="Презиме" name="lastName" value={player.lastName} onChange={onChange} error={errors.lastName} required />
            <FormField className="col-md-4" label="Датум на раѓање" name="dateOfBirth" type="date" value={player.dateOfBirth} onChange={onChange} error={errors.dateOfBirth} help="Возраст 15–45 години" required />
            <FormField className="col-md-4" label="Националност" name="nationality" value={player.nationality} onChange={onChange} error={errors.nationality} placeholder="пр. North Macedonia" list="countries" required />
            <datalist id="countries">{COUNTRIES.filter((c) => c !== 'Other').map((c) => <option key={c} value={c} />)}</datalist>
            <FormField className="col-md-4" label="Позиција" name="position" type="select" value={player.position} onChange={onChange} error={errors.position} required
              options={[['', '– избери –'], ...POSITIONS.map((p) => [p, positionName(p, true)])]} />
            <FormField className="col-md-4" label="Клуб" name="clubId" type="select" value={player.clubId} onChange={onChange} error={errors.club}
              options={[['', 'Без клуб (слободен)'], ...(clubs.data || []).map((c) => [c._id, c.name])]} />
            <FormField className="col-md-4" label="Број на дрес" name="jerseyNumber" type="number" min="1" max="99" value={player.jerseyNumber} onChange={onChange} error={errors.jerseyNumber} help="1–99" />
            <FormField className="col-md-6" label="Висина (cm)" name="heightCm" type="number" min="160" max="220" value={player.heightCm} onChange={onChange} error={errors.heightCm} help="160–220 cm" />
            <FormField className="col-md-6" label="Рака за шут" name="hand" type="radio" value={player.hand} onChange={onChange} error={errors.hand} options={Object.entries(HAND)} />
            <FormField label="URL на фотографија" name="photoUrl" type="url" value={player.photoUrl} onChange={onChange} error={errors.photoUrl} placeholder="https://..." />
            <FormField label="Белешки" name="notes" type="textarea" value={player.notes} onChange={onChange} error={errors.notes} help={`${player.notes.length}/1000`} />
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy && <span className="spinner-border spinner-border-sm me-2" />}{editing ? 'Зачувај промени' : 'Додај играч'}
              </button>
              <Link to={editing ? `/players/${id}` : '/players'} className="btn btn-outline-secondary">Откажи</Link>
            </div>
          </form>
        </div>
      </div>
      {editing && existing.data.updatedAt && <p className="text-muted small mt-2">Последна измена: {formatDate(existing.data.updatedAt, 'long')}</p>}
    </>
  );
}
