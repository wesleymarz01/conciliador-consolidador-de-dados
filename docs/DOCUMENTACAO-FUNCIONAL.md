# Documentação Funcional

Este documento descreve **o que o sistema faz hoje** e as regras que ele segue. Comportamentos que ainda não existem estão em [LIMITACOES.md](LIMITACOES.md) e [ROADMAP.md](ROADMAP.md).

## 1. Finalidade

O Conciliador & Consolidador de Dados compara duas bases tabulares (Planilha A e Planilha B) e responde a três perguntas:

1. Quais registros existem nas duas bases?
2. Quais existem apenas em uma delas?
3. Entre os registros correspondentes, quais campos têm valores diferentes?

Todo o processamento acontece no navegador do usuário.

## 2. Conceitos

| Termo                   | Definição                                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Planilha A**          | Base principal. No modo Inventário, é a "lista a auditar"; no modo Auditoria, a "base".                        |
| **Planilha B**          | Base de referência ("conferência" no modo Auditoria).                                                          |
| **Chave de cruzamento** | Uma ou mais colunas que identificam o mesmo registro nas duas bases (pares Coluna A ↔ Coluna B).               |
| **Chave composta**      | Chave formada por mais de um par de colunas. Dois registros correspondem quando **todas** as partes coincidem. |
| **Campos a comparar**   | Pares de colunas cujos valores devem ser iguais (só no modo Auditoria).                                        |
| **Normalização**        | Ajustes aplicados antes da comparação (maiúsculas, espaços, domínio, formatos numéricos).                      |

## 3. Leitura dos arquivos

- **Formatos:** `.xlsx`, `.xls` e `.csv`.
- **CSV:** o separador é detectado automaticamente e o arquivo é lido como texto UTF-8.
- **Excel:** por padrão é lida a primeira aba. O usuário pode escolher outra aba ou **"Todas as abas (consolidar)"**, que junta as linhas de todas as abas numa única base, com a união das colunas e a coluna adicional `Aba_Origem` (nome da aba de cada linha). Os valores são lidos como texto formatado, como aparecem no Excel.
- **Pular linhas iniciais:** descarta de 0 a 50 linhas antes do cabeçalho (ex.: títulos de relatório).
- **Cabeçalho:** a primeira linha não vazia restante. Cabeçalhos vazios viram `Coluna N`; cabeçalhos repetidos recebem sufixo (`Nome_2`).
- **Limpeza:** espaços nas pontas das células são removidos; linhas totalmente vazias e colunas sem nenhum valor são descartadas.

## 4. Configuração do cruzamento

- Ao carregar as duas planilhas, colunas com o mesmo nome (ignorando maiúsculas e espaços) são sugeridas automaticamente. O primeiro par vira a chave e os demais viram campos a comparar.
- O usuário pode adicionar ou remover pares e trocar as colunas.
- **Opções:**
  - _Ignorar maiúsculas/minúsculas_ (padrão: ligada).
  - _Ignorar espaços extras_: remove espaços nas pontas e reduz espaços repetidos a um (padrão: ligada).
  - _Ignorar domínio_ (somente no modo Inventário; padrão: ligada): remove o domínio de valores com formato de hostname (`srv01.empresa.local` → `srv01`). Um valor só é tratado como hostname se tiver pelo menos dois rótulos separados por ponto, formados por letras, dígitos, `-` e `_`, com letra no primeiro rótulo e em algum rótulo do domínio. IPv4, IPv6, CPF, CNPJ, e-mails, `IP:porta`, decimais e versões (`1.2.3`) não são alterados.
- **Estratégia:**
  - _Exato_: a chave normalizada deve ser idêntica.
  - _Aproximado_: se a chave exata não existir em B, procura a chave de B mais semelhante (sem acentos e só com letras, números e espaços), usando uma métrica no estilo _token set ratio_ sobre a distância de Levenshtein. Se a semelhança for maior ou igual ao mínimo configurado (40% a 100%; padrão 75%), considera correspondência e registra a semelhança na coluna `Semelhança (%)`.
- **Inverter A ↔ B:** troca as planilhas, os nomes e os pares de colunas.

## 5. Regras de classificação

Para cada linha:

1. **Sem chave:** se todas as partes da chave estiverem vazias após a normalização, a linha vai para "Sem chave em A" ou "Sem chave em B" e não participa do cruzamento.
2. **Duplicada:** se a chave já apareceu antes na mesma planilha, vale a **primeira ocorrência**. As seguintes vão para "Duplicadas em A" ou "Duplicadas em B" e não participam do cruzamento.
3. **Correspondência:** cada linha restante de A é procurada em B (exata e, se ativada, aproximada).
   - Sem correspondência: **Só em A / Apenas na A**.
   - Com correspondência: no modo Inventário, **Presente em ambas**. No modo Auditoria, **Idêntico** se todos os campos comparados forem iguais, senão **Divergente** (com a lista de campos divergentes).
