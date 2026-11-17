# Diário de Desenvolvimento

Diário de bordo do projeto, do mais antigo para o mais recente. Cada entrada traz a data, o que foi trabalhado e o resultado. Detalhes técnicos ficam no [CHANGELOG](../CHANGELOG.md) e nos commits. A origem e a autoria do projeto estão descritas no [README](../README.md#origem-autoria-e-evolução).

---

**Início (data não registrada)** — Idealização e desenvolvimento inicial por Wesley Martins, fora da Lovable, incluindo uma etapa em Python.

**16/10/2026 a 11/11/2026** — Uma versão foi disponibilizada no ambiente Lovable para testes e para uso por uma pessoa convidada. O histórico dessa versão registra o cruzamento de planilhas, os modos Inventário e Auditoria, a estratégia aproximada, a exportação, a integração opcional com o Gemini e os primeiros 8 testes automatizados (a maior parte em 21/10), além da revisão do README (11/11).

**17/11/2026** — Auditoria técnica completa. O fluxo principal funcionava, mas havia resultados incorretos em situações específicas (CPF tratado como hostname, linhas duplicadas, valores com `R$`, colunas faltando no CSV) e uma biblioteca com vulnerabilidades conhecidas.

**17/11/2026** — Correções de confiabilidade no ambiente privado de desenvolvimento. Os quatro problemas que geravam números errados foram corrigidos, e os testes automatizados passaram de 8 para 48, todos aprovados.

**17/11/2026** — Publicação deste repositório público e independente, que roda localmente com Node.js, sem depender operacionalmente do ambiente Lovable. Documentação completa, integração contínua no GitHub e 17 issues abertas para as melhorias conhecidas. Resultado: aplicação, testes e build funcionando.

**17/11/2026** — Correção na exportação CSV. Foi implementada proteção contra fórmulas maliciosas, e 14 testes automatizados novos validam os casos de risco e a preservação de números, acentos e separadores. Resultado: 62 testes aprovados.

**17/11/2026** — Revisão da documentação, conferida com o código. Avaliação técnica da atualização da biblioteca de planilhas (`xlsx`), aguardando aprovação.
