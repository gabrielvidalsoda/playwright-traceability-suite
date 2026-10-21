import { expect, type Page } from '@playwright/test';

/**
 * Menu lateral da aplicaÃ§Ã£o (`ccmsns-ui` `src/layout/MainLayout.tsx`, `origin/develop` 13-10-2026,
 * sÃ³ leitura). Traceability Suite Menu: raiz `.ccmsns-menu` (classe `opened` com o menu expandido), grupos
 * `a[aria-controls="submenu-<id>"]` com o submenu `#submenu-<id>` (altura 0 quando fechado),
 * tÃ­tulos em `.ms-nav-item-text`.
 *
 * Desde a PR #71 (`feature/menu-lateral-duas-linhas`, 08-10): o item Â«InÃ­cioÂ» saiu, o grupo
 * Â«Consulta por Ãrea de PrestaÃ§Ã£oÂ» passou a Â«Ãrea de PrestaÃ§Ã£oÂ» e os tÃ­tulos do menu expandido
 * tÃªm `white-space: normal`, `overflow-wrap: anywhere` e `-webkit-line-clamp: 2` â€” o que nÃ£o cabe
 * em 2 linhas termina em reticÃªncias Â«atÃ© o UX definir rÃ³tulos mais curtosÂ».
 */

/** TÃ­tulos de todos os itens do menu, pela ordem do `menuItems` do `MainLayout.tsx`. */
export const TITULOS_MENU: readonly string[] = [
  'Dados de ReferÃªncia',
  'ConvenÃ§Ãµes',
  'Embalagens e Medicamentos',
  'CNPEM',
  'Diplomas / Despachos',
  'MÃ©dicos / Prescritores',
  'Exames MCDT',
  'Sistemas CRD',
  'Tipos de Cuidados Continuados',
  'Tipos de PreÃ§o HemodiÃ¡lise',
  'Patologias Termais',
  'Vacinas',
  'ServiÃ§os Dispensa em Proximidade',
  'Programa Troca de Seringas',
  'Locais de PrescriÃ§Ã£o',
  'EFR â€” Entidade Financeira ResponsÃ¡vel',
  'Ãrea de PrestaÃ§Ã£o',
  'Medicamentos',
  'Facturas',
  'Lotes',
  'PrestaÃ§Ãµes',
  'MCDT',
  'Facturas',
  'Lotes',
  'PrestaÃ§Ãµes',
  'PrestaÃ§Ã£o IPATIMUP',
  'Cuidados RespiratÃ³rios DomiciliÃ¡rios',
  'Facturas',
  'Lotes',
  'PrestaÃ§Ãµes',
  'Cuidados Continuados',
  'Facturas',
  'HemodiÃ¡lise',
  'Facturas',
  'PrestaÃ§Ãµes',
  'Unidades TerapÃªuticas de Sangue',
  'Facturas',
  'PrestaÃ§Ãµes',
  'Tratamentos Termais',
  'Facturas',
  'Lotes',
  'PrestaÃ§Ãµes',
  'SaÃºde Oral',
  'Facturas',
  'PrestaÃ§Ãµes',
  'Vacinas',
  'Facturas',
  'PrestaÃ§Ãµes',
  'Dispensa em Proximidade',
  'Facturas',
  'Lotes',
  'PrestaÃ§Ãµes',
  'Programa Troca de Seringas',
  'Facturas',
  'FacturaÃ§Ã£o de Migrantes (em breve)',
  'GestÃ£o de ArmazÃ©m',
  'Registo de Entrada',
  'Registo de Entrada ANF',
  'AssociaÃ§Ã£o Ã  Caixa',
  'AssociaÃ§Ã£o Ã  Caixa â€” Listagem',
  'PreparaÃ§Ã£o',
  'TransferÃªncia para Arquivo TemporÃ¡rio',
  'Picking para ExpediÃ§Ã£o',
  'Facturas com IncidÃªncia',
  'Localizar / Corrigir',
  'Libertar Arquivo TemporÃ¡rio',
  'Controlo e ContabilizaÃ§Ã£o',
  'Recolha Factura (em breve)',
  'Registo de Notas',
  'ConferÃªncia',
  'Cockpit',
  'ConferÃªncia manual: worklist',
  'ConferÃªncia manual: supervisÃ£o',
  'Facturas conferidas com erro (em breve)',
  'AlarmÃ­stica (em breve)',
  'Workflows de conferÃªncia',
  'Regras de conferÃªncia',
  'Logs de conferÃªncia',
  'AprovaÃ§Ãµes pendentes',
  'GestÃ£o de calendÃ¡rio',
  'GestÃ£o de feriados',
  'MovimentaÃ§Ã£o entre ciclos',
  'Controlo de Qualidade',
  'Biblioteca de Artefactos',
  'Workflows de CQ',
  'Dashboard do Ciclo',
  'EspaÃ§o de AnÃ¡lise',
  'Auditoria',
  'Fecho',
  'Dashboard de Fecho',
  'ReclamaÃ§Ãµes',
  'Upload e MonitorizaÃ§Ã£o AF (em breve)',
  'Criar ReclamaÃ§Ã£o (em breve)',
  'NotificaÃ§Ã£o de ReclamaÃ§Ã£o (em breve)',
  'Iniciar ReconferÃªncia (em breve)',
  'GestÃ£o de ReclamaÃ§Ãµes (em breve)',
  'Pesquisa Estado Ficheiro (em breve)',
  'Documentos Pendentes de DevoluÃ§Ã£o (em breve)',
  'ExportaÃ§Ã£o de OfÃ­cios (em breve)',
  'Dashboards',
  'Produtividade ConferÃªncia Manual (em breve)',
  'Produtividade PreparaÃ§Ã£o (em breve)',
];

