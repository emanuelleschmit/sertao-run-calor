// Gera as páginas a partir de src/. Uso: node gerar.js
//   docs/index.html                      versão 1, publicada pelo GitHub Pages
//   SERTAO-RUN_Calor_v1_estimativa.html  versão 1, cópia local (não vai para o repositório)
//   SERTAO-RUN_Calor_v2_campo.html       versão 2 com registro do TGD-400, uso da equipe (não vai para o repositório)
const fs = require("fs"), path = require("path");
const d = __dirname, src = f => fs.readFileSync(path.join(d, "src", f), "utf8");
const modelo = src("modelo.html"), motor = src("ibutg-motor.js").replace(/^if \(typeof module.*$/m, "");
const versoes = [
  { arq: "SERTAO-RUN_Calor_v1_estimativa.html", titulo: "SERTÃO-RUN Calor", h1: "Calor no treino de corrida",
    versao: "Versão 1 · estimativa, para uso imediato", modo: "agora", campo: "", js: "" },
  { arq: "SERTAO-RUN_Calor_v2_campo.html", titulo: "SERTÃO-RUN Calor de Campo", h1: "Calor no treino de corrida: estimado e medido",
    versao: "Versão 2 · estimativa com registro do TGD-400", modo: "campo", campo: src("campo.html"),
    js: "<script>\n" + src("campo.js") + "\n</script>" }
];
for (const v of versoes) {
  const html = modelo.replace("__TITULO__", v.titulo).replace("__H1__", v.h1).replace("__VERSAO__", v.versao)
    .replace("__MODO__", v.modo).replace("__MOTOR__", () => motor)
    .replace("<!--CAMPO-->", () => v.campo).replace("<!--CAMPO_JS-->", () => v.js);
  fs.writeFileSync(path.join(d, v.arq), html, "utf8");
  console.log("gerado", v.arq);
  if (v.modo === "agora") {
    const pub = path.join(d, "docs");
    fs.mkdirSync(pub, { recursive: true });
    const meta = '<meta name="description" content="IBUTG estimado e risco de calor para treinos de corrida no Vale do São Francisco. Projeto SERTÃO-RUN, UPE Campus Petrolina.">\n';
    fs.writeFileSync(path.join(pub, "index.html"), html.replace("<title>", meta + "<title>"), "utf8");
    fs.writeFileSync(path.join(pub, ".nojekyll"), "", "utf8");
    console.log("gerado docs/index.html");
  }
}
