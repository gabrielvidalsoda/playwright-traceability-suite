import { expect, test } from '../fixtures';
import { PaginaPesquisaFaturasMedicamentos } from '../../paginas/PaginaPesquisaFaturasMedicamentos';
import { meta } from '../apoio';

/**
 * Traceability Suite Â§4.11 â€” fatia "resiliÃªncia da interface" (ver docs/plano-de-testes/recuperacao.md).
 *
 * Nota: forÃ§ar respostas 5xx/timeout via `page.route` **nÃ£o** sobrepÃµe o service
 * worker do MSW nesta app; CT-RESIL-ERRO-500 / -TIMEOUT / -RECUPERA ficam ðŸ”² atÃ©
 * o `ccmsns-ui` expor um handler de erro parametrizÃ¡vel. O que Ã© testÃ¡vel agora
 * Ã© o tratamento do resultado vazio (nÃ£o Ã© erro) â€” CA-G-08.
 */
test.describe('RecuperaÃ§Ã£o â€” resiliÃªncia da interface (Traceability Suite Â§4.11)', () => {
  test(
    'CT-RESIL-VAZIO â€” Zero resultados Ã© tratado como vazio, nÃ£o como erro',
    meta({
      caso: 'CT-RESIL-VAZIO',
      requisitos: ['RF29'],
      familia: 'fatura',
      tipoTeste: 'recuperacao',
      plano: 'Consulta-Area-Prestacao.md Â§2.5 CA-G-08 â€” @CT-RESIL-VAZIO',
    }),
    async ({ page }) => {
      const pag = new PaginaPesquisaFaturasMedicamentos(page);
      await pag.abrir();

      await pag.pesquisarPorNumero('ZZZ-INEXISTENTE-999');

      await expect(pag.estadoVazio()).toBeVisible();
      await expect(pag.linhasResultado()).toHaveCount(0);
      await expect(page.getByText(/0\s+resultados?/)).toBeVisible();
      // sem snackbar de erro
      await expect(page.getByRole('alert')).toHaveCount(0);
      // a interface continua operÃ¡vel
      await expect(pag.botaoPesquisar()).toBeEnabled();
      await expect(pag.campoNumeroFatura()).toBeEditable();
    },
  );
});
