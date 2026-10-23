'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Gift, Plus, RefreshCcw, Search } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { formatOrderAmount } from '@/lib/orderPricing';
import { useDashboard } from '@/context/DashboardContext';
import type { Participant, Prize, Promotion, PromotionDashboard, PromotionPreview } from '@/types/promotions';
import styles from './PromotionsManager.module.css';

type Run = (name: string, args: Record<string, unknown>) => Promise<boolean>;
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const date = (value: string | null) => value ? value.split('-').reverse().join('/') : 'Sin fecha de fin';
const time = (value: string | null) => value ? new Date(value).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '—';
const finished = (p: Promotion) => p.status === 'ENDED' || (p.status === 'ACTIVE' && !!p.ends_on && p.ends_on < today());
const stateLabel = (p: Promotion) => p.status === 'DRAFT' ? 'Borrador' : finished(p) ? 'Finalizada' : p.starts_on > today() ? 'Programada' : 'Activa';
const accumulated = (p: Participant) => p.confirmed + p.pending;
const waiting = (p: Participant, data: PromotionDashboard) => p.benefit === 'DISCOUNT' && p.benefit_status === 'PENDING' && data.participants.some(other => other.benefit === 'PRIZE' && other.benefit_status === 'PENDING' && other.confirmed < data.campaign.target);
const benefitLabel = (p: Participant, promo: Promotion) => p.benefit_status === 'REVIEW' ? 'Requiere revisión' : p.benefit === 'PRIZE' ? p.benefit_status === 'USED' ? 'Premio entregado' : p.confirmed >= promo.target ? 'Premio asegurado · pendiente de retirar' : 'Premio reservado · pedidos pendientes' : p.benefit === 'DISCOUNT' ? `${promo.discount_percent}% ${p.benefit_status === 'USED' ? 'utilizado' : 'disponible'}` : 'En progreso';

export function PizzaProgress({ confirmed, pending, target }: { confirmed: number; pending: number; target: number }) {
  const point = (angle: number) => `${40 + 34 * Math.cos(angle)},${40 + 34 * Math.sin(angle)}`;
  return <svg viewBox="0 0 80 80" width="68" height="68" role="img" aria-label={`${confirmed} porciones entregadas de ${target}; ${pending} pendientes de entrega`}>
    <circle cx="40" cy="40" r="38" fill="#30231b" stroke="#c49b6b" strokeWidth="2" />
    {Array.from({ length: target }, (_, i) => {
      const a = -Math.PI / 2 + i * 2 * Math.PI / target + 0.035;
      const b = -Math.PI / 2 + (i + 1) * 2 * Math.PI / target - 0.035;
      return <path key={i} d={`M40,40 L${point(a)} A34,34 0 ${b - a > Math.PI ? 1 : 0},1 ${point(b)} Z`}
        fill={i < confirmed ? '#ed8a27' : i < confirmed + pending ? '#72532e' : '#252528'} stroke="#30231b" strokeWidth="1" />;
    })}
  </svg>;
}