4. As linhas de B que não foram usadas por nenhuma linha de A ficam em **Só em B / Apenas na B**.

**Garantia:** cada linha de A e de B aparece em exatamente uma categoria. Essa regra é verificada por testes automatizados.

### Comparação de valores (modo Auditoria)

Dois valores são iguais quando:

- são iguais após a normalização (maiúsculas e espaços, conforme as opções); **ou**
- ambos representam o mesmo número. São aceitos formatos brasileiro (`1.234,56`) e americano (`1,234.56`), símbolo `R$` ou `$` e sinal negativo. Exemplos: `10,00` = `10`, `R$ 1.234,56` = `1234.56`, `007` = `7`.

A equivalência numérica **não** vale para as chaves: `007` e `7` são chaves diferentes.

## 6. Resultados e indicadores

### Modo Inventário

| Indicador          | Cálculo                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| Total A / Total B  | Número de linhas lidas de cada planilha                                           |
| Presentes em ambas | Linhas de A com correspondência em B                                              |
| Cobertura (%)      | Presentes em ambas ÷ chaves únicas de A (total de A menos duplicadas e sem chave) |
| Só em A            | Linhas de A sem correspondência                                                   |

Abas: _Presentes em ambas_, _Só em B_, _Só em A_ e _Visão completa_. A Visão completa traz todas as linhas de A com `Match Status` = Encontrado, Não Encontrado, Chave duplicada ou Sem chave, mais as colunas de B quando encontrado.

### Modo Auditoria

| Indicador           | Cálculo                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Linhas A / Linhas B | Número de linhas lidas                                                                    |
| % Conciliação       | Idênticos ÷ maior total entre A e B                                                       |
| Divergentes         | Pares com pelo menos um campo diferente; o subtítulo mostra quantos registros não têm par |

Abas: _Idênticos_, _Divergências_, _Apenas na A_ e _Apenas na B_. Nas divergências, as células diferentes são destacadas.

Nos dois modos, as abas _Duplicadas em A/B_ e _Sem chave em A/B_ aparecem quando existem casos, junto com um aviso.

## 7. Filtro e exportação

- **Filtro:** busca o texto digitado em todas as colunas da aba atual, sem diferenciar maiúsculas.
- **Tabela:** mostra até 300 linhas, com aviso quando há mais.
- **Exportação:** gera `.xlsx` (aba "Resultado") ou `.csv` (UTF-8 com BOM) da aba atual **com o filtro aplicado**, com todas as linhas e todas as colunas presentes em qualquer linha. O arquivo se chama `conciliacao-<aba>`.
- **Proteção contra fórmulas (CSV):** células e cabeçalhos que começam com `=`, `+`, `-`, `@`, tabulação ou retorno de carro (inclusive as variantes de largura total) recebem um apóstrofo no início, para que Excel e programas semelhantes não os executem como fórmula. Números simples como `-10`, `+5` e `-1.234,56` não são alterados. No `.xlsx`, esses valores já são gravados como texto.

## 8. Assistência com IA (opcional)

- Usa o Google Gemini com a **chave do próprio usuário**, salva no `localStorage` do navegador. A chave pode ser removida pelo botão "Remover chave".
- **Sugerir com IA:** envia os nomes das colunas e as 2 primeiras linhas de cada planilha e recebe a sugestão de chaves e campos a comparar. Só são aceitos nomes de colunas que existam de fato.
- **Gerar diagnóstico** (modo Auditoria, quando há divergências): envia os totais e até 40 divergências e exibe um texto com padrões, prováveis causas e recomendações.
- O indicador "Gemini conectado" significa apenas que existe uma chave salva; a chave não é validada antes do uso.
- O modelo configurado é `gemini-4-argon`. A disponibilidade depende da conta Google do usuário.

## 9. Dados de exemplo

O botão **Testar com planilhas de exemplo** carrega duas bases **fictícias**:

- `vendas_sistema.csv`: pedidos `PED-1001` a `PED-1054` (Pedido, Cliente, Valor, Status).
- `extrato_cartao.csv`: pedidos `PED-1005` a `PED-1060` (Código Pedido, Valor, Status).

No modo Auditoria, comparando Valor e Status, o resultado esperado (verificado por teste) é: 40 idênticos, 10 divergentes, 4 apenas em A e 6 apenas em B.
