const PERIODS=['初唐','盛唐','中唐','晚唐','五代十國'];
const GENRES=['別集序','墓誌銘'];
const GENRE_COLOR={'別集序':'#287d78','墓誌銘':'#d27835'};
const PATTERN_COLORS=['#356f8d','#6c5b9b','#b16845','#54966e','#b49a46','#888'];
const $=s=>document.querySelector(s);
let DB;
fetch('dashboard-v4.json').then(r=>r.json()).then(data=>{DB=data;setup();render()}).catch(e=>{$('#analysis').innerHTML='<div class=card style="color:#a00">資料載入失敗：'+e+'</div>'});
function setOptions(id,values,all=true){$(id).innerHTML=(all?'<option value="">全部</option>':'')+values.map(x=>`<option value="${x}">${x}</option>`).join('')}
function setup(){
 setOptions('#version',['最終仲裁','Qwen 3.8 Max','DeepSeek Flash'],false); // default is first, never "全部"
 setOptions('#period',PERIODS);setOptions('#author',[...new Set(DB.articles.map(x=>x.author))].sort());setOptions('#genre',GENRES);
 document.querySelectorAll('select,input').forEach(x=>x.addEventListener('input',render));$('#patternGenre').addEventListener('input',()=>drawPatterns(selected()));
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));let t=b.dataset.tab;$('#analysis').classList.toggle('hide',t!=='analysis');$('#corpus').classList.toggle('hide',t!=='corpus');render()});
}
function selected(){let v=$('#version').value,p=$('#period').value,u=$('#author').value,g=$('#genre').value,q=$('#query').value.trim();return DB.articles.filter(a=>a.labels&&a.labels[v]&&(!p||a.period===p)&&(!u||a.author===u)&&(!g||a.genre===g)&&(!q||[a.title,a.author,...a.texts].join('').includes(q)))}
function labels(a){return a&&a.labels&&a.labels[$('#version').value]||[]}
function metric(articles,test){let yes=0,n=0;articles.forEach(a=>labels(a).forEach(s=>{n++;if(test(s))yes++}));return n?yes/n:null}
function esc(s){return String(s).replace(/[&<>]/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[x]))}
function lineChart(articles,test){
 let periods=PERIODS.filter(p=>!$('#period').value||p===$('#period').value), W=900,H=340,L=70,R=55,T=25,B=48,iw=W-L-R,ih=H-T-B;
 let xs=periods.map((_,i)=>L+(periods.length===1?iw/2:i*iw/(periods.length-1)));let svg='';
 [0,.25,.5,.75,1].forEach(v=>{let y=T+(1-v)*ih;svg+=`<line class="gridline" x1="${L}" x2="${W-R}" y1="${y}" y2="${y}"/><text class="label" x="${L-10}" y="${y+4}" text-anchor="end">${v*100}%</text>`});
 periods.forEach((p,i)=>svg+=`<text class="label" x="${xs[i]}" y="${H-15}" text-anchor="middle">${p}</text>`);
 GENRES.filter(g=>!$('#genre').value||g===$('#genre').value).forEach(g=>{let vals=periods.map(p=>metric(articles.filter(a=>a.period===p&&a.genre===g),test));let pts=vals.map((v,i)=>v===null?null:[xs[i],T+(1-v)*ih,v]);let chunks=[];let cur=[];pts.forEach(p=>{if(p)cur.push(p);else if(cur.length){chunks.push(cur);cur=[]}});if(cur.length)chunks.push(cur);chunks.forEach(c=>svg+=`<polyline points="${c.map(p=>p.slice(0,2).join(',')).join(' ')}" fill="none" stroke="${GENRE_COLOR[g]}" stroke-width="4"/>`);pts.forEach((p,i)=>{if(!p)return;svg+=`<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${GENRE_COLOR[g]}"/><text class="point-label" x="${p[0]}" y="${p[1]-11}" text-anchor="middle" fill="${GENRE_COLOR[g]}">${(p[2]*100).toFixed(1)}%</text>`})});return svg;
}
function render(){let a=selected();drawAnalysis(a);drawCorpus(a)}
function drawAnalysis(a){
 let bj=a.filter(x=>x.genre==='別集序'),mz=a.filter(x=>x.genre==='墓誌銘'),authors=new Set(a.map(x=>x.author));$('#overview').innerHTML=`<div class="stat"><b>${a.length}</b>篇文章</div><div class="stat"><b>${bj.length}</b>篇別集序</div><div class="stat"><b>${mz.length}</b>篇同作者墓誌銘</div><div class="stat"><b>${a.reduce((n,x)=>n+labels(x).length,0).toLocaleString()}</b>句・${authors.size}位作者</div>`;
 $('#eraCounts').innerHTML='<div class="count-grid">'+PERIODS.map(p=>{let x=a.filter(d=>d.period===p),b=x.filter(d=>d.genre==='別集序').length,m=x.filter(d=>d.genre==='墓誌銘').length;return `<div class="count-cell"><b>${p}</b><span style="color:var(--bj)">別集序 ${b}</span><br><span style="color:var(--mz)">墓誌銘 ${m}</span><br><small>合計 ${b+m}</small></div>`}).join('')+'</div>';
 $('#formTrend').innerHTML=lineChart(a,s=>s.form==='駢');
 let all=PERIODS.map(p=>{let b=metric(a.filter(x=>x.period===p&&x.genre==='別集序'),s=>s.form==='駢'),m=metric(a.filter(x=>x.period===p&&x.genre==='墓誌銘'),s=>s.form==='駢');return b!==null&&m!==null?[p,b,m,m-b]:null}).filter(Boolean);
 $('#formFinding').innerHTML=all.length?'讀圖摘要：'+all.map(x=>`${x[0]}墓誌銘較別集序${x[3]>=0?'高':'低'} <b>${Math.abs(x[3]*100).toFixed(1)}</b> 個百分點`).join('；')+'。':'請放寬篩選以比較兩種文體。';
 let indicators=[['敘事句比例',s=>s.mode==='敘事'],['議論句比例',s=>s.mode==='議論'],['人物書寫比例',s=>s.object==='人'],['書籍／編纂比例',s=>s.object==='書'],['文學評論比例',s=>s.object==='文學評論']];
 $('#strategyCharts').innerHTML=indicators.map(([name,test])=>`<div class="mini"><h3>${name}</h3><div class="legend"><span class="key" style="--c:var(--bj)">別集序</span><span class="key" style="--c:var(--mz)">墓誌銘</span></div><div class="chart-wrap"><svg class="chart" viewBox="0 0 900 340">${lineChart(a,test)}</svg></div></div>`).join('');
 drawPatterns(a);drawAuthors(a);
}
const PATTERN_DEF={
 '品評—傳述—編述型':'由文學或作品評價切入，轉述作者生平，再交代文集的編纂、流傳或體例。',
 '傳述—編述型':'以作者生平、才德或交遊為核心，繼而說明文集如何編成或流傳。',
 '品評／傳述交織型':'文學評價與人物傳述反覆交替，書籍編纂並非主要收束。',
 '傳述主導型':'全篇主要敘述人物，書籍說明與文學評論所占很少。',
 '編述主導型':'以文集的整理、體例、篇卷或流傳為全文中心。',
 '家世—行狀—銘贊型':'由家世譜系及生平仕宦展開，並以銘辭、頌德或哀悼收束。',
 '傳述複合型':'人物生平為主，但穿插其他對象或非典型區段，未形成標準銘贊收束。'};