export default function PromotionsManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [data, setData] = useState<PromotionDashboard | null>(null);
  const [tab, setTab] = useState('participants');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const sequence = useRef(0);
  const { fetchOrders } = useDashboard();

  const refresh = useCallback(async () => {
    const seq = ++sequence.current;
    try {
      const list = await supabase.from('PromoCampaign').select('*').order('created_at', { ascending: false });
      if (seq !== sequence.current) return;
      if (list.error) throw list.error;
      setPromotions(list.data as Promotion[]);
      if (selected) {
        const response = await supabase.rpc('promo_dashboard', { p_campaign: selected });
        if (seq !== sequence.current) return;
        if (response.error) throw response.error;
        setData(response.data as PromotionDashboard);
      } else setData(null);
      setError('');
    } catch (e) {
      if (seq === sequence.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar las promociones. Intentá actualizar.');
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, [selected]);
  const invalidate = useCallback(() => { sequence.current++; }, []);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), 10000);
    return () => { clearTimeout(initial); clearInterval(interval); invalidate(); };
  }, [refresh, invalidate]);

  const run: Run = async (name, args) => {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await supabase.rpc(name, args);
      if (response.error) throw response.error;
      await refresh();
      if (name === 'promo_apply_discount') await fetchOrders();
      setMessage('Cambios guardados.');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : 'No se pudo guardar el cambio.');
      return false;
    } finally { setBusy(false); }
  };

  const promo = data?.campaign;
  return <section className={styles.root} aria-busy={busy}>
    <header className={styles.header}>
      <div><h1><Gift size={28} /> Promociones</h1><p>Compras que suman, llaveros que se completan y beneficios por entregar.</p></div>
      <div className={styles.actions}>
        {selected && <button className="secondary" onClick={() => { setSelected(null); setData(null); }}><ArrowLeft size={16} /> Todas</button>}
        <button className="secondary" disabled={busy} onClick={() => void refresh()} aria-label="Actualizar promociones"><RefreshCcw size={16} /></button>
        {!selected && <button onClick={() => setCreating(true)}><Plus size={16} /> Nueva promoción</button>}
      </div>
    </header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.notice} role="status">{message}</p>}
    {creating && <NewPromotion busy={busy} onCancel={() => setCreating(false)} onCreate={async args => {
      if (await run('promo_create', args)) setCreating(false);
    }} />}
    {loading && <p>Cargando promociones…</p>}
    {!selected && <div className={styles.grid}>{promotions.map(p => <button key={p.id} className={`${styles.promoCard} card`} onClick={() => { setData(null); setSelected(p.id); setTab(p.status === 'DRAFT' ? 'settings' : 'participants'); }}>
      <span className={styles.badge}>{stateLabel(p)}</span><h2>{p.name}</h2>
      <p>{date(p.starts_on)} · {date(p.ends_on)}</p>
      <p>{p.target} packs para completar · {p.prize_limit} premios · {p.discount_percent}% después</p>
      <span>Abrir promoción →</span>
    </button>)}</div>}
    {!loading && !selected && promotions.length === 0 && <div className="card"><h2>Tu primera promoción</h2><p>Creá una promo por acumulación de packs y revisá las compras antes de activarla.</p></div>}
    {selected && !promo && !loading && <p>Cargando detalle…</p>}
    {promo && data && <>
      <div className={styles.promoTitle}><div><span className={styles.badge}>{stateLabel(promo)}</span><h2>{promo.name}</h2><p>Del {date(promo.starts_on)} · {date(promo.ends_on)}{promo.closed_at && ` · Finalizada manualmente ${time(promo.closed_at)}`}</p></div>
        <span className={styles.rule}>1 pack = 1 porción</span>
      </div>
      <div className={styles.stats}>
        <Stat value={data.participants.filter(p => accumulated(p) > 0).length} label="Participantes" />
        <Stat value={data.participants.filter(p => accumulated(p) >= promo.target).length} label="Llavero completo" />
        <Stat value={data.participants.filter(p => accumulated(p) > 0 && accumulated(p) < promo.target).length} label="En progreso" />
        <Stat value={data.participants.filter(p => p.benefit === 'PRIZE' && p.benefit_status === 'PENDING' && p.confirmed < promo.target).length} label="Premio reservado" />
        <Stat value={data.participants.filter(p => p.benefit === 'PRIZE' && p.benefit_status === 'PENDING' && p.confirmed >= promo.target).length} label="Premio asegurado" />
        <Stat value={data.participants.filter(p => p.benefit === 'DISCOUNT' && p.benefit_status === 'USED').length} label="Descuentos utilizados" />
        <Stat value={`${data.prizes.filter(p => p.delivered_at).length}/${promo.prize_limit}`} label="Premios entregados" />
        <Stat value={data.participants.filter(p => p.benefit === 'DISCOUNT' && p.benefit_status === 'PENDING').length} label="Descuentos pendientes" />
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Detalle de promoción">{[['participants', 'Participantes'], ['prizes', 'Premios y descuentos'], ['settings', 'Configuración']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'primary' : 'secondary'} onClick={() => setTab(id)}>{label}</button>)}</div>
      {promo.status === 'DRAFT' && <p className={styles.notice}>Esta promoción todavía no suma compras. Revisá la vista previa en Configuración y activala cuando esté correcta.</p>}
      {tab === 'participants' && <Participants data={data} busy={busy} run={run} />}
      {tab === 'prizes' && <>
        <p className={styles.explanation}>{promo.prize_limit - data.participants.filter(p => p.prize_slot !== null).length} lugares para premio sin asignar · {data.participants.filter(p => p.benefit === 'PRIZE' && p.benefit_status === 'PENDING').length} clientes con derecho a premio pendiente de elegir. Eligen cuando vienen a buscarlo.</p>
        <div className={styles.grid}>{data.prizes.map(prize => <PrizeCard key={`${prize.id}:${prize.name}:${prize.image_url}:${prize.delivered_at}`} prize={prize} participants={data.participants} target={promo.target} run={run} busy={busy} />)}</div>
        <h3>Descuentos de próxima compra</h3><p className={styles.explanation}>Se aplican automáticamente al registrar la próxima compra pendiente de pago. Para compras ya registradas, podés aplicarlos desde aquí antes de cobrarlas o entregarlas. No se aplican al pedido que completó las porciones.</p>
        {data.participants.filter(p => p.benefit === 'DISCOUNT').map(p => <DiscountCard key={`${p.id}:${p.benefit_status}`} participant={p} promo={promo} run={run} busy={busy} />)}
        {!data.participants.some(p => p.benefit === 'DISCOUNT') && <p>Todavía no hay descuentos asignados.</p>}
      </>}
      {tab === 'settings' && <Settings key={`${promo.id}:${promo.status}:${promo.starts_on}:${promo.ends_on}:${promo.name}`} promo={promo} run={run} busy={busy} onActivated={() => setTab('participants')} />}
    </>}
  </section>;
}

