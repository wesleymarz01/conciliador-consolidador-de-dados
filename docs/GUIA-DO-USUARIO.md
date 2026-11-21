# Guia do Usuário

Este guia ensina a usar o Conciliador **sem programar**. Para instalar e abrir a aplicação no seu computador, veja a seção "Instalação e execução local" do [README](../README.md).

## Antes de começar

- Tenha as duas planilhas em `.xlsx`, `.xls` ou `.csv`.
- Identifique a coluna que representa o mesmo registro nas duas, por exemplo: código do pedido, CPF, ID do cliente ou hostname. Os nomes das colunas podem ser diferentes.
- Se houver títulos acima do cabeçalho, anote quantas linhas são. Elas podem ser puladas.
- Os arquivos **não saem do seu computador**, a não ser que você use os botões de IA (veja o passo 7).

## Passo 1: escolha o modo

No topo da página há duas opções:

- **Encontrar em ambas (inventário):** para saber quais itens de A existem em B. Exemplo: "quais servidores da homologação estão no TSM?".
- **Auditar divergências:** para saber, além disso, se os valores conferem. Exemplo: "o valor e o status do pedido batem com o extrato?".

Trocar de modo apaga o resultado atual. Depois basta clicar em **Cruzar dados** de novo.

## Passo 2: carregue as planilhas

- Arraste o arquivo para o quadro **Planilha A** (ou clique nele para escolher o arquivo). Faça o mesmo com a **Planilha B**.
- Depois de carregar, o quadro mostra o nome do arquivo, o número de linhas e colunas e os nomes das colunas.
- **Excel com várias abas:** use o seletor **Aba** para escolher uma aba ou **Todas as abas (consolidar)**.
- **Títulos acima do cabeçalho:** ajuste **Pular linhas iniciais**.
- Para trocar as planilhas de lugar, use o botão **⇄** entre os quadros (visível em telas maiores).
- Para conhecer a ferramenta sem arquivos próprios, clique em **Testar com planilhas de exemplo** (dados fictícios).

> **Atenção:** trocar a aba ou o número de linhas puladas recarrega o arquivo e **refaz a sugestão de colunas**. Confira a chave e os campos novamente.

## Passo 3: defina a chave de cruzamento

- Em **Chave de cruzamento**, escolha a coluna de A e a coluna correspondente de B.
- Se um registro só é identificado por mais de uma coluna (ex.: Filial + Código), use **+ Adicionar coluna** para montar uma chave composta.
- No modo Inventário, você também pode dar nomes às planilhas (ex.: "Homologação" e "TSM"). Os nomes aparecem nas abas e nos indicadores.

## Passo 4 (só na Auditoria): escolha os campos a comparar

- Em **Campos a comparar**, adicione os pares de colunas cujos valores devem bater (ex.: Valor ↔ Valor, Status ↔ Status).
- Números em formatos diferentes são considerados iguais: `R$ 10,00`, `10,00` e `10`.

## Passo 5: ajuste as opções

- **Ignorar maiúsculas/minúsculas** e **Ignorar espaços extras:** recomendadas na maioria dos casos.
- **Ignorar domínio** (Inventário): faz `srv01.empresa.local` ser igual a `srv01`. Não afeta CPF, CNPJ, e-mails nem IPs.
- **Estratégia:**
  - **Exato:** recomendado para códigos, IDs, CPF e hostnames.
  - **Aproximado:** para textos escritos de formas diferentes (ex.: nomes). Ajuste a **semelhança mínima**. Cuidado: códigos parecidos como `PED-1001` e `PED-1005` podem ser considerados iguais.

## Passo 6: cruze e analise

1. Clique em **Cruzar dados**.
2. Leia os **indicadores** no topo (totais, presentes em ambas ou % de conciliação, divergentes).
3. Se aparecer um **aviso amarelo** sobre linhas fora do cruzamento, confira as abas **Duplicadas** e **Sem chave**. São linhas com a chave repetida (só a primeira foi usada) ou com a chave em branco.
   Se você mudar chaves, campos ou opções depois de cruzar, aparece o aviso **"A configuração mudou depois do último cruzamento"**: o resultado na tela ainda é o da configuração anterior. Clique em **Cruzar novamente** para atualizar.
4. Navegue pelas abas:
   - Inventário: _Presentes em ambas_, _Só em B_, _Só em A_ e _Visão completa_ (todas as linhas de A com o status de cada uma).
   - Auditoria: _Idênticos_, _Divergências_ (com os campos diferentes destacados e listados), _Apenas na A_ e _Apenas na B_.
5. Use **Filtrar resultados…** para buscar um texto na aba atual.

A tabela mostra até 300 linhas. Para ver tudo, exporte.

## Passo 7 (opcional): use a IA

1. Clique em **Conectar Gemini**, cole sua chave do Google AI Studio e salve. A chave fica só neste navegador.
2. **Sugerir com IA** propõe a chave e os campos a comparar. Para isso, envia ao Google os nomes das colunas e as 2 primeiras linhas de cada planilha.
3. **Gerar diagnóstico** (Auditoria) escreve uma análise das divergências. Envia ao Google os totais e até 40 divergências.

Não use a IA com dados confidenciais que não possam sair da sua máquina.

## Passo 8: exporte

- Com a aba desejada aberta (e o filtro, se quiser), clique em **Exportar .xlsx** ou **Exportar .csv**.
- O arquivo tem todas as linhas da aba (respeitando o filtro) e todas as colunas.
- No CSV, valores que o Excel executaria como fórmula (começando com `=`, `+`, `-` ou `@`, exceto números como `-10`) são gravados com um apóstrofo no início (ex.: `'=1+1`). Isso impede a execução da fórmula; o apóstrofo aparece na célula.

## Dúvidas comuns

| Situação                            | O que fazer                                                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| "Não foi possível ler o arquivo"    | Verifique se é `.xlsx`, `.xls` ou `.csv` com cabeçalho. Se houver título no topo, ajuste "Pular linhas iniciais". |
| Acentos estranhos no CSV            | Salve o CSV como "UTF-8" no Excel e carregue de novo.                                                             |
| Muitos "Só em A" que deveriam bater | Confira a chave escolhida e as opções de maiúsculas/espaços/domínio.                                              |
| A página ficou lenta                | Arquivos muito grandes e a estratégia Aproximada exigem muito do navegador. Prefira a estratégia Exata.           |