const EXEMPLAR={'品評—傳述—編述型':'王勃集序','傳述—編述型':'太尉衛公會昌一品集序','品評／傳述交織型':'唐御史大夫贈司徒讚皇文獻公李棲筠文集序','傳述主導型':'寒山子詩集序','編述主導型':'唐太子校書李觀文集序','家世—行狀—銘贊型':'從弟去盈墓誌銘','傳述複合型':'唐丞相金紫光祿大夫守太保致仕贈太傅岐國公杜公墓誌銘（並序）'};
function exampleHTML(doc){if(!doc)return '目前篩選下無代表篇。';let l=labels(doc);return `<div class="example"><b>${doc.genre}｜${esc(doc.title)}</b>（${esc(doc.author)}）<div class="ribbon" style="--n:${l.length}">${l.map(s=>`<i class="f-${s.form}"></i>`).join('')}</div><p>${doc.texts.map((t,i)=>`<span class="sentence text-${l[i].form}" title="${l[i].form}｜${l[i].mode}／${l[i].object}">${t}</span>`).join('')}</p></div>`}
function drawPatterns(a){
 let g=$('#patternGenre').value,docs=a.filter(x=>x.genre===g),patterns=[...new Set(docs.map(x=>x.strategy))].sort(),color=Object.fromEntries(patterns.map((p,i)=>[p,PATTERN_COLORS[i%PATTERN_COLORS.length]]));
 $('#patternDefinitions').innerHTML=patterns.map(p=>{let ex=docs.find(x=>x.title===EXEMPLAR[p])||docs.find(x=>x.strategy===p);return `<details class="pattern-def"><summary><span class="key" style="--c:${color[p]}">${p}</span></summary><p>${PATTERN_DEF[p]||'其他區段次序的複合模式。'}</p><p><b>判定方法：</b>壓縮全文連續重複的敘述對象，略去純過渡後，依「人／書／文學評論」的先後關係歸類。</p>${exampleHTML(ex)}</details>`}).join('')||'目前篩選無模式資料。';
 let W=900,H=370,L=70,R=145,T=25,B=45,iw=W-L-R,ih=H-T-B,x=i=>L+i*iw/4,y=v=>T+(1-v)*ih,svg='';[0,.25,.5,.75,1].forEach(v=>svg+=`<line class="gridline" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text class="label" x="${L-8}" y="${y(v)+4}" text-anchor="end">${v*100}%</text>`);PERIODS.forEach((p,i)=>svg+=`<text class="label" x="${x(i)}" y="${H-13}" text-anchor="middle">${p}</text>`);patterns.forEach((pat,j)=>{let vals=PERIODS.map(p=>{let q=docs.filter(d=>d.period===p);return q.length?q.filter(d=>d.strategy===pat).length/q.length:null}),pts=vals.map((v,i)=>v===null?null:[x(i),y(v),v]).filter(Boolean);if(pts.length>1)svg+=`<polyline points="${pts.map(q=>q[0]+','+q[1]).join(' ')}" fill="none" stroke="${color[pat]}" stroke-width="3"/>`;pts.forEach(q=>svg+=`<circle cx="${q[0]}" cy="${q[1]}" r="5" fill="${color[pat]}"><title>${pat} ${(q[2]*100).toFixed(1)}%</title></circle>`);if(pts.length){let q=pts.at(-1);svg+=`<text x="${q[0]+8}" y="${q[1]+4}" font-size="11" fill="${color[pat]}">${pat}</text>`}});$('#patternTrend').innerHTML=svg;$('#patternLegend').innerHTML=patterns.map(p=>`<span class="key" style="--c:${color[p]}">${p}</span>`).join('');
}
function drawAuthors(a){
 let z={};a.forEach(doc=>{let x=z[doc.author]||(z[doc.author]={period:doc.period,別集序:[0,0],墓誌銘:[0,0]});labels(doc).forEach(s=>{x[doc.genre][1]++;if(s.form==='駢')x[doc.genre][0]++})});
 let rows=Object.entries(z).filter(([,x])=>x.別集序[1]&&x.墓誌銘[1]).map(([author,x])=>{let b=x.別集序[0]/x.別集序[1],m=x.墓誌銘[0]/x.墓誌銘[1];return {author,period:x.period,b,m,d:m-b}}).sort((x,y)=>y.d-x.d);
 let era=PERIODS.map(p=>{let q=rows.filter(x=>x.period===p);return q.length?{p,n:q.length,abs:q.reduce((s,x)=>s+Math.abs(x.d),0)/q.length,signed:q.reduce((s,x)=>s+x.d,0)/q.length}:null}).filter(Boolean),W=900,H=330,L=80,R=40,T=30,B=55,iw=W-L-R,ih=H-T-B,max=Math.max(.01,...era.map(x=>x.abs)),bw=Math.min(90,iw/Math.max(1,era.length)*.55),svg='';[0,.5,1].forEach(v=>{let yy=T+(1-v)*ih;svg+=`<line class="gridline" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text class="label" x="${L-8}" y="${yy+4}" text-anchor="end">${(v*max*100).toFixed(0)}%</text>`});era.forEach((e,i)=>{let x=L+(i+.5)*iw/era.length,h=e.abs/max*ih,y=T+ih-h;svg+=`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${h}" fill="#6f7890"><title>${e.p}：${e.n}位作者，平均絕對差 ${(e.abs*100).toFixed(1)}%</title></rect><text x="${x}" y="${y-8}" text-anchor="middle" class="point-label">${(e.abs*100).toFixed(1)}%</text><text x="${x}" y="${H-28}" text-anchor="middle" class="label">${e.p}</text><text x="${x}" y="${H-11}" text-anchor="middle" class="label">${e.n}位</text>`});$('#eraGap').innerHTML=svg;
 $('#gapFinding').innerHTML=era.length?'平均絕對差越高，表示該時代同作者的兩種文體在駢散選擇上分化越明顯。'+era.map(e=>`${e.p} ${e.abs*100>=10?'<b>':''}${(e.abs*100).toFixed(1)}%${e.abs*100>=10?'</b>':''}（平均方向差 ${e.signed>=0?'+':''}${(e.signed*100).toFixed(1)}%）`).join('；')+'。':'目前篩選下沒有可配對作者。';
 $('#authors').innerHTML=rows.length?`<table class="table"><thead><tr><th>作者</th><th>時代</th><th style="color:var(--bj)">別集序駢率</th><th style="color:var(--mz)">墓誌銘駢率</th><th>差值</th><th>文體選擇</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.author)}</b></td><td>${x.period}</td><td>${(x.b*100).toFixed(1)}%</td><td>${(x.m*100).toFixed(1)}%</td><td class="${x.d>=0?'delta-up':'delta-down'}">${x.d>=0?'+':''}${(x.d*100).toFixed(1)}%</td><td>${x.d>.05?'墓誌銘更駢':x.d<-.05?'別集序更駢':'兩體接近'}</td></tr>`).join('')}</tbody></table>`:'目前篩選下沒有同時包含兩種文體的作者。';
 let detail=Object.entries(z).map(([author,x])=>({author,period:x.period,b:x.別集序[1]?x.別集序[0]/x.別集序[1]:null,m:x.墓誌銘[1]?x.墓誌銘[0]/x.墓誌銘[1]:null})).sort((u,v)=>PERIODS.indexOf(u.period)-PERIODS.indexOf(v.period)||u.author.localeCompare(v.author)),last='',html='';detail.forEach(x=>{if(x.period!==last){html+=`<div class="era-sep">${x.period}</div>`;last=x.period}html+=`<div class="author-row"><div class="leftbar">${x.b===null?'':`<span>${(x.b*100).toFixed(1)}%</span><i style="width:${x.b*100}%"></i>`}</div><div class="author-name">${esc(x.author)}</div><div class="rightbar">${x.m===null?'':`<i style="width:${x.m*100}%"></i><span>${(x.m*100).toFixed(1)}%</span>`}</div></div>`});$('#authorBars').innerHTML=html||'無作者資料。';
}
function drawCorpus(a){
 $('#articles').innerHTML=a.slice(0,100).map(doc=>{let l=labels(doc);return `<article class="article"><h3>${doc.genre}｜${esc(doc.title)}</h3><p>${esc(doc.author)}・${doc.period}　<span class="pill">${doc.strategy}</span>　<a href="${doc.source}" target="_blank">原始來源</a></p><small>形式軌</small><div class="ribbon" style="--n:${l.length}">${l.map(s=>`<i class="f-${s.form}" title="${s.form}"></i>`).join('')}</div><small>功能軌</small><div class="ribbon" style="--n:${l.length}">${l.map(s=>`<i class="m-${s.mode}" title="${s.mode}"></i>`).join('')}</div><p>${doc.texts.map((t,i)=>`<span class="sentence text-${l[i].form}" title="${l[i].form}｜${l[i].mode}／${l[i].object}／${l[i].focus}">${t}</span>`).join('')}</p></article>`}).join('')||'無符合條件的文章';
}