function Stat({ value, label }: { value: number | string; label: string }) { return <div className="card"><strong className={styles.statNumber}>{value}</strong><span>{label}</span></div>; }

function NewPromotion({ busy, onCreate, onCancel }: { busy: boolean; onCreate: (args: Record<string, unknown>) => Promise<void>; onCancel: () => void }) {
  return <form className={`card ${styles.form}`} onSubmit={async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    await onCreate({ p_name: String(f.get('name')), p_start: String(f.get('start')), p_end: f.get('end') || null, p_target: Number(f.get('target')), p_prizes: Number(f.get('prizes')), p_discount: Number(f.get('discount')) });
  }}>
    <h2>Nueva promoción por packs</h2><label>Nombre<input name="name" required maxLength={120} /></label>
    <div className={styles.formGrid}><label>Inicio<input name="start" type="date" required defaultValue={today()} /></label><label>Fin opcional<input name="end" type="date" /></label></div>
    <div className={styles.formGrid}><label>Packs para completar<input name="target" type="number" min="1" max="100" defaultValue="6" required /></label><label>Cantidad de premios distintos<input name="prizes" type="number" min="0" max="100" defaultValue="5" required /></label><label>Descuento posterior (%)<input name="discount" type="number" min="1" max="100" defaultValue="10" required /></label></div>
    <p>Se crea en borrador. Todos los packs de productos activos participan; las porciones suman al registrar el pedido y la entrega asegura el lugar para premio.</p>
    <div className={styles.actions}><button disabled={busy}>Crear borrador</button><button type="button" className="secondary" onClick={onCancel}>Cancelar</button></div>
  </form>;
}

