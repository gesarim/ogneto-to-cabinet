import { env } from 'cloudflare:workers';
import { calculate,defaults,rub,Proposal,Settings } from '../../lib';
import PrintButton from '../PrintButton';
export const dynamic='force-dynamic';
export default async function Share({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const row=await env.DB!.prepare('SELECT data FROM proposals WHERE token = ?').bind(token).first<{data:string}>();
  if(!row)return <main style={{padding:40}}>КП не найдено или ссылка недействительна.</main>;
  const p=JSON.parse(row.data) as Proposal;
  const st=await env.DB!.prepare('SELECT data FROM settings WHERE id = ?').bind('main').first<{data:string}>();
  const s=p.settingsSnapshot||(st?JSON.parse(st.data) as Settings:defaults),c=calculate(p,s);
  return <main className="share"><div className="sharehead"><span className="mark">✳</span><span>{s.company}</span><span className="muted">{new Date(p.updatedAt||Date.now()).toLocaleDateString('ru-RU')}</span><PrintButton/></div><p className="eyebrow">КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ · {p.number||'Без номера'}</p><h1>{s.templateIntro}</h1><p className="lede">{p.client} · {p.object}</p><section className="sharegrid"><div><small>Адрес объекта</small><strong>{p.address}</strong></div><div><small>Тариф</small><strong>{{minimum:'Минимальный',basic:'Базовый',full:'Полный аутсорсинг'}[p.tariff]}</strong></div><div><small>Огнетушителей</small><strong>{c.qty} шт.</strong></div><div><small>Статус расчёта</small><strong>{c.confirmed?'Подтверждённый':'Предварительный'}</strong></div></section><h2>Объём работ</h2><p>Первичная проверка: {c.firstHours.toFixed(1)} ч · Выборка: {c.sample} шт. · Замены: {c.replace} шт. · Вторая проходка: {c.secondHours.toFixed(1)} ч.</p><h2>Состав расчёта</h2><table><tbody>{[['Первичная проверка и замена',c.labor],['Выборка для проверки',c.sampleCost],['Логистика',c.logistics],['Замены',c.replacements],['Резерв',c.reserve],['Хранение',c.storage],['Акт и отчёт',c.report],['Пакет услуг',c.base]].filter((x)=>Number(x[1])>0).map(([label,value])=><tr key={String(label)}><td>{label}</td><td>{rub(Number(value))}</td></tr>)}</tbody></table><div className="sharetotal"><span>Итого</span><strong>{rub(c.total)}</strong></div><p className="muted">{s.templateFooter}</p>{p.notes&&<p className="muted">Примечание: {p.notes}</p>}<footer>{s.email} {s.phone}</footer></main>
}
