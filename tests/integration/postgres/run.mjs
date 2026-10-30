import {spawn} from 'node:child_process';
import {readFile,readdir} from 'node:fs/promises';
const name=`viagelato-test-${process.pid}`;
function docker(args,input){return new Promise((resolve,reject)=>{
 const child=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let stdout='',stderr='';
 child.stdout.on('data',data=>stdout+=data);child.stderr.on('data',data=>stderr+=data);
 child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(new Error(stderr||stdout)));
 child.stdin.end(input);
});}
const sql=text=>docker(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],text);
try{
 await docker(['run','-d','--rm','--name',name,'-e','POSTGRES_PASSWORD=disposable-test-only','postgres:17-alpine']);
 let ready=false;
 for(let i=0;i<30;i++){try{await sql('select 1;');ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,500));}}
 if(!ready)throw new Error('PostgreSQL did not start');
 await sql(await readFile('tests/integration/postgres/bootstrap.sql','utf8'));
 await sql(await readFile('supabase/schema.sql','utf8'));
 for(const file of (await readdir('supabase/patches')).filter(file=>file.endsWith('.sql')).sort())
  await sql(await readFile(`supabase/patches/${file}`,'utf8'));
 for(const file of (await readdir('supabase/migrations')).filter(file=>file.endsWith('.sql')).sort())
  await sql(await readFile(`supabase/migrations/${file}`,'utf8'));
 for(const file of ['checkout-invariants.sql','security-invariants.sql'])
  console.log((await sql(await readFile(`tests/integration/postgres/${file}`,'utf8'))).trim());
 const attempts=await Promise.all(Array.from({length:12},()=>sql("select public.consume_checkout_attempt('concurrent-test',gen_random_uuid(),3,10);")));
 if(attempts.filter(value=>value.trim()==='t').length!==3)throw new Error('Concurrent rate limit bypass');
 console.log('VIAGELATO_CONCURRENT_LIMIT_OK (3/12 admitted)');
}finally{await docker(['rm','-f',name]).catch(()=>{});}