export function Participants({ data, busy, run }: { data: PromotionDashboard; busy: boolean; run: Run }) {
  const [search, setSearch] = useState(''); const [filter, setFilter] = useState('all'); const [expanded, setExpanded] = useState<string | null>(null);
  const promo = data.campaign;
  const people = data.participants.filter(p => p.customer_name.toLowerCase().includes(search.toLowerCase()) && (
    filter === 'all' || (filter === 'progress' && accumulated(p) > 0 && accumulated(p) < promo.target) ||
    (filter === 'completed' && accumulated(p) >= promo.target) ||
    (filter === 'reserved' && p.benefit === 'PRIZE' && p.benefit_status === 'PENDING' && p.confirmed < promo.target) ||
    (filter === 'secured' && p.benefit === 'PRIZE' && p.benefit_status === 'PENDING' && p.confirmed >= promo.target) ||
    (filter === 'prizeUsed' && p.benefit === 'PRIZE' && p.benefit_status === 'USED') ||
    (filter === 'discount' && p.benefit === 'DISCOUNT' && p.benefit_status === 'PENDING') ||
    (filter === 'discountUsed' && p.benefit === 'DISCOUNT' && p.benefit_status === 'USED') ||
    (filter === 'waiting' && waiting(p, data)) ||
    (filter === 'notify' && p.benefit === 'PRIZE' && !!p.promotion_notice_at && !p.promotion_notified_at) ||
    (filter === 'review' && (p.benefit_status === 'REVIEW' || p.pieces_delivered > accumulated(p)))));
  return <>
    <div className={styles.filters}><label className={styles.search}><Search size={16} /><input placeholder="Buscar cliente" aria-label="Buscar participante" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Filtrar participantes" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Todos</option><option value="progress">En progreso</option><option value="completed">Completaron</option><option value="reserved">Premio reservado</option><option value="secured">Premio asegurado</option><option value="prizeUsed">Premio entregado</option><option value="discount">Descuento disponible</option><option value="discountUsed">Descuento utilizado</option><option value="waiting">En espera de premio</option><option value="notify">Avisar pase a premio</option><option value="review">Revisar</option></select></div>
    <p className={styles.explanation}>Todas las porciones suman desde el registro. Naranja: pedidos entregados; ámbar: pendientes de entrega. Las porciones físicas se registran por separado.</p>
    {people.length === 0 && <div className="card">Todavía no hay participantes para este filtro.</div>}
    {people.map(p => <article key={p.id} className={`card ${styles.participant}`}>
      <div className={styles.personRow}><PizzaProgress confirmed={Math.min(p.confirmed, promo.target)} pending={p.pending} target={promo.target} /><div className={styles.personName}><h3>{p.customer_name}</h3><span>{accumulated(p)}/{promo.target} acumuladas · {p.confirmed} entregadas · {p.pending} pendientes</span><p>{accumulated(p) >= promo.target ? `Completó · posición ${p.completion_rank ?? '—'}` : `Faltan ${promo.target - accumulated(p)} porciones`}</p></div><span className={`${styles.badge} ${p.benefit_status === 'REVIEW' ? styles.error : ''}`}>{benefitLabel(p, promo)}{waiting(p, data) && ' · En espera de premio'}</span><button className="secondary" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>{expanded === p.id ? 'Cerrar' : 'Ver detalle'}</button></div>
      {p.benefit === 'PRIZE' && p.promotion_notice_at && !p.promotion_notified_at && <p className={styles.notice}>Pasó de descuento a premio: contactá al cliente para avisarle. <button className="secondary" disabled={busy} onClick={() => void run('promo_acknowledge_promotion', { p_participant: p.id })}>Ya le avisé</button></p>}
      {expanded === p.id && <div className={styles.personDetail}>
        <p>Llavero {p.keychain_delivered_at ? `entregado ${time(p.keychain_delivered_at)}` : 'pendiente de entregar'} · {p.pieces_delivered} porciones físicas entregadas</p>
        {p.pieces_delivered > accumulated(p) && <p className={styles.error}>Revisar: hay más porciones físicas entregadas que compras vigentes después de un ajuste.</p>}
        <PhysicalDelivery key={`${p.id}:${p.pieces_delivered}:${p.keychain_delivered_at}`} participant={p} target={promo.target} run={run} busy={busy} />
        <div className={styles.orderList}><h4>Compras que explican el avance</h4>{p.orders.map(o => <div key={o.order_id}><strong>#{o.order_number ?? '—'}</strong><span>{o.quantity} packs · {o.product_name}</span><span>{o.order_status === 'DELIVERED' ? `${o.confirmed} porciones · entregado` : o.order_status === 'PENDING' ? `${o.pending} porciones · pendiente de entrega` : o.order_status === 'CANCELLED' ? 'Cancelado · no suma' : o.order_status === 'DELETED' ? 'Eliminado · no suma' : 'Fuera de la promo'}</span></div>)}</div>
        {p.benefit_status === 'REVIEW' && <p className={styles.error}>Se modificó una compra después de utilizar el beneficio. Revisá el caso antes de entregar otro premio o aplicar otro descuento.</p>}
      </div>}
    </article>)}
  </>;
}

function PhysicalDelivery({ participant: p, target, run, busy }: { participant: Participant; target: number; run: Run; busy: boolean }) {
  const [pieces, setPieces] = useState(p.pieces_delivered); const [keychain, setKeychain] = useState(!!p.keychain_delivered_at);
  return <form className={styles.deliveryForm} onSubmit={e => { e.preventDefault(); void run('promo_physical_delivery', { p_participant: p.id, p_keychain: keychain, p_pieces: pieces }); }}>
    <label><input type="checkbox" checked={keychain} onChange={e => setKeychain(e.target.checked)} /> Llavero entregado</label>
    <label>Porciones físicas<input type="number" min="0" max={Math.min(target, accumulated(p))} value={pieces} onChange={e => setPieces(Number(e.target.value))} required /></label>
    <button className="secondary" disabled={busy}>Guardar entrega</button>
  </form>;
}

export function PrizeCard({ prize, participants, target, run, busy }: { prize: Prize; participants: Participant[]; target: number; run: Run; busy: boolean }) {
  const [editing, setEditing] = useState(false); const [chosen, setChosen] = useState('');
  const eligible = participants.filter(p => p.benefit === 'PRIZE' && p.benefit_status === 'PENDING' && p.confirmed >= target);
  return <article className={`card ${styles.prize}`}>
    {prize.image_url ? <Image src={prize.image_url} alt={prize.name} width={480} height={240} unoptimized /> : <div className={styles.prizePlaceholder}><Gift size={42} /><span>Foto pendiente</span></div>}
    <span className={styles.badge}>{prize.delivered_at ? 'Entregado' : 'Disponible'}</span><h3>{prize.name}</h3>
    {prize.delivered_at ? <p>{prize.customer_name} · {time(prize.delivered_at)}</p> : <>
      <button className="secondary" onClick={() => setEditing(!editing)}>{editing ? 'Cerrar edición' : 'Nombre y foto'}</button>
      {editing && <form className={styles.form} onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); if (await run('promo_edit_prize', { p_prize: prize.id, p_name: String(f.get('name')), p_image: f.get('image') || null })) setEditing(false); }}><label>Nombre<input name="name" required maxLength={120} defaultValue={prize.name} /></label><label>URL de foto (HTTPS)<input name="image" type="url" pattern="https://.*" defaultValue={prize.image_url ?? ''} placeholder="https://…" /></label><button disabled={busy}>Guardar premio</button></form>}
      <select aria-label={`Cliente que retira ${prize.name}`} value={chosen} onChange={e => setChosen(e.target.value)}><option value="">Elegir cliente al retirar</option>{eligible.map(p => <option key={p.id} value={p.id}>{p.customer_name}</option>)}</select>
      <button disabled={busy || !chosen} onClick={() => { if (confirm(`¿Confirmás que entregaste ${prize.name} a ${eligible.find(p => p.id === chosen)?.customer_name}?`)) void run('promo_deliver_prize', { p_participant: chosen, p_prize: prize.id }); }}>Registrar premio entregado</button>
    </>}
  </article>;
}

