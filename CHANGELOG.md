# Changelog

Todas as alterações relevantes deste projeto são registradas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem [SemVer](https://semver.org/lang/pt-BR/).

## [Não lançado]

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
