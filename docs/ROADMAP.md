# Roadmap

Possibilidades de evolução. **Nenhum item desta página está implementado.** A ordem reflete a prioridade sugerida na auditoria técnica de 2026-11-17 e pode mudar. Cada item passa a "concluído" somente com o código, os testes e o registro no [CHANGELOG](../CHANGELOG.md) e no [Diário](DIARIO-DE-DESENVOLVIMENTO.md).

Complexidade estimada: **P** = até meio dia · **M** = 1 a 3 dias · **G** = 1 a 2 semanas · **GG** = mais de 2 semanas.

## Etapa 1: segurança e robustez

| Item                                                                                                                       | Complexidade |
| -------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Substituir `xlsx` 0.18.5 por versão corrigida da SheetJS (≥ 0.20)                                                          | M            |
| Estratégia Aproximada 1:1 (sem reutilizar a mesma linha de B), desempate determinístico e aviso para chaves do tipo código | M            |
| Neutralizar fórmulas no CSV exportado                                                                                      | P            |
| Preservar chaves e campos ao trocar aba ou "pular linhas"; marcar o resultado como desatualizado                           | P            |

## Etapa 2: qualidade e experiência

| Item                                                                                                                                                         | Complexidade |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| Dividir `src/routes/index.tsx` em componentes, sem mudança visual                                                                                            | M            |
| Leitura em Web Worker com barra de progresso e opção de cancelar                                                                                             | M/G          |
| Paginação real da tabela e filtro com atraso (_debounce_)                                                                                                    | P/M          |
| Detecção da codificação do CSV (UTF-8 / Windows-1252)                                                                                                        | M            |
| Métricas revisadas (cobertura de A e de B, explicação de cada indicador)                                                                                     | P            |
| Pré-visualização e anonimização dos dados antes de enviar à IA; modelo configurável                                                                          | M            |
| Opções de acentos e números equivalentes em chaves (desligadas por padrão)                                                                                   | P            |
| Correções menores: destaque de divergência em B, nomes reservados, cabeçalhos repetidos, páginas em português, acessibilidade e botão de inverter no celular | P            |
| Remover dependências e componentes sem uso                                                                                                                   | P            |
| Testes de interface (fluxo completo)                                                                                                                         | M            |

## Etapa 3: produto profissional

| Item                                                                                      | Complexidade |
| ----------------------------------------------------------------------------------------- | ------------ |
| Perfis de comparação salvos (local, importar e exportar)                                  | M            |
| Relatório XLSX com várias abas (resumo, divergências, exclusivos, duplicadas, parâmetros) | M            |
| Relatório em PDF ou para impressão                                                        | M            |
| Regras por campo: tolerância numérica, datas, CPF/CNPJ                                    | G            |
| Consolidar vários arquivos numa mesma base                                                | M            |
| Comparação de mais de duas bases                                                          | G/GG         |
| Conciliação N:1 por soma                                                                  | G            |
| Histórico local de execuções (somente parâmetros e métricas)                              | M            |
| Arquivos muito grandes (streaming, banco embutido no navegador)                           | GG           |
| Linha de comando reutilizando o motor                                                     | M            |
