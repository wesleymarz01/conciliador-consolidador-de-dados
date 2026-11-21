import { describe, expect, it } from "vitest";

import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("gera a página de erro em português", () => {
    const html = renderErrorPage();
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain("Não foi possível carregar a página");
    expect(html).toContain("Tentar novamente");
    expect(html).not.toMatch(/didn't load|Try again|Go home/);
  });
});
