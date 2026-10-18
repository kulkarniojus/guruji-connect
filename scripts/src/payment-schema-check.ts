import {pool} from '../../artifacts/api-server/src/db';
try {
  const result=await pool.query(`SELECT table_name,column_name,data_type,udt_name,column_default
    FROM information_schema.columns WHERE table_schema='public'
    AND table_name=ANY($1) ORDER BY table_name,ordinal_position`,
    [['payments','notifications','booking_requests']]);
  console.log(JSON.stringify(result.rows));
} finally { await pool.end(); }