function DiscountCard({ participant: p, promo, run, busy }: { participant: Participant; promo: Promotion; run: Run; busy: boolean }) {
  const [next, setNext] = useState<{ id: string; orderNumber: number | null; totalAmount: number | null; status: string; isPaid: boolean; promoParticipantId: string | null } | null>(null);
  const [checked, setChecked] = useState(false);
  const eligible = next?.status === 'PENDING' && !next.isPaid && !next.promoParticipantId && next.totalAmount != null && next.totalAmount > 0;
  return <article className={`card ${styles.discount}`}><div><h3>{p.customer_name}</h3><p>{benefitLabel(p, promo)}{p.used_at && ` · ${time(p.used_at)}`}</p></div>
    {p.benefit_status === 'PENDING' && <>
      <button className="secondary" disabled={busy} onClick={async () => {
        const response = await supabase.from('Order').select('id,orderNumber,totalAmount,status,isPaid,promoParticipantId').eq('customerId', p.customer_id).gt('createdAt', p.completed_at!).neq('status', 'CANCELLED').order('createdAt').order('id').limit(1).maybeSingle();
        if (response.error) { alert('No se pudo consultar la próxima compra.'); return; }
        setNext(response.data); setChecked(true);
      }}>Consultar próxima compra</button>
      {checked && <div>{next ? <><p>Pedido #{next.orderNumber} · {formatOrderAmount(next.totalAmount)}</p>{eligible ? <button disabled={busy} onClick={() => {
        if (confirm(`¿Aplicar ${promo.discount_percent}% al pedido #${next.orderNumber}? El importe se actualizará y el beneficio quedará utilizado.`)) void run('promo_apply_discount', { p_participant: p.id, p_order: next.id });
      }}>Aplicar {promo.discount_percent}% · queda {formatOrderAmount(Math.round(next.totalAmount! * (1 - promo.discount_percent / 100) * 100) / 100)}</button> : <p className={styles.notice}>La próxima compra ya está cobrada, entregada o tiene otro descuento. Revisá el caso antes de aplicar el beneficio.</p>}</> : <p>Todavía no hay una compra posterior a completar la promo.</p>}</div>}
    </>}
  </article>;
}

