# Conciliador & Consolidador de Dados

Aplicação web para **cruzar, comparar e auditar duas planilhas** (Excel ou CSV) diretamente no navegador. Você escolhe as colunas que identificam o mesmo registro nas duas bases e a ferramenta mostra o que existe nas duas, o que existe só em uma delas e quais campos têm valores diferentes.

> **Situação atual:** versão 0.1.0, uma base inicial de desenvolvimento. As funcionalidades descritas abaixo existem e são cobertas por testes automatizados. O que ainda não existe está listado em [Limitações](#limitações-conhecidas) e em [Evoluções planejadas](#evoluções-planejadas).

---

## Qual problema ele resolve

Comparar duas listas costuma ser feito à mão no Excel, com PROCV/VLOOKUP, filtros e cópias de colunas. É um processo lento, difícil de repetir e sujeito a erros, principalmente quando:

- as bases vêm de sistemas diferentes, com nomes de colunas diferentes;
- os valores têm pequenas diferenças de formatação (maiúsculas, espaços, `R$`, `10,00` × `10`);
- hostnames aparecem ora com domínio (`srv01.empresa.local`), ora sem (`srv01`);
- é preciso saber não só _o que bate_, mas também _o que falta_ e _o que diverge_.

O Conciliador faz esse cruzamento de forma guiada e permite exportar o resultado.

## Exemplos de uso empresarial

São casos que a ferramenta já atende, desde que cada base esteja num arquivo e haja uma coluna (ou combinação de colunas) que identifique o registro:

- **Inventário de TI:** comparar uma lista de servidores de homologação com a base de um sistema de backup/monitoramento (ex.: TSM) para descobrir máquinas sem cobertura.
- **Conciliação financeira:** comparar pedidos do sistema de vendas com o extrato da operadora de cartão (valor e status).
- **Cadastros:** verificar se clientes, fornecedores ou colaboradores de uma base existem em outra e se os dados conferem.
- **Auditoria de migração:** conferir se os registros de um sistema antigo chegaram ao novo com os mesmos valores.

## Como funciona a conciliação

1. Você carrega a **Planilha A** e a **Planilha B**.
2. Escolhe a **chave de cruzamento**: a coluna (ou colunas) que identifica o mesmo registro nas duas bases, como `ID`, `CPF`, `Hostname` ou `Pedido` ↔ `Código Pedido`.
3. A ferramenta normaliza as chaves (conforme as opções marcadas) e procura cada registro de A em B.
4. Cada linha é classificada em **uma única categoria**:

| Categoria                          | Significado                                                                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Encontrado / presente em ambas** | A chave existe em A e em B.                                                                                                                     |
| **Idêntico** _(modo Auditoria)_    | Encontrado, e todos os campos comparados têm o mesmo valor.                                                                                     |
| **Divergente** _(modo Auditoria)_  | Encontrado, mas pelo menos um campo comparado tem valor diferente. A coluna "Campos divergentes" diz quais.                                     |
| **Exclusivo de A / de B**          | A chave existe apenas em uma das planilhas.                                                                                                     |
| **Duplicada**                      | A chave já tinha aparecido antes na mesma planilha. Vale a primeira ocorrência; as demais ficam fora do cruzamento e aparecem numa aba própria. |
| **Sem chave**                      | Todas as colunas-chave da linha estão vazias. A linha fica fora do cruzamento e aparece numa aba própria.                                       |

As abas "Duplicadas" e "Sem chave" só aparecem quando há casos, acompanhadas de um aviso com a contagem.

### Modos de operação

- **Encontrar em ambas (inventário):** responde "quais registros de A existem em B?". Mostra as abas _Presentes em ambas_, _Só em B_, _Só em A_ e _Visão completa_. A Visão completa lista todas as linhas de A com a coluna `Match Status` (Encontrado, Não Encontrado, Chave duplicada ou Sem chave).
- **Auditar divergências:** além de cruzar, compara campos escolhidos (ex.: `Valor`, `Status`) e separa _Idênticos_ de _Divergências_.

### Como os valores são comparados

- Com **Ignorar maiúsculas/minúsculas** e **Ignorar espaços extras** (ligadas por padrão), `SRV01` = `srv01` e espaços repetidos ou nas pontas são desconsiderados.
- Na comparação de campos, números em formatos diferentes são considerados iguais: `10,00` = `10`, `1.234,56` = `1234.56` e `R$ 10,00` = `10`.
- **Ignorar domínio** (modo Inventário, ligada por padrão): `srv01.empresa.local` = `srv01`. Só valores com formato de hostname são alterados; IPs, CPF/CNPJ, e-mails, `IP:porta`, decimais e versões ficam intactos.
- **Estratégia Aproximada** (opcional): quando a chave não é encontrada exatamente, procura a chave mais parecida em B (semelhança mínima ajustável de 40% a 100%, padrão 75%). É indicada para textos; para códigos e hostnames prefira a estratégia **Exata** (ver limitações).

## Formatos aceitos

- Excel: `.xlsx` e `.xls`. É possível escolher a aba ou **consolidar todas as abas**, o que acrescenta a coluna `Aba_Origem`.
- Texto delimitado: `.csv`, com separador detectado automaticamente (vírgula ou ponto e vírgula) e codificação UTF-8.
- É possível **pular linhas iniciais** (títulos acima do cabeçalho). A primeira linha restante é usada como cabeçalho.

## Como usar (sem programar)

1. Abra a aplicação no navegador.
2. Escolha o modo: **Encontrar em ambas** ou **Auditar divergências**.
3. Arraste ou selecione a Planilha A e a Planilha B. Para conhecer a ferramenta, use **Testar com planilhas de exemplo**.
4. Confira a **chave de cruzamento** e, na Auditoria, os **campos a comparar**. Colunas com o mesmo nome são sugeridas automaticamente.
5. Ajuste as opções e clique em **Cruzar dados**.
6. Navegue pelas abas, filtre os resultados e use **Exportar .xlsx** ou **Exportar .csv**.

O passo a passo detalhado está no [Guia do Usuário](docs/GUIA-DO-USUARIO.md).

## Privacidade

As planilhas são lidas e cruzadas **na memória do navegador**. Elas não são enviadas a nenhum servidor da aplicação nem gravadas em banco de dados. Ao recarregar a página, os dados carregados somem.

A única exceção é a **assistência opcional com IA (Google Gemini)**, que fica desligada até você informar sua própria chave de API:

- **Sugerir com IA:** envia os nomes das colunas e as 2 primeiras linhas de cada planilha.
- **Gerar diagnóstico** (modo Auditoria): envia os totais do resultado e até 40 divergências (chave e valores de A e B).
- A chave fica salva no `localStorage` do navegador e é enviada diretamente ao Google.

Não use a IA com dados que não possam sair da sua máquina. As fontes da interface também são carregadas do Google Fonts.

## Tecnologias

React 19, TanStack Start/Router, Vite, TypeScript, Tailwind CSS 4, SheetJS (`xlsx`), PapaParse, Lucide e Vitest. Detalhes em [Arquitetura Técnica](docs/ARQUITETURA-TECNICA.md).

## Instalação e execução local

### Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior (testado com Node 26) e npm.
- Não é necessário banco de dados, conta em nuvem ou chave de API.

### Comandos

```bash
git clone https://github.com/wesleymarz01/conciliador-consolidador-de-dados.git
cd conciliador-consolidador-de-dados
npm install          # instala as dependências (usa o package-lock.json)
npm run dev          # ambiente de desenvolvimento em http://localhost:8080
```

| Objetivo                    | Comando                                                         |
| --------------------------- | --------------------------------------------------------------- |
| Rodar os testes             | `npm test`                                                      |
| Verificar tipos             | `npm run typecheck`                                             |
| Verificar estilo            | `npm run lint`                                                  |
| Gerar o build de produção   | `npm run build`                                                 |
| Executar o build localmente | `npm start` (porta 3000; outra porta com `PORT=8092 npm start`) |

> **Rede local:** o `npm start` aceita conexões de **todas as interfaces de rede** (outros dispositivos da rede podem abrir a página). Como as planilhas são processadas no navegador de quem acessa, nenhum dado é enviado ao servidor. Para aceitar apenas conexões da própria máquina, use `HOST=127.0.0.1 npm start`. No Windows (PowerShell): `$env:HOST="127.0.0.1"; npm start`.

## Funcionalidades disponíveis

- Importação de `.xlsx`, `.xls` e `.csv`, com escolha de aba, consolidação de abas e opção de pular linhas iniciais.
- Chave de cruzamento simples ou composta (várias colunas).
- Sugestão automática de pares de colunas com nomes iguais.
- Modos Inventário e Auditoria.
- Estratégias Exata e Aproximada.
- Normalização de maiúsculas, espaços, domínio de hostname e formatos numéricos/monetários.
- Separação de duplicadas e linhas sem chave.
- Indicadores de totais, cobertura e conciliação.
- Filtro de texto nos resultados.
- Inversão das planilhas A ↔ B.
- Nomes personalizados para as planilhas (modo Inventário).
- Exportação da aba atual (já filtrada) em `.xlsx` ou `.csv` (UTF-8 com BOM), com proteção contra fórmulas maliciosas no CSV.
- Assistência opcional com Gemini (sugestão de mapeamento e diagnóstico).
- Dados de exemplo fictícios.

## Limitações conhecidas

Resumo das principais (lista completa em [Limitações](docs/LIMITACOES.md)):

- A tabela mostra até **300 linhas** por aba; a exportação inclui todos os registros.
- O processamento roda na thread principal do navegador; arquivos grandes podem travar a página.
- A estratégia **Aproximada** pode associar várias linhas de A à mesma linha de B e confundir códigos parecidos (`PED-1001` × `PED-1005`).
- CSV em codificação diferente de UTF-8 (ex.: Windows-1252) pode exibir acentos incorretos.
- A dependência `xlsx` 0.18.5 tem vulnerabilidades conhecidas. Abra apenas arquivos de origem confiável.

## Evoluções planejadas

As possibilidades de evolução estão em [ROADMAP](docs/ROADMAP.md). **Nenhum item do roadmap está implementado.**

## Documentação

| Documento                                                      | Conteúdo                             |
| -------------------------------------------------------------- | ------------------------------------ |
| [Documentação Funcional](docs/DOCUMENTACAO-FUNCIONAL.md)       | Finalidade e regras de funcionamento |
| [Guia do Usuário](docs/GUIA-DO-USUARIO.md)                     | Passo a passo de uso                 |
| [Arquitetura Técnica](docs/ARQUITETURA-TECNICA.md)             | Estrutura, tecnologias e testes      |
| [Limitações](docs/LIMITACOES.md)                               | Limitações e o que ainda não existe  |
| [Roadmap](docs/ROADMAP.md)                                     | Possibilidades de evolução           |
| [Anotações](docs/ANOTACOES.md)                                 | Ideias, observações e decisões       |
| [Diário de Desenvolvimento](docs/DIARIO-DE-DESENVOLVIMENTO.md) | Histórico das etapas                 |
| [CHANGELOG](CHANGELOG.md)                                      | Registro de alterações               |

## Origem, autoria e evolução

O Conciliador & Consolidador de Dados foi idealizado e iniciado por [Wesley Martins (@wesleymarz01)](https://github.com/wesleymarz01). Antes da etapa na Lovable, o autor já havia desenvolvido uma primeira versão do projeto em ambiente privado e a compartilhou com o ChatGPT para análise e avaliação do código. Esse trabalho de análise e orientação com IA fez parte do processo desde uma fase inicial, antes da disponibilização da aplicação na Lovable.

Ao longo do desenvolvimento, ferramentas de inteligência artificial foram utilizadas como apoio em diferentes etapas, incluindo análise do código, orientação técnica, desenvolvimento, revisão e documentação. Esse uso é parte transparente do processo de trabalho; a concepção do projeto, as decisões e a condução do desenvolvimento são de seu autor.

Posteriormente, uma versão passou pelo ambiente Lovable, que teve um papel importante na evolução, implementação e disponibilização para testes e uso por uma pessoa convidada. A Lovable foi uma ferramenta e um ambiente utilizado durante o percurso, não a origem ou a autora do projeto.

Em 17/11/2026, foi publicado este repositório público independente. Ele parte de uma versão consolidada durante o desenvolvimento privado e inclui adaptações para execução local, independência operacional do ambiente Lovable e documentação própria. O repositório privado foi mantido separado e não é substituído por esta publicação; as duas versões não devem ser consideradas automaticamente sincronizadas ou idênticas.

O desenvolvimento inicial também incluiu uma etapa em Python. Python, porém, não faz parte da stack da versão atual, que utiliza as tecnologias listadas em [Tecnologias](#tecnologias).

## Licença

Nenhuma licença foi definida ainda. Até que uma seja escolhida, todos os direitos são reservados ao autor.
