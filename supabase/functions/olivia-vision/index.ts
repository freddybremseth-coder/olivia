
const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json',
};

type ImageInput={data?:string;url?:string;mimeType?:string;label?:string};
type ReadyImage={data:string;mimeType:string;label?:string};

function secret(...names:string[]){
  for(const name of names){const value=Deno.env.get(name);if(value)return value;}
  return'';
}
function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:corsHeaders});}
function stripDataUrl(value:string){
  const idx=value.indexOf(',');
  return value.startsWith('data:')&&idx>=0?value.slice(idx+1):value;
}
function bytesToBase64(bytes:Uint8Array){
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  }
  return btoa(binary);
}
async function materializeImage(img:ImageInput):Promise<ReadyImage>{
  if(img.data){
    return{data:stripDataUrl(String(img.data)),mimeType:img.mimeType||'image/jpeg',label:img.label};
  }
  if(!img.url)throw new Error('Bilde mangler data/url');
  const res=await fetch(img.url,{signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new Error('Kunne ikke hente referansebilde: HTTP '+res.status);
  const buffer=await res.arrayBuffer();
  if(buffer.byteLength>3_000_000)throw new Error('Referansebilde er for stort (>3 MB)');
  return{
    data:bytesToBase64(new Uint8Array(buffer)),
    mimeType:img.mimeType||res.headers.get('content-type')||'image/jpeg',
    label:img.label,
  };
}
async function prepareImages(images:ImageInput[]){
  const results=await Promise.allSettled(images.slice(0,10).map(materializeImage));
  const ready:ReadyImage[]=[];
  for(const item of results){
    if(item.status==='fulfilled')ready.push(item.value);
  }
  return ready;
}
function geminiParts(prompt:string,images:ReadyImage[]){
  const parts:any[]=[];
  images.forEach((img,index)=>{
    if(img.label)parts.push({text:'BILDE '+(index+1)+' — '+img.label});
    parts.push({inline_data:{mime_type:img.mimeType,data:img.data}});
  });
  parts.push({text:prompt});
  return parts;
}
async function gemini(prompt:string,images:ReadyImage[]){
  const key=secret('FAMILYHUB_GEMINI_API_KEY','GEMINI_API_KEY','GOOGLE_API_KEY');
  if(!key)throw new Error('Gemini key mangler i Supabase Edge Function secrets');
  const res=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+encodeURIComponent(key),{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({contents:[{role:'user',parts:geminiParts(prompt,images)}],generationConfig:{responseMimeType:'application/json'}}),
    signal:AbortSignal.timeout(70000),
  });
  const raw=await res.text();
  if(!res.ok)throw new Error('Gemini '+res.status+': '+raw.slice(0,500));
  const data=JSON.parse(raw);
  const text=data?.candidates?.[0]?.content?.parts?.[0]?.text||'';
  if(!text)throw new Error('Gemini returnerte tomt svar');
  return text;
}
async function claude(prompt:string,images:ReadyImage[]){
  const key=secret('FAMILYHUB_CLAUDE_API_KEY','ANTHROPIC_API_KEY','CLAUDE_API_KEY');
  if(!key)throw new Error('Claude key mangler i Supabase Edge Function secrets');
  const content:any[]=[];
  images.forEach((img,index)=>{
    if(img.label)content.push({type:'text',text:'BILDE '+(index+1)+' — '+img.label});
    content.push({type:'image',source:{type:'base64',media_type:img.mimeType,data:img.data}});
  });
  content.push({type:'text',text:prompt+'\n\nReturner KUN gyldig JSON uten markdown.'});
  const models=['claude-sonnet-4-5-20250929','claude-3-5-haiku-20241022'];
  let last='';
  for(const model of models){
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model,max_tokens:4096,messages:[{role:'user',content}]}),
      signal:AbortSignal.timeout(70000),
    });
    const raw=await res.text();
    if(res.ok){
      const data=JSON.parse(raw);
      const text=data?.content?.[0]?.text||'';
      if(text)return text;
    }
    last='Claude '+res.status+': '+raw.slice(0,500);
    if(res.status!==404&&res.status!==400)break;
  }
  throw new Error(last||'Claude feilet');
}
async function openai(prompt:string,images:ReadyImage[]){
  const key=secret('FAMILYHUB_OPENAI_API_KEY','OPENAI_API_KEY');
  if(!key)throw new Error('OpenAI key mangler i Supabase Edge Function secrets');
  const content:any[]=[];
  images.forEach((img,index)=>{
    if(img.label)content.push({type:'text',text:'BILDE '+(index+1)+' — '+img.label});
    content.push({type:'image_url',image_url:{url:'data:'+img.mimeType+';base64,'+img.data}});
  });
  content.push({type:'text',text:prompt+'\n\nReturner KUN gyldig JSON uten markdown.'});
  const res=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({model:'gpt-4o-mini',max_tokens:4096,messages:[{role:'user',content}]}),
    signal:AbortSignal.timeout(70000),
  });
  const raw=await res.text();
  if(!res.ok)throw new Error('OpenAI '+res.status+': '+raw.slice(0,500));
  const data=JSON.parse(raw);
  const text=data?.choices?.[0]?.message?.content||'';
  if(!text)throw new Error('OpenAI returnerte tomt svar');
  return text;
}

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'POST only'},405);
  try{
    const body=await req.json();
    const prompt=String(body?.prompt||'').trim();
    const rawImages=(Array.isArray(body?.images)?body.images:[]) as ImageInput[];
    if(!prompt)return json({error:'prompt is required'},400);
    if(!rawImages.length)return json({error:'at least one image is required'},400);
    const images=await prepareImages(rawImages);
    if(!images.length)return json({error:'no readable images'},400);

    const errors:string[]=[];
    for(const [provider,fn] of [['gemini',gemini],['claude',claude],['openai',openai]] as const){
      try{
        const text=await fn(prompt,images);
        return json({text,provider,imageCount:images.length});
      }catch(e:any){
        errors.push(provider+': '+(e?.message||String(e)));
      }
    }
    return json({error:'Alle Supabase AI-providerne feilet',details:errors},502);
  }catch(e:any){
    return json({error:e?.message||'Unknown error'},500);
  }
});
