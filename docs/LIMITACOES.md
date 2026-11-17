# Limitações e funcionalidades ainda não disponíveis

Lista honesta do que **não funciona bem** ou **não existe** na versão atual. Os itens foram identificados na auditoria técnica de 2026-11-17 e conferidos no código. Os códigos entre colchetes (ex.: `[A3]`) seguem a numeração dessa auditoria.

## Confiabilidade dos resultados

- **[A3] Estratégia Aproximada sem exclusividade:** várias linhas de A podem ser associadas à **mesma** linha de B. Códigos sequenciais parecem semelhantes: `PED-1001` × `PED-1005` dá 86% e `srv01` × `srv02` dá 80%, acima do padrão de 75%. Em caso de empate, vence o primeiro candidato.
- **[M5] Chaves sem equivalência numérica nem de acentos:** `007` e `7` são chaves diferentes. `José` e `Jose` só coincidem na estratégia Aproximada.
- **[M6] Separador de chave composta:** as partes são unidas com `" | "`. Valores que contêm esse texto podem colidir.
- **[M12] Métricas:** "% Conciliação" usa o maior total entre A e B como base. Não há indicador separado de cobertura de B.

## Leitura de arquivos

- **[M10] Codificação de CSV:** sempre lido como UTF-8. Arquivos em Windows-1252/ANSI exibem acentos incorretos e podem gerar falsas divergências.
- **[M8] Cabeçalhos repetidos:** `X, X, X_2` resulta em duas colunas `X_2`, e uma sobrescreve a outra.
- **[M9] Colunas sem valores:** colunas que só têm cabeçalho são descartadas e não podem ser escolhidas.
- **Consolidação de abas:** o mesmo "pular linhas" vale para todas as abas, e a coluna `Aba_Origem` pode colidir com uma coluna de mesmo nome.
- **Datas e números do Excel:** são lidos como texto formatado. O mesmo valor em formatos diferentes (ex.: `05/01/2024` × `2024-01-05`) é considerado diferente.
- **Mensagem de erro genérica:** quando um arquivo não pode ser lido, o motivo real não é exibido.

## Interface e usabilidade

- **[B1] Sem paginação:** a tabela mostra até 300 linhas por aba. Para ver tudo, é preciso exportar.
- **[M1] Configuração refeita:** trocar a aba ou "pular linhas" refaz a sugestão de colunas e descarta os pares escolhidos.
- **[M2] Resultado não é marcado como desatualizado:** mudar chaves, campos ou opções depois de cruzar não avisa que o resultado é antigo. Nas abas da Auditoria, as colunas exibidas seguem os campos atuais.
- **[M3] Destaque de divergência:** quando os nomes das colunas de A e B são diferentes, a célula divergente de B não é destacada.
- **[M4] Nomes reservados:** colunas chamadas `Chave` ou `Match Status` são sobrescritas na exibição e na exportação.
- **[B2] Celular e acessibilidade:** o botão de inverter A ↔ B não aparece em telas pequenas, e a área de upload não é acessível pelo teclado.
- **[B4] Páginas de erro e 404 em inglês.**
- O diagnóstico com IA só existe no modo Auditoria.

## Desempenho

- **[M11]** Leitura e cruzamento rodam na thread principal do navegador, sem barra de progresso. Arquivos grandes podem travar a página por alguns segundos.
- A estratégia Aproximada tem custo quadrático (estimativa de minutos para 10 mil × 10 mil linhas sem par).
- O filtro percorre todas as linhas a cada tecla digitada.
- Não foi feita medição formal com arquivos grandes no navegador.

## Segurança

- **[A4] `xlsx` 0.18.5** (versão do npm) tem vulnerabilidades conhecidas de _prototype pollution_ e _ReDoS_ (GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9). Abra apenas arquivos de origem confiável.
- **Proteção de fórmulas no CSV:** valores de risco recebem um apóstrofo no início (`'=1+1`). O apóstrofo fica visível na célula ao abrir no Excel; o valor original pode ser recuperado removendo esse primeiro caractere.
- **[M13] IA:** os dados de amostra são enviados ao Google sem pré-visualização nem confirmação a cada envio. O modelo `gemini-4-argon` não foi validado nesta etapa.
- **[M14] Chave de API:** fica em texto puro no `localStorage` do navegador.
- O `npm audit` também aponta alertas em `vite` 8.1.5 (servidor de desenvolvimento), em `picomatch` (usado pelas ferramentas de build do TanStack, não pelo navegador) e em `zod` (declarado, mas não usado pelo código). Nenhum deles processa as planilhas do usuário; as atualizações ficam para uma etapa própria.

## Funcionalidades que não existem

- Comparação de mais de duas bases.
- Perfis de comparação salvos, histórico de execuções e relatórios em PDF.
- Regras por campo (tolerância numérica, datas, tipos como CPF/CNPJ).
- Conciliação por soma ou agrupamento (N:1).
- Automação, linha de comando ou API.
- Contas de usuário, armazenamento em servidor ou colaboração.

## Código e manutenção

- A tela inteira está num único arquivo (`src/routes/index.tsx`).
- Há componentes de interface e dependências herdadas do modelo inicial que não são usados.
- Não há testes automatizados da interface nem da integração com IA.
