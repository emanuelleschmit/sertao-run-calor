// Motor de cálculo do IBUTG (WBGT) ao ar livre, SERTÃO-RUN.
// Método de Liljegren et al. (2008), J Occup Environ Hyg 5(10):645-655,
// doi:10.1080/15459620802310770, a partir de dados meteorológicos padrão.
// IBUTG = 0,7 Tbn + 0,2 Tg + 0,1 Ta.
// Este arquivo é a fonte; o mesmo código vai embutido nas duas páginas.
var IBUTG = (function () {
  var STEFANB = 5.6696e-8, CP = 1003.5, M_AIR = 28.97, M_H2O = 18.015;
  var RATIO = CP * M_AIR / M_H2O, R_GAS = 8314.34, R_AIR = R_GAS / M_AIR;
  var PR = CP / (CP + 1.25 * R_AIR);
  var EMIS_WICK = 0.95, ALB_WICK = 0.4, D_WICK = 0.007, L_WICK = 0.0254;
  var EMIS_GLOBE = 0.95, ALB_GLOBE = 0.05, D_GLOBE = 0.0508;
  var EMIS_SFC = 0.999, ALB_SFC = 0.45, MIN_SPEED = 0.13;
  var SOLAR_CONST = 1367;

  function esat(T) { // hPa, T em K (Buck)
    var tc = T - 273.15;
    return 6.1121 * Math.exp(17.502 * tc / (T - 32.18));
  }
  function viscosity(T) {
    var omega = (T / 97 - 2.9) / 0.4 * (-0.034) + 1.048;
    return 2.6693e-6 * Math.sqrt(M_AIR * T) / (3.617 * 3.617 * omega);
  }
  function thermalCond(T) { return (CP + 1.25 * R_AIR) * viscosity(T); }
  function diffusivity(T, P) {
    var pcrit13 = Math.pow(36.4 * 218, 1 / 3), tcrit512 = Math.pow(132 * 647.3, 5 / 12);
    var tcrit12 = Math.sqrt(132 * 647.3), mmix = Math.sqrt(1 / M_AIR + 1 / M_H2O);
    return 3.64e-4 * Math.pow(T / tcrit12, 2.334) * pcrit13 * tcrit512 * mmix / (P / 1013.25) * 1e-4;
  }
  function evap(T) { return (313.15 - T) / 30 * (-71100) + 2.4073e6; }
  function emisAtm(T, rh) { return 0.575 * Math.pow(rh * esat(T), 0.143); }
  function hSphere(T, P, u) {
    var rho = P * 100 / (R_AIR * T), re = u * rho * D_GLOBE / viscosity(T);
    return (2 + 0.6 * Math.sqrt(re) * Math.pow(PR, 0.3333)) * thermalCond(T) / D_GLOBE;
  }
  function hCyl(T, P, u) {
    var rho = P * 100 / (R_AIR * T), re = u * rho * D_WICK / viscosity(T);
    return 0.281 * Math.pow(re, 0.6) * Math.pow(PR, 0.44) * thermalCond(T) / D_WICK;
  }

  // Posição do Sol (algoritmo NOAA simplificado). Devolve cosseno do zênite.
  function cosZenith(dateUTC, lat, lon) {
    var d = dateUTC, start = Date.UTC(d.getUTCFullYear(), 0, 1);
    var doy = (d.getTime() - start) / 86400000; // fracional
    var hr = d.getUTCHours() + d.getUTCMinutes() / 60;
    var g = 2 * Math.PI / 365 * (doy + (hr - 12) / 24);
    var eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var tst = hr * 60 + eqt + 4 * lon; // minutos, tempo solar verdadeiro
    var ha = (tst / 4 - 180) * Math.PI / 180, phi = lat * Math.PI / 180;
    return Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  }

  // Nascer e pôr do sol (horário local), varrendo o dia de minuto em minuto.
  function sunTimes(y, m, dd, lat, lon, utcOffsetH) {
    var lim = Math.cos((90.833) * Math.PI / 180), rise = null, set = null, prev = null;
    for (var min = 0; min <= 1440; min += 2) {
      var t = new Date(Date.UTC(y, m - 1, dd, 0, min) - utcOffsetH * 3600000);
      var up = cosZenith(t, lat, lon) > lim;
      if (prev !== null && up && !prev && rise === null) rise = min / 60;
      if (prev !== null && !up && prev) set = min / 60;
      prev = up;
    }
    return { nascer: rise, por: set };
  }

  // ta °C, ur %, ventoMs (10 m), solar W/m² (global), direta W/m², pHpa, cza
  function calc(ta, ur, vento10, solar, direta, pHpa, cza) {
    var Tair = ta + 273.15, rh = Math.max(0.01, ur / 100), P = pHpa || 1000;
    // vento de 10 m para 2 m por lei de potência (expoente 0,25)
    var u = Math.max(MIN_SPEED, vento10 * Math.pow(2 / 10, 0.25));
    var S = Math.max(0, solar || 0), fdir = 0;
    if (cza <= 0.01) { S = 0; cza = 0.01; }
    S = Math.min(S, SOLAR_CONST * cza);
    if (S > 0 && direta != null) fdir = Math.min(0.9, Math.max(0, direta / S));
    if (cza < 0.1) fdir = 0; // sol baixo: trata a radiação como difusa
    var ea = emisAtm(Tair, rh), Tsfc = Tair;
    // temperatura de globo
    var tg = Tair, i, tgNew;
    for (i = 0; i < 80; i++) {
      var h = hSphere(0.5 * (tg + Tair), P, u);
      tgNew = Math.pow(0.5 * (ea * Math.pow(Tair, 4) + EMIS_SFC * Math.pow(Tsfc, 4))
        - h / (STEFANB * EMIS_GLOBE) * (tg - Tair)
        + S / (2 * STEFANB * EMIS_GLOBE) * (1 - ALB_GLOBE) * (fdir * (1 / (2 * cza) - 1) + 1 + ALB_SFC), 0.25);
      if (Math.abs(tgNew - tg) < 0.005) { tg = tgNew; break; }
      tg = 0.9 * tg + 0.1 * tgNew;
    }
    // bulbo úmido natural
    var eair = rh * esat(Tair);
    var tw = Tair - 5, twNew, zen = Math.acos(Math.min(1, cza));
    for (i = 0; i < 200; i++) {
      var tref = 0.5 * (tw + Tair), hc = hCyl(tref, P, u);
      var fatm = STEFANB * EMIS_WICK * (0.5 * (ea * Math.pow(Tair, 4) + EMIS_SFC * Math.pow(Tsfc, 4)) - Math.pow(tw, 4))
        + (1 - ALB_WICK) * S * ((1 - fdir) * (1 + 0.25 * D_WICK / L_WICK) + fdir * (Math.tan(zen) / Math.PI + 0.25 * D_WICK / L_WICK) + ALB_SFC);
      var ew = esat(tw), rho = P * 100 / (R_AIR * tref);
      var sc = viscosity(tref) / (rho * diffusivity(tref, P));
      twNew = Tair - evap(tref) / RATIO * (ew - eair) / (P - ew) * Math.pow(PR / sc, 0.56) + fatm / hc;
      if (Math.abs(twNew - tw) < 0.005) { tw = twNew; break; }
      tw = 0.7 * tw + 0.3 * twNew;
    }
    var tbn = tw - 273.15, tgc = tg - 273.15;
    return { ibutg: 0.7 * tbn + 0.2 * tgc + 0.1 * ta, tbn: tbn, tg: tgc };
  }

  // Tabela 3 de Grundstein et al. (2015), Applied Geography 56:55-60,
  // doi:10.1016/j.apgeog.2014.10.014: diretrizes regionais baseadas na política da
  // Georgia High School Association (a mesma da Tabela 5 da NATA, Casa et al., 2015),
  // deslocadas 1,3 °C (categoria 2) e 3,3 °C (categoria 1). Limites superiores inclusivos.
  var CORTES = { 3: [27.8, 30.5, 32.2, 33.3], 2: [26.5, 29.2, 30.9, 32.0], 1: [24.5, 27.2, 28.9, 30.0] };
  var NIVEIS = [
    { id: 1, nome: "Atividade normal", cor: "n1",
      acao: "Treino normal, com pelo menos 3 pausas por hora de no mínimo 3 minutos." },
    { id: 2, nome: "Cautela", cor: "n2",
      acao: "Cuidado com treinos intensos ou longos. Observe de perto quem tem mais risco. Pelo menos 3 pausas por hora de no mínimo 4 minutos." },
    { id: 3, nome: "Restrição", cor: "n3",
      acao: "Treino de no máximo 2 horas, com pelo menos 4 pausas por hora de no mínimo 4 minutos." },
    { id: 4, nome: "Alto risco", cor: "n4",
      acao: "Treino de no máximo 1 hora, sem tiros ou séries de condicionamento, com 20 minutos de pausa distribuídos na hora." },
    { id: 5, nome: "Suspender", cor: "n5",
      acao: "Sem treino ao ar livre. Adie até o IBUTG baixar." }
  ];
  function nivel(v, cat) {
    var c = CORTES[cat || 3];
    for (var i = 0; i < 4; i++) if (v <= c[i]) return NIVEIS[i];
    return NIVEIS[4];
  }
  // Categoria regional pelo critério do artigo: percentil 90 do IBUTG máximo diário
  // na estação quente (lá, maio a setembro; aqui, os 5 meses consecutivos mais quentes).
  function categoria(p90) { return p90 >= 32.3 ? 3 : (p90 > 30.0 ? 2 : 1); }
  function p90Local(diasMax) { // diasMax: {"AAAA-MM-DD": ibutgMax}
    var porMes = {}, k, m;
    for (k in diasMax) { m = +k.slice(5, 7); (porMes[m] = porMes[m] || []).push(diasMax[k]); }
    function media(a) { var s = 0; a.forEach(function (x) { s += x; }); return s / a.length; }
    var melhor = null;
    for (var s = 1; s <= 12; s++) {
      var ms = [0, 1, 2, 3, 4].map(function (j) { return ((s - 1 + j) % 12) + 1; });
      if (ms.some(function (x) { return !porMes[x]; })) continue;
      var v = media(ms.map(function (x) { return media(porMes[x]); }));
      if (!melhor || v > melhor.v) melhor = { ms: ms, v: v };
    }
    var sel = [];
    for (k in diasMax) if (melhor.ms.indexOf(+k.slice(5, 7)) >= 0) sel.push(diasMax[k]);
    sel.sort(function (a, b) { return a - b; });
    return { p90: sel[Math.floor(0.9 * (sel.length - 1))], meses: melhor.ms };
  }

  return { calc: calc, cosZenith: cosZenith, sunTimes: sunTimes, nivel: nivel, NIVEIS: NIVEIS, CORTES: CORTES,
    categoria: categoria, p90Local: p90Local };
})();
if (typeof module !== "undefined") module.exports = IBUTG;
