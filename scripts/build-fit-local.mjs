// Build the local analyzer from the same computations as the Edge Function.
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
const source=readFileSync('supabase/functions/analyze-fit/index.ts','utf8');
const helpers=source.slice(source.indexOf('function num('),source.indexOf('const handler ='));
let computation=source.slice(source.indexOf('      const parser ='),source.indexOf('      const startMs ='));
computation=computation.replace(/const profileRes = await supabase[^;]+;/,'const profileRes = {data:{hr_max_bpm:hrMax}};');
await build({stdin:{contents:`import FitParser from 'fit-file-parser';\n${helpers}\nexport async function analyzeLocalFit(bytes,activityType='football',hrMax=null){\nif(bytes.byteLength>20*1024*1024)throw new Error('FIT exceeds 20 MB limit');\nif(bytes.byteLength<12||new TextDecoder().decode(new Uint8Array(bytes,8,4))!=='.FIT')throw new Error('Archivo FIT inválido');\n${computation}\nreturn {summary,report,hrZones,speedZones,trackPoints,strengthSets};\n}`,resolveDir:process.cwd(),loader:'ts'},tsconfigRaw:{compilerOptions:{}},bundle:true,format:'esm',platform:'browser',minify:true,outfile:'vendor/fit-local.js',legalComments:'eof'});
