(function(){
"use strict";
var A=window.APP, $=function(id){return document.getElementById(id);};
var CHAVE="sertaorun_medicoes_tgd400_v1", regs=[], cache={};
function ler(){ try{ regs=JSON.parse(localStorage.getItem(CHAVE)||"[]")||[]; }catch(e){ regs=[]; } }
function gravar(){ try{ localStorage.setItem(CHAVE,JSON.stringify(regs)); return true; }catch(e){ return false; } }
function num(s){ if(s==null) return null; s=String(s).trim().replace(",","."); if(s==="") return null; var v=parseFloat(s); return isNaN(v)?null:v; }
function st(t,erro){ var s=$("m_st"); s.textContent=t||""; s.className="status"+(erro?" erro":""); }
function hNum(h){ var p=h.split(":"); return +p[0]+(+p[1]||0)/60; }

$("m_data").value=A.hoje();
var agora=new Date(); $("m_hora").value=A.pad(agora.getHours())+":"+A.pad(agora.getMinutes());

// estimativa interpolada no minuto da leitura
function estimar(r){
  var loc=A.local(), lat=r.lat!=null?r.lat:loc.lat, lon=r.lon!=null?r.lon:loc.lon;
  var k=r.data+"|"+lat.toFixed(3)+"|"+lon.toFixed(3);
  if(A.difDias(r.data,A.hoje())>15) return Promise.reject(new Error("data muito à frente"));
  var p=cache[k]||(cache[k]=A.carregarDia(lat,lon,r.data));
  return p.then(function(d){
    var h=hNum(r.hora), a=Math.floor(h), b=Math.min(23,a+1), f=h-a;
    var xa=d.horas[a], xb=d.horas[b]; if(!xa||!xb) throw new Error("sem dado");
    return xa.ibutg+(xb.ibutg-xa.ibutg)*f;
  });
}

function niveis(r){ return r.est==null?null:A.nivel(r.med).id+"/"+A.nivel(r.est).id; }

function estatisticas(){
  var v=regs.filter(function(r){return r.est!=null;}), n=v.length, box=$("m_stats");
  if(!n){ box.innerHTML='<div><span>Leituras com estimativa</span><b>0</b></div>'; $("m_ba").innerHTML=""; $("m_baTxt").textContent="A concordância aparece a partir da primeira leitura salva."; return; }
  var d=v.map(function(r){return r.med-r.est;}), m=d.reduce(function(a,b){return a+b;},0)/n;
  var sd=n>1?Math.sqrt(d.reduce(function(a,b){return a+(b-m)*(b-m);},0)/(n-1)):0;
  var mae=d.reduce(function(a,b){return a+Math.abs(b);},0)/n;
  var igual=v.filter(function(r){return A.nivel(r.med).id===A.nivel(r.est).id;}).length;
  var acima=v.filter(function(r){return A.nivel(r.med).id>A.nivel(r.est).id;}).length;
  box.innerHTML=[["Leituras",String(n)],["Viés (medido − estimado)",A.fmt(m)+" °C"],["Limites de concordância",n>1?A.fmt(m-1.96*sd)+" a "+A.fmt(m+1.96*sd)+" °C":"--"],["Erro absoluto médio",A.fmt(mae)+" °C"],["Mesmo nível de risco",Math.round(100*igual/n)+" %"],["Medido em nível mais alto",Math.round(100*acima/n)+" %"]]
    .map(function(a){return "<div><span>"+a[0]+"</span><b>"+a[1]+"</b></div>";}).join("");
  // Bland-Altman
  var W=760,H=260,L=44,R=12,T=14,B=34;
  var xs=v.map(function(r){return (r.med+r.est)/2;}), xmin=Math.floor(Math.min.apply(null,xs)-1), xmax=Math.ceil(Math.max.apply(null,xs)+1);
  var lim=Math.max(3,Math.ceil(Math.max.apply(null,d.map(Math.abs).concat([Math.abs(m)+2*sd]))+0.5));
  function X(x){return L+(W-L-R)*(x-xmin)/(xmax-xmin||1);} function Y(y){return T+(H-T-B)*(lim-y)/(2*lim);}
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Gráfico de Bland-Altman">';
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(0)+'" y2="'+Y(0)+'" stroke="var(--line)"/>';
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(m)+'" y2="'+Y(m)+'" stroke="var(--rio)" stroke-width="1.5"/>';
  if(n>1){ [m-1.96*sd,m+1.96*sd].forEach(function(y){ s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(y)+'" y2="'+Y(y)+'" stroke="var(--n4)" stroke-dasharray="5 4"/>'; }); }
  for(var t=-lim;t<=lim;t+=Math.max(1,Math.round(lim/3))) s+='<text x="'+(L-6)+'" y="'+(Y(t)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+t+'</text>';
  var passo=Math.max(1,Math.round((xmax-xmin)/6));
  for(var x=xmin;x<=xmax;x+=passo) s+='<text x="'+X(x)+'" y="'+(H-12)+'" text-anchor="middle" font-size="11" fill="var(--muted)">'+x+'</text>';
  v.forEach(function(r){ s+='<circle cx="'+X((r.med+r.est)/2)+'" cy="'+Y(r.med-r.est)+'" r="4.5" fill="var(--rio)" fill-opacity=".75"><title>'+A.esc(r.data+" "+r.hora+" "+r.ponto)+'</title></circle>'; });
  s+='<text x="'+L+'" y="'+(T-2)+'" font-size="11" fill="var(--muted)">Diferença medido − estimado (°C)</text>';
  s+='<text x="'+(W-R)+'" y="'+(H-12)+'" text-anchor="end" font-size="11" fill="var(--muted)">média dos dois (°C)</text></svg>';
  $("m_ba").innerHTML=s;
  $("m_baTxt").textContent="Linha azul: viés médio. Tracejado vermelho: limites de concordância de 95% (viés ± 1,96 desvio-padrão). Viés positivo indica que a estimativa subestima o calor medido no local."+(n<30?" Com menos de 30 leituras, trate estes números como preliminares.":"");
}

function tabela(){
  var tb=$("m_tb"); tb.textContent="";
  regs.slice().sort(function(a,b){return (b.data+b.hora).localeCompare(a.data+a.hora);}).forEach(function(r){
    var tr=document.createElement("tr");
    var dif=r.est!=null?r.med-r.est:null;
    [A.fmtData(r.data),r.hora,r.ponto,r.medidor,A.fmt(r.med),r.est!=null?A.fmt(r.est):"pendente",dif!=null?(dif>0?"+":"")+A.fmt(dif):"--",niveis(r)||"--",r.resp||""].forEach(function(c){
      var td=document.createElement("td"); td.textContent=c; tr.appendChild(td);
    });
    var td=document.createElement("td"), b=document.createElement("button"); b.type="button"; b.textContent="Excluir";
    b.addEventListener("click",function(){
      if(b.dataset.ok){ regs=regs.filter(function(x){return x.id!==r.id;}); gravar(); atualizar(); }
      else { b.dataset.ok="1"; b.textContent="Confirmar"; setTimeout(function(){ if(b.isConnected){ delete b.dataset.ok; b.textContent="Excluir"; } },4000); }
    });
    td.appendChild(b); tr.appendChild(td); tb.appendChild(tr);
  });
  if(!regs.length){ var tr=document.createElement("tr"), td=document.createElement("td"); td.colSpan=10; td.className="status"; td.textContent="Nenhuma leitura registrada. A primeira aparece aqui assim que for salva."; tr.appendChild(td); tb.appendChild(tr); }
}
function atualizar(){ tabela(); estatisticas(); A.recalcular(); }

function completarPendentes(){
  var pend=regs.filter(function(r){return r.est==null;});
  if(!pend.length) return Promise.resolve();
  return Promise.all(pend.map(function(r){ return estimar(r).then(function(e){ r.est=e; }).catch(function(){}); }))
    .then(function(){ gravar(); atualizar(); });
}

$("fm").addEventListener("submit",function(e){
  e.preventDefault();
  var med=num($("m_ibutg").value);
  if(med==null||med<5||med>50){ st("Informe o IBUTG medido em °C, entre 5 e 50.",true); return; }
  var r={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),data:$("m_data").value,hora:$("m_hora").value,ponto:$("m_ponto").value.trim(),
    medidor:$("m_med").value,med:med,ta:num($("m_ta").value),ur:num($("m_ur").value),tg:num($("m_tg").value),tbn:num($("m_tbn").value),
    lat:num($("m_lat").value),lon:num($("m_lon").value),resp:$("m_resp").value.trim(),obs:$("m_obs").value.trim(),est:null};
  regs.push(r); var ok=gravar(); atualizar();
  st(ok?"Leitura salva. Calculando a estimativa do mesmo horário...":"Leitura registrada, mas este navegador não permite salvar: exporte o CSV agora.",!ok);
  $("m_ibutg").value=""; $("m_ta").value=""; $("m_ur").value=""; $("m_tg").value=""; $("m_tbn").value=""; $("m_obs").value="";
  estimar(r).then(function(v){ r.est=v; gravar(); atualizar(); st("Leitura salva: medido "+A.fmt(r.med)+" °C, estimado "+A.fmt(v)+" °C."); })
    .catch(function(){ st("Leitura salva. A estimativa fica pendente até haver conexão; ela é refeita ao abrir a página.",true); });
});

var COLS=["id","data","hora","ponto","lat","lon","medidor","responsavel","ibutg_medido","ta_medida","ur_medida","tg_medido","tbn_medido","ibutg_estimado","observacao"];
var MAP={responsavel:"resp",ibutg_medido:"med",ta_medida:"ta",ur_medida:"ur",tg_medido:"tg",tbn_medido:"tbn",ibutg_estimado:"est",observacao:"obs"};
function campoCSV(v){ if(v==null) return ""; if(typeof v==="number") return String(v.toFixed(2)).replace(".",","); v=String(v); return /[;"\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }
$("m_csv").addEventListener("click",function(){
  if(!regs.length){ st("Ainda não há leituras para exportar.",true); return; }
  var linhas=[COLS.join(";")].concat(regs.map(function(r){ return COLS.map(function(c){ return campoCSV(r[MAP[c]||c]); }).join(";"); }));
  var blob=new Blob(["﻿"+linhas.join("\r\n")],{type:"text/csv;charset=utf-8"});
  var a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="sertaorun_tgd400_"+A.hoje()+".csv";
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500);
  st(regs.length+" leituras exportadas.");
});
function parseCSV(txt){
  var out=[],row=[],f="",q=false;
  for(var i=0;i<txt.length;i++){ var c=txt[i];
    if(q){ if(c==='"'){ if(txt[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true; else if(c===";"){row.push(f);f="";} else if(c==="\n"){row.push(f);out.push(row);row=[];f="";} else if(c!=="\r") f+=c; }
  if(f!==""||row.length){row.push(f);out.push(row);} return out;
}
$("m_imp").addEventListener("change",function(){
  var file=this.files[0]; if(!file) return;
  var fr=new FileReader();
  fr.onload=function(){
    var rows=parseCSV(String(fr.result).replace(/^﻿/,"")), cab=rows.shift()||[], idx={}, novos=0;
    cab.forEach(function(c,i){ idx[c.trim()]=i; });
    if(idx.ibutg_medido==null||idx.data==null){ st("Arquivo sem as colunas esperadas (data e ibutg_medido).",true); return; }
    var ids={}; regs.forEach(function(r){ids[r.id]=1;});
    rows.forEach(function(rw){
      if(rw.length<2) return; var r={};
      COLS.forEach(function(c){ var v=idx[c]!=null?rw[idx[c]]:""; r[MAP[c]||c]=v; });
      ["med","ta","ur","tg","tbn","est","lat","lon"].forEach(function(k){ r[k]=num(r[k]); });
      if(r.med==null||!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) return;
      if(!r.id) r.id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      if(ids[r.id]) return; ids[r.id]=1; regs.push(r); novos++;
    });
    gravar(); atualizar(); st(novos+" leituras importadas.");
    completarPendentes();
  };
  fr.readAsText(file,"utf-8"); this.value="";
});

window.CAMPO={
  pontosDoDia:function(dia){ return regs.filter(function(r){return r.data===dia;}).map(function(r){return {h:hNum(r.hora),v:r.med};}); },
  medidaNaJanela:function(res){
    var box=$("medidaBox"), fim=res.ini+res.dur/60;
    var lst=regs.filter(function(r){ var h=hNum(r.hora); return r.data===res.dia && h>=res.ini-0.25 && h<=fim+0.25; });
    if(!lst.length){ box.hidden=true; return; }
    var mx=lst.reduce(function(a,b){return b.med>a.med?b:a;});
    var n=A.nivel(mx.med);
    box.textContent="Medido no local: "+A.fmt(mx.med)+" °C às "+mx.hora+" ("+mx.ponto+", "+mx.medidor+"), nível "+n.id+" · "+n.nome+". Quando houver medição, vale a medição.";
    box.hidden=false;
  }
};
ler(); atualizar(); completarPendentes();
})();
