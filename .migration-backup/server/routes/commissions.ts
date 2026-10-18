import { Router, type Request, type Response } from 'express';
import { z, ZodError } from 'zod';
import { pool } from '../db';
import { DBStorage } from '../dbStorage';

export const commissionsRouter=Router();
const percentage=z.number().finite().min(0).max(100).refine(
  n=>Math.abs(n*100-Math.round(n*100))<1e-8,'Use at most two decimal places');
const bulkInput=z.object({
  percentage,pujaIds:z.array(z.number().int().positive()).min(1).max(5000).transform(ids=>Array.from(new Set(ids))),
});
const defaultInput=z.object({percentage,replaceOverrides:z.boolean().default(false)});
const fail=(status:number,message:string)=>Object.assign(new Error(message),{status});

async function admin(req:Request) {
  if(!req.session.userId) throw fail(401,'Please sign in');
  const user=(await pool.query('SELECT id,role,"isBlocked" FROM users WHERE id=$1',[req.session.userId])).rows[0];
  if(!user||user.isBlocked||user.role!=='admin') throw fail(403,'Admin access required');
  return user.id as number;
}
const endpoint=(handler:(req:Request,res:Response)=>Promise<any>)=>async(req:Request,res:Response)=>{
  try {await handler(req,res);}
  catch(error:any) {
    if(error instanceof ZodError) return res.status(400).json({message:error.errors.map(e=>e.message).join('; ')});
    if(!error.status) console.error('Commission settings failed',error);
    res.status(error.status||500).json({message:error.status?error.message:'Unable to update commission settings'});
  }
};
async function write(fn:(client:any)=>Promise<any>) {
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(8164,0)');
    const result=await fn(client);
    await client.query('COMMIT');
    return result;
  } catch(error) {await client.query('ROLLBACK');throw error;}
  finally {client.release();}
}

commissionsRouter.get('/api/admin/commissions',endpoint(async(req,res)=>{
  await admin(req);
  const settings=(await pool.query(`SELECT s.*,
    COALESCE(jsonb_agg(jsonb_build_object('puja_id',o.puja_id,'percentage',o.percentage))
      FILTER (WHERE o.puja_id IS NOT NULL),'[]'::jsonb) AS overrides
    FROM puja_commission_settings s LEFT JOIN puja_commission_overrides o ON TRUE
    WHERE s.id=1 GROUP BY s.id`)).rows[0];
  if(!settings) throw fail(503,'Commission settings are not initialized');
  const overrides=new Map<number,number>(settings.overrides.map((r:any)=>[r.puja_id,Number(r.percentage)]));
  const pujas=await new DBStorage().getAllPujas();
  res.json({defaultPercentage:Number(settings.percentage),configured:settings.configured,updatedAt:settings.updated_at,
    pujas:pujas.map(p=>({id:p.id,name:p.name,basePrice:Number(p.basePrice??p.price),salePrice:p.price==null?null:Number(p.price),
      overridePercentage:overrides.get(p.id)??null,effectivePercentage:overrides.get(p.id)??Number(settings.percentage)}))});
}));
commissionsRouter.put('/api/admin/commissions/default',endpoint(async(req,res)=>{
  const userId=await admin(req);
  const input=defaultInput.parse(req.body);
  await write(async(client)=>{
    if(input.replaceOverrides) await client.query('DELETE FROM puja_commission_overrides');
    await client.query(`UPDATE puja_commission_settings SET percentage=$1,configured=true,updated_by=$2,updated_at=NOW() WHERE id=1`,
      [input.percentage,userId]);
  });
  res.json({message:input.replaceOverrides?'Commission updated for every puja; individual overrides removed':'Default commission updated; individual overrides preserved'});
}));
commissionsRouter.put('/api/admin/commissions/pujas',endpoint(async(req,res)=>{
  const userId=await admin(req);
  const input=bulkInput.parse(req.body);
  await write(async(client)=>{
    const existing=(await client.query('SELECT id FROM pujas WHERE id=ANY($1::int[]) FOR KEY SHARE',[input.pujaIds])).rows;
    if(existing.length!==input.pujaIds.length) throw fail(400,'One or more selected pujas no longer exist');
    await client.query(`INSERT INTO puja_commission_overrides(puja_id,percentage,updated_by,updated_at)
      SELECT id,$2,$3,NOW() FROM unnest($1::int[]) id
      ON CONFLICT(puja_id) DO UPDATE SET percentage=EXCLUDED.percentage,updated_by=EXCLUDED.updated_by,updated_at=EXCLUDED.updated_at`,
      [input.pujaIds,input.percentage,userId]);
  });
  res.json({message:`Commission saved for ${input.pujaIds.length} puja(s)`});
}));
commissionsRouter.delete('/api/admin/commissions/pujas/:id',endpoint(async(req,res)=>{
  await admin(req);
  const id=z.coerce.number().int().positive().parse(req.params.id);
  await write(async(client)=>{
    if(!(await client.query('SELECT id FROM pujas WHERE id=$1 FOR KEY SHARE',[id])).rows.length) throw fail(404,'Puja not found');
    await client.query('DELETE FROM puja_commission_overrides WHERE puja_id=$1',[id]);
  });
  res.json({message:'Puja now uses the default commission'});
}));
