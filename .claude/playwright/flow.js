const { chromium } = require(process.env.PLAYWRIGHT_PATH || '/Users/randalubis/.npm/_npx/9833c18b2d85bc59/node_modules/playwright');
const S=process.argv[2]; require('fs').mkdirSync(S+'/shots',{recursive:true});
(async()=>{
 const br=await chromium.launch({executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 for (const [n,vp,m] of [['m',{width:390,height:844},true],['d',{width:1440,height:900},false]]){
  const ctx=await br.newContext({viewport:vp,isMobile:m,hasTouch:m,deviceScaleFactor:m?2:1}); const p=await ctx.newPage();
  await p.goto('http://localhost:3000/'); await p.waitForTimeout(800);
  await p.screenshot({path:`${S}/shots/${n}-flow0.png`});
  const plus=p.getByRole('button',{name:/tambah|\+|increase/i}).first();
  if(await plus.isDisabled()){console.log(n,'STORE PAUSED (plus disabled): flow1/2 skipped'); await p.screenshot({path:`${S}/shots/${n}-flow-paused.png`}); await ctx.close(); continue;}
  const t=Date.now(); await plus.click(); await p.waitForFunction(()=>document.body.innerText.includes('Rp50.000')||true); console.log(n,'plus ms',Date.now()-t);
  console.log(await p.evaluate(()=>[...document.querySelectorAll('button')].map(b=>(b.getAttribute('aria-label')||b.textContent).trim()).join(' | ')));
  await p.screenshot({path:`${S}/shots/${n}-flow1.png`});
  await p.getByRole('button',{name:/Lanjutkan/}).click(); await p.waitForTimeout(600);
  await p.screenshot({path:`${S}/shots/${n}-flow2.png`});
  await p.screenshot({path:`${S}/shots/${n}-flow2full.png`,fullPage:true});
  console.log(await p.evaluate(()=>[...document.querySelectorAll('input,select,textarea,button')].map(b=>`${b.tagName}:${b.name||b.type||''}:${(b.getAttribute('aria-label')||b.placeholder||b.textContent||'').trim().slice(0,30)}`).join(' | ')));
  await ctx.close();
 }
 await br.close();
})();
