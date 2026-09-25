const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/Users/randalubis/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const S = process.argv[2]; require('fs').mkdirSync(S+'/shots',{recursive:true});
const B = 'http://localhost:3000';
const lum = c => { const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}); return .2126*a[0]+.7152*a[1]+.0722*a[2]; };
const analyze = () => {
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if(!m) return null; const p=m[1].split(/[ ,\/]+/).map(Number); return {r:p[0],g:p[1],b:p[2],a:p[3]===undefined?1:p[3]}; };
  const L = c => { const a=[c.r,c.g,c.b].map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)}); return .2126*a[0]+.7152*a[1]+.0722*a[2]; };
  const blend=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
  const bgOf = el => { let stack=[]; let e=el; while(e){ const c=parse(getComputedStyle(e).backgroundColor); if(c&&c.a>0){stack.push(c); if(c.a>=1)break;} e=e.parentElement;} let base={r:255,g:255,b:255,a:1}; for(let i=stack.length-1;i>=0;i--) base=blend(stack[i],base); return base; };
  const bad=[]; const small=[]; 
  document.querySelectorAll('body *').forEach(el=>{
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none') return;
    const r=el.getBoundingClientRect(); if(r.width===0||r.height===0) return;
    const hasText=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());
    if(hasText){ let fg=parse(cs.color); if(fg){ const bg=bgOf(el); fg=blend({...fg,a:fg.a*(+cs.opacity||1)},bg); const l1=L(fg),l2=L(bg); const ratio=(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); const fs=parseFloat(cs.fontSize); const large=fs>=24||(fs>=18.66&&+cs.fontWeight>=700); const need=large?3:4.5; if(ratio<need) bad.push({t:el.textContent.trim().slice(0,40),ratio:+ratio.toFixed(2),need,fs,cls:el.className&&el.className.toString().slice(0,30)}); }}
    if(['A','BUTTON','INPUT','SELECT','TEXTAREA'].includes(el.tagName)||el.getAttribute('role')==='button'){ if(r.width<44||r.height<44) small.push({t:(el.textContent||el.getAttribute('aria-label')||el.name||'').trim().slice(0,30),w:Math.round(r.width),h:Math.round(r.height),tag:el.tagName}); }
  });
  const tiny=[...document.querySelectorAll('body *')].filter(el=>[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&parseFloat(getComputedStyle(el).fontSize)<12).length;
  const noLabel=[...document.querySelectorAll('input,select,textarea')].filter(i=>!i.labels?.length&&!i.getAttribute('aria-label')&&!i.getAttribute('aria-labelledby')&&i.type!=='hidden').map(i=>i.name||i.type);
  const noName=[...document.querySelectorAll('button,a')].filter(b=>!(b.textContent.trim()||b.getAttribute('aria-label')||b.title)).length;
  return {bad:bad.slice(0,25),badCount:bad.length,small:small.slice(0,25),smallCount:small.length,tiny,noLabel,noName,overflowX:document.documentElement.scrollWidth>innerWidth,sw:document.documentElement.scrollWidth,h1:document.querySelectorAll('h1').length,lang:document.documentElement.lang,title:document.title};
};
(async()=>{
  const br = await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const out={};
  for (const [vn,vp,mobile] of [['m',{width:390,height:844},true],['d',{width:1440,height:900},false]]) {
    for (const scheme of ['light','dark']) {
      const ctx = await br.newContext({viewport:vp,isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,colorScheme:scheme});
      await ctx.addInitScript(()=>{window.__lcp=0;new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});});
      const page = await ctx.newPage(); const errs=[]; page.on('console',m=>{if(m.type()==='error')errs.push(m.text().slice(0,120))}); page.on('pageerror',e=>errs.push('PE '+e.message.slice(0,120)));
      const visit = async (name,url)=>{ const t=Date.now(); await page.goto(B+url,{waitUntil:'load'}); await page.waitForTimeout(900); const nav=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {ttfb:Math.round(n.responseStart),dcl:Math.round(n.domContentLoadedEventEnd),load:Math.round(n.loadEventEnd),lcp:Math.round(window.__lcp),cls:+window.__cls.toFixed(3),kb:Math.round(performance.getEntriesByType('resource').reduce((a,r)=>a+(r.transferSize||0),0)/1024)}}); const a=await page.evaluate(analyze); out[`${vn}-${scheme}-${name}`]={nav,...a,errs:[...errs]}; await page.screenshot({path:`${S}/shots/${vn}-${scheme}-${name}.png`,fullPage:true}); };
      await visit('store','/'); await visit('login','/login');
      await page.fill('input[name=email]','audit@test.local'); await page.fill('input[name=password]','auditpass'); await Promise.all([page.waitForURL(/founder/,{timeout:20000}).catch(()=>{}),page.click('button[type=submit]')]);
      await page.waitForTimeout(1500);
      for (const p of ['','/orders','/stock','/availability','/finance']) await visit('f'+(p.replace('/','-')||'-home'),'/founder'+p);
      await ctx.close();
    }
  }
  require('fs').writeFileSync(S+'/result.json',JSON.stringify(out,null,1));
  await br.close();
})().catch(e=>{console.error(e);process.exit(1)});