export function Settings({ promo, run, busy, onActivated }: { promo: Promotion; run: Run; busy: boolean; onActivated: () => void }) {
  const [preview, setPreview] = useState<PromotionPreview | null>(null); const [reviewed, setReviewed] = useState(false); const [previewError, setPreviewError] = useState('');
  return <div className={styles.settings}>
    <form className={`card ${styles.form}`} onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void run('promo_configure', { p_campaign: promo.id, p_name: String(f.get('name')), p_start: String(f.get('start')), p_end: f.get('end') || null }); }}>
      <h3>Fechas y reglas</h3><label>Nombre<input name="name" defaultValue={promo.name} required maxLength={120} disabled={promo.status === 'ENDED'} /></label>
      <div className={styles.formGrid}><label>Inicio<input name="start" type="date" defaultValue={promo.starts_on} readOnly={promo.status !== 'DRAFT'} required /></label><label>Fin opcional (incluye ese día)<input name="end" type="date" min={promo.starts_on} defaultValue={promo.ends_on ?? ''} disabled={promo.status === 'ENDED'} /></label></div>
      <p>Meta: {promo.target} packs · {promo.prize_limit} premios distintos · {promo.discount_percent}% para quienes completen después.</p>
      <p>Los pedidos pendientes y entregados suman porciones al registrarse. Al llegar a la meta se reserva premio por orden; se asegura con {promo.target} porciones entregadas. Si no hay lugar, corresponde el descuento y, mientras haya reservas pendientes, lista de espera. Cada cliente utiliza un solo beneficio. Cancelar o ajustar una compra actualiza el avance. Cada cliente participa una vez; no se reinicia automáticamente al completar.</p>
      {promo.status !== 'ENDED' && <button disabled={busy}>Guardar configuración</button>}
    </form>
    {promo.status === 'DRAFT' && <div className={`card ${styles.form}`}>
      <h3>Revisar compras antes de activar</h3><p>La vista previa no cambia pedidos, stock ni precios. Se incorporan una sola vez las compras desde {date(promo.starts_on)}.</p>
      <button className="secondary" disabled={busy} onClick={async () => { setPreviewError(''); setReviewed(false); const r = await supabase.rpc('promo_preview', { p_campaign: promo.id }); if (r.error) setPreviewError(r.error.message); else setPreview(r.data as PromotionPreview); }}>Ver vista previa</button>
      {previewError && <p role="alert" className={styles.error}>{previewError}</p>}
      {preview && <><p><strong>{preview.orders} pedidos</strong> · {preview.confirmed + preview.pending} porciones acumuladas · {preview.confirmed} entregadas · {preview.pending} pendientes de entrega · {preview.unlinked} pedidos sin cliente</p>
        <p className={styles.notice}>El orden histórico se calcula con las fechas de registro y las cantidades actuales de los pedidos. Revisá posibles ajustes anteriores: no se conoce cuándo cambió históricamente cada cantidad.</p>
        {preview.participants.map((p, i) => <details key={p.customer_id ?? i} className={styles.previewPerson}><summary>{p.customer_name ?? 'Sin cliente vinculado'} · {p.confirmed + p.pending} acumuladas · {p.confirmed} entregadas · {p.pending} pendientes de entrega</summary>{p.orders.map((o, j) => <p key={j}>#{o.order_number} · {o.quantity} packs de {o.product_name} · {o.order_status === 'DELIVERED' ? 'Entregado' : 'Pendiente'}</p>)}</details>)}
        {preview.unlinked > 0 && <p className={styles.error}>Vinculá los pedidos sin cliente desde Pedidos antes de activar.</p>}
        <label className={styles.checkbox}><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /> Revisé las compras y confirmo que corresponden a esta promoción.</label>
        <button disabled={busy || !reviewed || preview.unlinked > 0} onClick={async () => { if (await run('promo_activate', { p_campaign: promo.id, p_snapshot: preview.snapshot })) onActivated(); }}>Activar e incorporar compras</button>
      </>}
    </div>}
    {promo.status === 'ACTIVE' && <div className={`card ${styles.form}`}><h3>Finalización manual</h3><p>Deja de incorporar compras nuevas. Los pedidos que ya participaban pueden completar su entrega; los premios y descuentos pendientes se conservan.</p><button className="secondary danger" disabled={busy} onClick={() => { if (confirm('¿Finalizar esta promoción ahora? No se incorporarán compras posteriores. Los beneficios pendientes se conservan.')) void run('promo_finish', { p_campaign: promo.id }); }}>Finalizar promoción</button></div>}
    {promo.status === 'ENDED' && <div className="card"><h3>Promoción finalizada</h3><p>El historial y los beneficios pendientes siguen disponibles. No se incorporan compras nuevas.</p></div>}
  </div>;
}
