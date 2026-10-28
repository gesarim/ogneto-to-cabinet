import { env } from 'cloudflare:workers';
import { defaults } from '../../lib';

export async function GET(){
  const db=env.DB;
  if(!db)return Response.json({error:'Хранилище недоступно'},{status:503});
  const [ps,st]=await Promise.all([db.prepare('SELECT id,token,data,created_at,updated_at FROM proposals ORDER BY updated_at DESC').all(),db.prepare('SELECT data FROM settings WHERE id = ?').bind('main').first<{data:string}>()]);
  return Response.json({proposals:ps.results.map((x:any)=>({...JSON.parse(x.data),id:x.id,token:x.token,createdAt:x.created_at,updatedAt:x.updated_at})),settings:st?JSON.parse(st.data):defaults});
}
export async function POST(req:Request){
  const db=env.DB;
  if(!db)return Response.json({error:'Хранилище недоступно'},{status:503});
  const body:any=await req.json();
  if(body.kind==='settings'){
    await db.prepare('INSERT INTO settings(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind('main',JSON.stringify(body.data)).run();
    return Response.json({ok:true});
  }
  if(body.kind==='proposal'){
    const p=body.data;
    if(!p || !Array.isArray(p.groups) || !Array.isArray(p.trips))return Response.json({error:'Не удалось прочитать данные КП'},{status:400});
    if(p.groups.some((g:any)=>Number(g.quantity)<0||Number(g.replace)<0||Number(g.replace)>Number(g.quantity))||p.trips.some((t:any)=>Number(t.km)<0||Number(t.count)<0))return Response.json({error:'Проверьте количество, замены и километраж: значения не могут быть отрицательными, а замен не может быть больше количества'},{status:400});
    if(p.status!=='Черновик'&&(!p.client?.trim()||!p.object?.trim()||!p.address?.trim()||!p.groups.some((g:any)=>g.brand?.trim()&&Number(g.quantity)>0)))return Response.json({error:'Для готового КП укажите заказчика, объект, адрес и хотя бы одну группу огнетушителей с маркой и количеством'},{status:400});
    const id=p.id||crypto.randomUUID(),token=p.token||crypto.randomUUID().replaceAll('-',''),now=Date.now();
    await db.prepare('INSERT INTO proposals(id,token,data,created_at,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').bind(id,token,JSON.stringify(p),p.createdAt||now,now).run();
    return Response.json({id,token,createdAt:p.createdAt||now,updatedAt:now});
  }
  return Response.json({error:'Неизвестный запрос'},{status:400});
}
