# Anotações

Espaço para ideias, observações e decisões. Use uma entrada por assunto, com data. Decisões que mudam o comportamento devem ir também para o [Diário](DIARIO-DE-DESENVOLVIMENTO.md) e o [CHANGELOG](../CHANGELOG.md).

## Decisões em vigor

### 2026-11-17: política de chaves duplicadas

Vale a **primeira ocorrência** de cada chave, em A e em B. As demais linhas ficam fora do cruzamento e são listadas nas abas "Duplicadas". Linhas com todas as colunas-chave vazias vão para "Sem chave". Motivo: antes, linhas eram perdidas ou contadas em dobro sem aviso.

### 2026-11-17: "Ignorar domínio" ligado por padrão no Inventário

A opção continua ligada, mas só altera valores com formato de hostname. Motivo: mantém o uso original (hostnames de TI) sem truncar CPF, CNPJ, e-mails etc.

### 2026-11-17: padrões "Homologação" e "TSM"

Os nomes padrão das planilhas no modo Inventário foram mantidos, por virem do caso de uso original (inventário de servidores).

### 2026-11-17: execução local com Node

A configuração do Lovable foi substituída por uma configuração explícita do Vite. O build gera um servidor Node local (`npm start`). Não há hospedagem nem serviços de nuvem configurados.

### 2026-11-17: npm como gerenciador de pacotes

O `package-lock.json` é versionado para que a instalação seja reproduzível com Node e npm, sem ferramentas adicionais.

### 2026-11-17: autoria

O projeto foi idealizado e é desenvolvido por Wesley Martins. Ferramentas de IA (Lovable e assistentes de código) foram usadas pontualmente como apoio e não são autoras do projeto.

## Pendências de decisão

- **Licença do projeto:** ainda não definida. Até lá, todos os direitos são reservados ao autor.
- **Atualização do `xlsx`:** recomendação técnica apresentada em 17/11/2026 (SheetJS 0.20.3 da CDN oficial, mesma API, compatibilidade verificada). Aguardando aprovação.
- **Modelo do Gemini:** confirmar a disponibilidade do `gemini-4-argon` ou torná-lo configurável.

## Ideias

_(Adicione aqui ideias ainda não avaliadas.)_
