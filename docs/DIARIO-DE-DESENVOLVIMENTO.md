# Diário de Desenvolvimento

Diário de bordo do projeto, do mais antigo para o mais recente. Cada entrada traz a data, o que foi trabalhado e o resultado. Detalhes técnicos ficam no [CHANGELOG](../CHANGELOG.md) e nos commits.

---

**Início (data não registrada)** — Primeiras ideias e versões da lógica de conciliação, desenvolvidas em Python por Wesley Martins, antes da aplicação web.

**16/10/2026** — Início do protótipo web. Wesley Martins criou a base da aplicação com apoio da plataforma Lovable.

**21/10/2026** — Construção das funções principais: cruzamento de planilhas, modos Inventário e Auditoria, estratégia aproximada, exportação, integração opcional com o Gemini e os primeiros 8 testes automatizados.

**11/11/2026** — README revisado e proteção extra para arquivos `.env` no `.gitignore`.

**17/11/2026** — Auditoria técnica completa. O fluxo principal funcionava, mas havia resultados errados em situações específicas (CPF tratado como hostname, linhas duplicadas, valores com `R$`, colunas faltando no CSV) e uma biblioteca com vulnerabilidades conhecidas.

**17/11/2026** — Correções de confiabilidade. Os quatro problemas que geravam números errados foram corrigidos, e os testes automatizados passaram de 8 para 48, todos aprovados.

**17/11/2026** — Criação deste repositório público e independente, que roda localmente com Node.js sem depender do Lovable. Documentação completa, integração contínua no GitHub e 17 issues abertas para as melhorias conhecidas. Resultado: aplicação, testes e build funcionando.

**17/11/2026** — Correção na exportação CSV. Foi implementada proteção contra fórmulas maliciosas, e 14 testes automatizados novos validam os casos de risco e a preservação de números, acentos e separadores. Resultado: 62 testes aprovados.

**17/11/2026** — Revisão da documentação: autoria, origem do projeto e informações conferidas com o código. Avaliação técnica da atualização da biblioteca de planilhas (`xlsx`), aguardando aprovação.
