import { env } from 'cloudflare:workers';
import { PDFDocument, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {calculate,defaults,Proposal,Settings,rub} from '../../../../lib';

export const dynamic='force-dynamic';
const dark=rgb(.17,.19,.18),muted=rgb(.42,.45,.43),red=rgb(.76,.10,.12),line=rgb(.88,.88,.87);
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!env.DB)return new Response('Хранилище недоступно',{status:503});
  const row=await env.DB.prepare('SELECT data,token FROM proposals WHERE id = ?').bind(id).first<{data:string,token:string}>();
  if(!row)return new Response('КП не найдено',{status:404});
  const p=JSON.parse(row.data) as Proposal;
  const st=await env.DB.prepare('SELECT data FROM settings WHERE id = ?').bind('main').first<{data:string}>();
  const s=p.settingsSnapshot||(st?JSON.parse(st.data) as Settings:defaults),c=calculate(p,s);
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  const fontResponse=await fetch(new URL('/fonts/DejaVuSans.ttf',request.url));
  if(!fontResponse.ok)return new Response('Шрифт PDF недоступен',{status:500});
  const font=await doc.embedFont(await fontResponse.arrayBuffer(),{subset:true});
  let page=doc.addPage([595.28,841.89]),y=790;
  const addPage=()=>{page=doc.addPage([595.28,841.89]);y=790};
  const ensure=(height:number)=>{if(y-height<58)addPage()};
  const wrap=(value:string,size:number,width:number)=>{const out:string[]=[];let current='';for(const word of String(value||'—').split(/\s+/)){const next=current?current+' '+word:word;if(font.widthOfTextAtSize(next,size)>width&&current){out.push(current);current=word}else current=next}if(current)out.push(current);return out};
  const text=(value:string,size=10,color=dark,space=16)=>{const lines=wrap(value,size,485);ensure(lines.length*space+4);for(const part of lines){page.drawText(part,{x:52,y,size,font,color});y-=space}};
  const heading=(value:string)=>{ensure(35);y-=8;text(value,13,red,20);y-=5};
  const rowLine=(label:string,value:string)=>{ensure(28);page.drawText(label,{x:52,y,size:9,font,color:muted});page.drawText(value,{x:543-font.widthOfTextAtSize(value,10),y,size:10,font,color:dark});y-=20;page.drawLine({start:{x:52,y:y+7},end:{x:543,y:y+7},thickness:.5,color:line})};
  page.drawRectangle({x:0,y:828,width:595,height:14,color:red});
  try{const logoResponse=await fetch(new URL('/logo.png',request.url));if(logoResponse.ok){const logo=await doc.embedPng(await logoResponse.arrayBuffer());page.drawImage(logo,{x:52,y:742,width:48,height:48})}}catch{}
  page.drawText(s.company||'Компания',{x:111,y:767,size:14,font,color:dark});
  page.drawText(p.number||'КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ',{x:111,y:747,size:8,font,color:muted});
  y=710;text(s.templateIntro||'Коммерческое предложение на техническое обслуживание огнетушителей',20,dark,27);y-=12;
  text(`Заказчик: ${p.client||'Не указан'}`,10);text(`Объект: ${p.object||'Не указан'}`,10);text(`Адрес: ${p.address||'Не указан'}`,10);
  text(`Статус: ${p.status||'Черновик'} · Данные: ${c.confirmed?'подтверждены':'предварительные'}`,9,muted,15);
  heading('Параметры расчёта');
  text(`Огнетушителей: ${c.qty} шт. · Выборка по марке: ${c.sample} шт. · Замен: ${c.replace} шт.`,10);
  text(`Первичная проходка: ${c.firstHours.toFixed(1)} ч · Вторая проходка: ${c.secondHours.toFixed(1)} ч`,10);
  const tariff={minimum:'Минимальный',basic:'Базовый',full:'Полный аутсорсинг'}[p.tariff]||'Минимальный';
  text(`Тариф: ${tariff}`,10);
  const services=p.tariff==='minimum'?s.minimumServices:p.tariff==='basic'?s.basicServices:s.fullServices;
  text(`Состав услуг: ${services}`,9,muted,15);
  heading('Стоимость');
  for(const [label,value] of [['Первичная проверка и замена',c.labor],['Выборка для проверки',c.sampleCost],['Логистика',c.logistics],['Замены',c.replacements],['Резерв',c.reserve],['Хранение',c.storage],['Акт и отчёт',c.report],['Тарифный пакет',c.base]] as [string,number][])if(value>0)rowLine(label,rub(value));
  ensure(54);y-=20;page.drawText('ИТОГО',{x:52,y,size:13,font,color:dark});const total=rub(c.total);page.drawText(total,{x:543-font.widthOfTextAtSize(total,17),y,size:17,font,color:red});y-=34;
  if(p.notes){heading('Примечание');text(p.notes,9,muted,15)}
  y-=8;text(s.templateFooter||'',8,muted,13);y-=8;text([s.email,s.phone].filter(Boolean).join(' · '),8,muted,13);
  const bytes=await doc.save();
  const safe=(p.number||'predlozhenie').replace(/[^a-zA-Z0-9_-]/g,'_');
  return new Response(bytes as BodyInit,{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="${safe}.pdf"`,'cache-control':'no-store'}});
}
