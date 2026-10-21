import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Corre a anÃ¡lise axe-core (WCAG 2.1 A + AA) sobre a pÃ¡gina.
 *
 * Por defeito Ã© **informativo**: anexa o relatÃ³rio completo de violaÃ§Ãµes ao teste
 * e regista as de impacto `critical`/`serious` como annotations â€” **nÃ£o falha**.
 * A SPA usa componentes `@Traceability Suite/ui-react` com dÃ­vida WCAG conhecida (aria-allowed-attr,
 * aria-required-children, â€¦); enquanto nÃ£o for remediada, o teste documenta, nÃ£o bloqueia.
 *
 * Definir `A11Y_ESTRITO=1` para falhar quando houver violaÃ§Ãµes `critical`/`serious`
 * (Traceability Suite Â§4.6 â€” "0 violaÃ§Ãµes crÃ­ticas").
 */
export async function analisarAcessibilidade(
  page: Page,
  testInfo: TestInfo,
  nome: string,
): Promise<void> {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  await testInfo.attach(`axe-${nome}`, {
    body: JSON.stringify(resultado.violations, null, 2),
    contentType: 'application/json',
  });

  const bloqueantes = resultado.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
  const resumo = bloqueantes
    .map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) â€” ${v.help}`)
    .join('\n');

  for (const v of bloqueantes) {
    testInfo.annotations.push({
      type: 'a11y-violacao',
      description: `[${nome}] ${v.impact}: ${v.id} (${v.nodes.length}) â€” ${v.help}`,
    });
  }

  if (process.env.A11Y_ESTRITO) {
    expect(bloqueantes, `ViolaÃ§Ãµes WCAG crÃ­ticas/sÃ©rias em "${nome}":\n${resumo}`).toEqual([]);
  } else if (bloqueantes.length) {
    console.warn(
      `[a11y] "${nome}" â€” ${bloqueantes.length} violaÃ§Ã£o(Ãµes) crÃ­tica/sÃ©ria:\n${resumo}`,
    );
  }
}
