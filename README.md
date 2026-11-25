# SERTÃO-RUN Calor

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24533604.svg)](https://doi.org/10.5281/zenodo.24533604)

Calculadora de estresse térmico para treinos de corrida no Vale do São Francisco (Petrolina, PE, e Juazeiro, BA). Estima o IBUTG (índice de bulbo úmido e termômetro de globo, em inglês WBGT) hora a hora, classifica o risco do treino e mostra o melhor horário com e sem luz do dia.

Ferramenta do projeto SERTÃO-RUN, Universidade de Pernambuco, Campus Petrolina, apoiado pela FACEPE (APQ, Edital 28/2026).

Acesse: https://emanuelleschmit.github.io/sertao-run-calor/

## O que a página faz

- Calcula o IBUTG estimado para o local, a data, o horário de início e a duração do treino.
- Classifica o risco em cinco níveis, com recomendações de duração e pausas.
- Mostra a curva do IBUTG ao longo do dia, com o período sem luz do dia marcado.
- Sugere a janela mais fresca com luz do dia e a janela mais fresca na madrugada.
- Para datas distantes, usa a média de 10 anos e o dia quente típico (percentil 90).

Nenhuma consulta é enviada a servidor do projeto. A página roda inteira no navegador e busca apenas dados meteorológicos públicos.

## Método

O IBUTG é calculado pelo método de Liljegren et al. (2008): IBUTG = 0,7 × bulbo úmido natural + 0,2 × temperatura de globo + 0,1 × temperatura do ar. Os dados horários vêm do Open-Meteo: previsão para até 15 dias, reanálise ERA5 para datas passadas e média de 10 anos para datas mais distantes. A radiação de cada hora é a média da hora anterior, e o vento de 10 m é convertido para 2 m.

A escala de risco segue a Tabela 3 de Grundstein et al. (2015), que ajusta os limiares à aclimatação regional. A categoria de cada local é calculada pelo critério do artigo: percentil 90 do IBUTG máximo diário na estação quente (aqui, os 5 meses consecutivos mais quentes do local, em 10 anos de ERA5). Petrolina e Juazeiro resultam em 30,8 °C (novembro a março, 2016 a 2025), categoria 2, que é a escala padrão adotada pelo projeto.

| Nível | Categoria 2 (padrão) | Recomendação |
|---|---|---|
| 1 · Atividade normal | até 26,5 °C | Pelo menos 3 pausas por hora de no mínimo 3 minutos |
| 2 · Cautela | 26,6 a 29,2 °C | Cuidado com treinos intensos ou longos; 3 pausas por hora de no mínimo 4 minutos |
| 3 · Restrição | 29,3 a 30,9 °C | Treino de até 2 horas; 4 pausas por hora de no mínimo 4 minutos |
| 4 · Alto risco | 31,0 a 32,0 °C | Treino de até 1 hora, sem tiros; 20 minutos de pausa na hora |
| 5 · Suspender | acima de 32,0 °C | Sem treino ao ar livre |

## Limites

- É uma estimativa em grade de cerca de 10 km. Não capta o microclima da rota e não substitui a medição no local com medidor de IBUTG.
- As diretrizes de Grundstein et al. (2015) foram desenvolvidas para os Estados Unidos e pressupõem atletas aclimatados. Não há tabela validada para o semiárido brasileiro.
- Com o mesmo IBUTG, o calor seco permite mais perda de calor que o úmido (Vanos et al., 2020), o que pode tornar a categoria 2 cautelosa no semiárido. A calibração com medições locais é objetivo do projeto.
- A página é apoio à decisão. Não substitui avaliação profissional nem atendimento de emergência (SAMU 192).

## Estrutura

```
src/ibutg-motor.js   cálculo do IBUTG, posição do sol e escalas de risco
src/modelo.html      página (layout, busca de dados, gráfico)
src/campo.html       bloco de registro do medidor TGD-400 (versão 2, uso da equipe)
src/campo.js         lógica do registro e da concordância (Bland-Altman)
gerar.js             monta as páginas a partir de src/
docs/index.html      versão 1 publicada pelo GitHub Pages
```

Para regerar depois de editar `src/`: `node gerar.js`. Os arquivos `SERTAO-RUN_Calor_v1_estimativa.html` e `SERTAO-RUN_Calor_v2_campo.html` são gerados na raiz para uso local e não entram no repositório.

## Referências

1. GRUNDSTEIN, A. et al. Regional heat safety thresholds for athletics in the contiguous United States. *Applied Geography*, v. 56, p. 55-60, 2015. DOI: https://doi.org/10.1016/j.apgeog.2014.10.014.
2. CASA, D. J. et al. National Athletic Trainers' Association position statement: exertional heat illnesses. *Journal of Athletic Training*, v. 50, n. 9, p. 986-1000, 2015. DOI: https://doi.org/10.4085/1062-6050-50.9.07.
3. LILJEGREN, J. C. et al. Modeling the wet bulb globe temperature using standard meteorological measurements. *Journal of Occupational and Environmental Hygiene*, v. 5, n. 10, p. 645-655, 2008. DOI: https://doi.org/10.1080/15459620802310770.
4. HOSOKAWA, Y. et al. Exertional heat illness incidence and on-site medical team preparedness in warm weather. *International Journal of Biometeorology*, v. 62, n. 7, p. 1147-1153, 2018. DOI: https://doi.org/10.1007/s00484-018-1517-3.
5. OYAMA, T. et al. Validation of upper thermal thresholds for outdoor sports using thermal physiology modelling. *Temperature*, v. 11, n. 1, p. 92-106, 2024. DOI: https://doi.org/10.1080/23328940.2023.2210477.
6. ROBERTS, W. O. et al. ACSM expert consensus statement on exertional heat illness: recognition, management, and return to activity. *Current Sports Medicine Reports*, v. 22, n. 4, p. 134-149, 2023. DOI: https://doi.org/10.1249/JSR.0000000000001058.
7. VANOS, J. K. et al. Variations in athlete heat-loss potential between hot-dry and warm-humid environments at equivalent wet-bulb globe temperature thresholds. *Journal of Athletic Training*, v. 55, n. 11, p. 1190-1198, 2020. DOI: https://doi.org/10.4085/1062-6050-313-19.

Dados meteorológicos: Open-Meteo (https://open-meteo.com/), licença CC BY 4.0. Inspiração: calculadora Calor no Esporte, de Diêgo Augusto (https://esporteseguro.lovable.app/).

## Autoria e citação

Emanuelle Francine Detogni Schmit, Universidade de Pernambuco. ORCID: https://orcid.org/0000-0002-5530-2773. Os dados de citação estão em `CITATION.cff`.

Como citar (ABNT NBR 6023:2025):

SCHMIT, E. F. D. *SERTÃO-RUN Calor*: calculadora de estresse térmico para corrida no Vale do São Francisco. Versão 1.0.0. [*S. l.*]: Zenodo, 2026. Software. DOI: https://doi.org/10.5281/zenodo.24533605.

O DOI https://doi.org/10.5281/zenodo.24533604 sempre aponta para a versão mais recente.

## Licença

Código sob licença MIT (ver `LICENSE`). Os dados meteorológicos seguem a licença do Open-Meteo (CC BY 4.0).
