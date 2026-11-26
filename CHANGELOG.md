# Changelog

Todas as alterações relevantes deste projeto são registradas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Corrigido

- [M8] Cabeçalhos repetidos não sobrescrevem mais outra coluna: em `X, X, X_2`, a segunda `X` vira `X_3` (antes virava `X_2` e os dados de uma das colunas se perdiam sem aviso). Cabeçalhos originais mantêm o nome. 2 testes automatizados novos.
- [M2] Resultado desatualizado agora é sinalizado: mudar chaves, campos ou opções depois de cruzar mostra um aviso com o botão "Cruzar novamente". As abas, o diagnóstico com IA e a exportação seguem a configuração usada no cruzamento, sem misturar colunas da configuração atual com dados antigos.
- [B4] Páginas 404 e de erro traduzidas para o português (`lang="pt-BR"` também na página de erro do servidor).
- [M3] Na aba Divergências, a célula divergente da planilha B agora é destacada mesmo quando a coluna de B tem nome diferente da de A. 4 testes automatizados novos.
- CSV com linhas mais longas que o cabeçalho: os valores excedentes viram colunas `Coluna N` em vez de serem descartados sem aviso (no Excel isso já acontecia). 1 teste novo.
- CSV com aspas sem fechamento agora é recusado. Antes, o resto do arquivo era juntado numa única célula e as linhas seguintes se perdiam sem aviso. 1 teste novo.
- Excel: inteiros longos no formato Geral (ex.: CNPJ de 14 dígitos guardado como número) são lidos com todos os dígitos. Antes viravam `1.23457E+13`, e chaves diferentes ficavam iguais. 1 teste novo.
- Rótulos iguais para A e B (ex.: os dois "Sistema") não fazem mais as colunas de B sobrescreverem as de A nas abas "Presentes em ambas" e "Visão completa": nesse caso, as colunas usam os sufixos `(A)` e `(B)`.
- Abas Idênticos e Divergências (tela e exportação) agora trazem os valores originais das colunas-chave de A e de B e, na estratégia Aproximada, a "Semelhança (%)". Antes só aparecia a `Chave` normalizada (ex.: em minúsculas).

### Segurança

- Exportação CSV protegida contra injeção de fórmulas (CSV injection): valores e cabeçalhos iniciados por `=`, `+`, `-`, `@`, tabulação ou retorno de carro recebem um apóstrofo no início. Números simples (`-10`, `+5`) são preservados. 14 testes automatizados novos.

## [0.1.0] - 2026-11-17

Primeira versão do repositório público independente. O código parte do estado consolidado durante o desenvolvimento privado, após uma etapa de evolução e testes no ambiente Lovable, e inclui as correções de confiabilidade da Fase 0.

### Funcionalidades existentes nesta versão

- Importação de `.xlsx`, `.xls` e `.csv`: escolha ou consolidação de abas (`Aba_Origem`) e opção de pular linhas iniciais.
- Modos "Encontrar em ambas (inventário)" e "Auditar divergências".
- Chave simples ou composta; estratégias Exata e Aproximada (semelhança de 40% a 100%).
- Normalização de maiúsculas, espaços, domínio de hostname e formatos numéricos/monetários.
- Abas de duplicadas e sem chave, com aviso; indicadores; filtro; inversão A ↔ B.
- Exportação `.xlsx` e `.csv` (UTF-8 com BOM).
- Assistência opcional com Google Gemini (chave do usuário).
- Dados de exemplo fictícios e 48 testes automatizados.

### Corrigido (Fase 0, em relação à versão anterior)

- "Ignorar domínio" só altera valores com formato de hostname. Antes, CPF, CNPJ, e-mail e `IP:porta` eram truncados no primeiro ponto.
- `R$` é reconhecido na comparação numérica também com "Ignorar maiúsculas" ligado.
- Exportação CSV/XLSX e tabela incluem todas as colunas, não só as da primeira linha.
- Duplicatas e chaves vazias deixaram de ser tratadas em silêncio: vale a 1ª ocorrência, e as demais linhas aparecem em abas próprias. A cobertura do Inventário passa a ser calculada sobre as chaves únicas de A.

### Alterado (independência do Lovable)

- `vite.config.ts` reescrito sem `@lovable.dev/vite-tanstack-config`. O build usa Nitro com preset `node-server` (`npm start`).
- Removidos a telemetria do editor Lovable, a meta `twitter:site @Lovable`, a pasta `.lovable/` e os arquivos do bun.
- npm como gerenciador de pacotes (`package-lock.json`).
- CI no GitHub Actions: typecheck, lint, testes e build.
- Documentação completa em `README.md` e `docs/`.
