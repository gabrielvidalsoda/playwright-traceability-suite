/* global fetch, console, URL, AbortSignal */
/**
 * Espera que um ambiente publicado esteja no ar — e, se pedido, na versão esperada —
 * antes de a pipeline pós-deploy correr os testes.
 *
 * Porquê: com GitOps/ArgoCD (e em geral com qualquer deploy assíncrono) o fim da pipeline
 * da app não significa que a versão nova já está a servir. Testar logo a seguir ao merge
 * corre contra a versão anterior. Este passo separa "deploy não concluído" de "teste falhou".
 *
 * Variáveis de ambiente:
 *   BASE_URL          URL do ambiente                       (obrigatória)
 *   VERSAO_ESPERADA   SHA/versão que se espera ver no ar     (opcional; vazio = só espera o
 *                                                             ambiente responder)
 *   CAMINHO_VERSAO    endpoint que devolve a versão em JSON  (default /version.json)
 *   ESPERA_MAX_S      tempo máximo de espera, em segundos    (default 600)
 *   INTERVALO_S       intervalo entre tentativas             (default 20)
 *   ESPERA_FIXA_S     espera fixa quando o endpoint de versão ainda não existe
 *                     (paliativo — ver todo.md)              (default 0)
 *
 * Códigos de saída:
 *   0  pronto (ou versão não verificável e espera fixa cumprida — com aviso)
 *   2  configuração inválida
 *   3  ambiente inacessível dentro do tempo (rede/VPN/ambiente em baixo)
 *   4  ambiente no ar mas a versão esperada não apareceu dentro do tempo (deploy não concluído)
 *
 * Uso:  BASE_URL=https://ccmmc-dev.min-saude.pt VERSAO_ESPERADA=abc1234 node ferramentas/aguardar-versao.mjs
 */
import process from 'node:process';
import { setTimeout as esperar } from 'node:timers/promises';

const numero = (valor, omissao) => {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : omissao;
};

const BASE_URL = (process.env.BASE_URL ?? '').trim().replace(/\/+$/, '');
const VERSAO_ESPERADA = (process.env.VERSAO_ESPERADA ?? '').trim().toLowerCase();
const CAMINHO_VERSAO = process.env.CAMINHO_VERSAO ?? '/version.json';
const ESPERA_MAX_S = numero(process.env.ESPERA_MAX_S, 600);
const INTERVALO_S = numero(process.env.INTERVALO_S, 20);
const ESPERA_FIXA_S = numero(process.env.ESPERA_FIXA_S, 0);

const log = (msg) => console.log(`[aguardar-versao] ${msg}`);

if (!BASE_URL) {
  log('ERRO: BASE_URL não definida.');
  process.exit(2);
}
try {
  new URL(BASE_URL);
} catch {
  log(`ERRO: BASE_URL inválida: "${BASE_URL}".`);
  process.exit(2);
}

const limite = Date.now() + ESPERA_MAX_S * 1000;
const restaTempo = () => Date.now() < limite;

async function obter(url) {
  try {
    const resposta = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'follow' });
    const corpo = await resposta.text();
    return {
      ok: resposta.ok,
      estado: resposta.status,
      tipo: resposta.headers.get('content-type') ?? '',
      corpo,
    };
  } catch (erro) {
    return {
      ok: false,
      estado: 0,
      tipo: '',
      corpo: '',
      erro: erro?.cause?.code ?? erro?.name ?? String(erro),
    };
  }
}

/** Extrai a versão de um JSON: aceita `commit`, `sha`, `versao` ou `version`. */
function versaoDe(resposta) {
  if (!resposta.ok) return undefined;
  // O nginx da UI faz fallback SPA: um endpoint inexistente devolve 200 com o index.html.
  if (!resposta.tipo.includes('json') && !resposta.corpo.trimStart().startsWith('{'))
    return undefined;
  try {
    const dados = JSON.parse(resposta.corpo);
    const valor = dados.commit ?? dados.sha ?? dados.versao ?? dados.version;
    return typeof valor === 'string' && valor.trim() ? valor.trim().toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/** SHA curto vs longo: basta um ser prefixo do outro (mín. 7 caracteres). */
const coincide = (noAr, esperada) =>
  noAr === esperada ||
  (Math.min(noAr.length, esperada.length) >= 7 &&
    (noAr.startsWith(esperada) || esperada.startsWith(noAr)));

// 1. O ambiente responde?
log(`A aguardar ${BASE_URL} (máx. ${ESPERA_MAX_S}s)…`);
for (;;) {
  const r = await obter(BASE_URL);
  if (r.ok) {
    log(`Ambiente no ar (HTTP ${r.estado}).`);
    break;
  }
  if (!restaTempo()) {
    log(
      `ERRO: ambiente inacessível — último resultado: ${r.estado ? `HTTP ${r.estado}` : r.erro}. ` +
        'Se for rede/VPN, o runner não chega ao ambiente (ver todo.md, Passo 0).',
    );
    process.exit(3);
  }
  log(
    `Ainda não responde (${r.estado ? `HTTP ${r.estado}` : r.erro}); nova tentativa em ${INTERVALO_S}s.`,
  );
  await esperar(INTERVALO_S * 1000);
}

// 2. Está na versão esperada?
if (!VERSAO_ESPERADA) {
  log('VERSAO_ESPERADA vazia — não se verifica a versão.');
  process.exit(0);
}

const urlVersao = `${BASE_URL}${CAMINHO_VERSAO.startsWith('/') ? '' : '/'}${CAMINHO_VERSAO}`;
log(`A aguardar a versão ${VERSAO_ESPERADA} em ${urlVersao}…`);
let ultima;
for (let tentativa = 1; ; tentativa++) {
  const r = await obter(urlVersao);
  const noAr = versaoDe(r);

  if (noAr === undefined && tentativa === 1 && r.ok) {
    log(
      `AVISO: ${urlVersao} não devolve uma versão em JSON — o endpoint ainda não existe ` +
        '(pedido pendente aos devs, ver todo.md). Não é possível confirmar a versão no ar.',
    );
    if (ESPERA_FIXA_S > 0) {
      log(`A aplicar a espera fixa de ${ESPERA_FIXA_S}s como paliativo.`);
      await esperar(ESPERA_FIXA_S * 1000);
    }
    process.exit(0);
  }

  if (noAr !== undefined) {
    if (coincide(noAr, VERSAO_ESPERADA)) {
      log(`Versão confirmada no ar: ${noAr}.`);
      process.exit(0);
    }
    ultima = noAr;
  }

  if (!restaTempo()) {
    log(
      `ERRO: deploy não concluído — ao fim de ${ESPERA_MAX_S}s a versão no ar é ` +
        `${ultima ?? 'desconhecida'}, esperada ${VERSAO_ESPERADA}. Os testes não correram.`,
    );
    process.exit(4);
  }
  log(`No ar: ${noAr ?? 'desconhecida'}; nova tentativa em ${INTERVALO_S}s.`);
  await esperar(INTERVALO_S * 1000);
}
