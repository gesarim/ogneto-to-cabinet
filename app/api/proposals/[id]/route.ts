import { env } from 'cloudflare:workers';
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  await env.DB!.prepare('DELETE FROM proposals WHERE id = ?').bind(id).run();
  return Response.json({ok:true});
}