/**
 * TÃ­tulos longos citados no plano (Â§4, CT-REG-TASK-20260928-11), com a grafia do cÃ³digo
 * (Â«Facturas conferidas com erro (em breve)Â», em minÃºsculas no `MainLayout.tsx`).
 */
export const TITULOS_LONGOS: readonly string[] = [
  'AssociaÃ§Ã£o Ã  Caixa â€” Listagem',
  'TransferÃªncia para Arquivo TemporÃ¡rio',
  'EFR â€” Entidade Financeira ResponsÃ¡vel',
  'Facturas conferidas com erro (em breve)',
];

/** O contador de Â«AprovaÃ§Ãµes pendentes (N)Â» Ã© acrescentado em runtime; tira-se para comparar. */
export function semContador(titulo: string): string {
  return titulo.replace(/^(AprovaÃ§Ãµes pendentes) \(\d+\)$/, '$1');
}

/**
 * Abre todos os grupos do menu lateral (tambÃ©m os de 2.Âº nÃ­vel, como Â«Ãrea de PrestaÃ§Ã£o â€º
 * MedicamentosÂ»): em cada passagem clica nos grupos fechados cujo grupo-pai jÃ¡ estÃ¡ aberto.
 * Devolve os grupos que ficaram fechados (vazio quando todos abriram).
 */
export async function abrirTodosOsGrupos(page: Page): Promise<string[]> {
  const menu = page.locator('.ccmsns-menu');
  await expect(menu).toBeVisible({ timeout: 30_000 });
  const fechadosAbriveis = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>('.ccmsns-menu a[aria-controls^="submenu-"]'))
        .map((a) => {
          const sub = document.getElementById(a.getAttribute('aria-controls') ?? '');
          let paiAberto = true;
          for (let e = a.parentElement; e; e = e.parentElement) {
            if (e.id?.startsWith('submenu-') && e.getBoundingClientRect().height < 1) paiAberto = false;
          }
          return {
            controla: a.getAttribute('aria-controls') ?? '',
            titulo: (a.textContent ?? '').trim(),
            fechado: !!sub && sub.getBoundingClientRect().height < 1,
            paiAberto,
          };
        })
        .filter((g) => g.fechado),
    );
  for (let passagem = 0; passagem < 5; passagem++) {
    const fechados = await fechadosAbriveis();
    const abriveis = fechados.filter((g) => g.paiAberto);
    if (abriveis.length === 0) break;
    for (const g of abriveis) {
      await page.locator(`.ccmsns-menu a[aria-controls="${g.controla}"]`).click({ force: true });
      // TransiÃ§Ã£o de abertura do submenu (grid-template-rows 0fr â†’ 1fr).
      await page.waitForTimeout(350);
    }
  }
  return (await fechadosAbriveis()).map((g) => g.titulo);
}

export interface MedidaTituloMenu {
  texto: string;
  nivel: number;
  largura: number;
  altura: number;
  alturaLinha: number;
  linhas: number;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
  whiteSpace: string;
  textOverflow: string;
  lineClamp: string;
}

/** Mede cada tÃ­tulo do menu (`.ms-nav-item-text`): estilo calculado e dimensÃµes. */
export async function medirTitulosMenu(page: Page): Promise<{ opened: boolean; larguraMenu: number; titulos: MedidaTituloMenu[] }> {
  return page.evaluate(() => {
    const menu = document.querySelector('.ccmsns-menu');
    const titulos = Array.from(document.querySelectorAll<HTMLElement>('.ccmsns-menu .ms-nav-item-text')).map((t) => {
      const cs = getComputedStyle(t);
      const r = t.getBoundingClientRect();
      const alturaLinha = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      const ul = t.closest('ul');
      const nivel = Number(/container_depth_(\d)/.exec(ul?.className ?? '')?.[1] ?? -1);
      return {
        texto: (t.textContent ?? '').trim(),
        nivel,
        largura: Math.round(r.width),
        altura: Math.round(r.height),
        alturaLinha,
        linhas: Math.round(r.height / alturaLinha),
        scrollWidth: t.scrollWidth,
        clientWidth: t.clientWidth,
        scrollHeight: t.scrollHeight,
        clientHeight: t.clientHeight,
        whiteSpace: cs.whiteSpace,
        textOverflow: cs.textOverflow,
        lineClamp: cs.getPropertyValue('-webkit-line-clamp'),
      };
    });
    return {
      opened: !!menu?.classList.contains('opened'),
      larguraMenu: Math.round(menu?.getBoundingClientRect().width ?? 0),
      titulos,
    };
  });
}
