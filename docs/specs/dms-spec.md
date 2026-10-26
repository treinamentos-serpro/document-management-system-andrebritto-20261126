# Especificação - Document Management System

> Especificação funcional e técnica do MVP, elaborada a partir de
> [spec-template.md](./spec-template.md). Este documento orienta o planejamento
> e a implementação futura; não inclui a execução ou criação de arquivos de
> backend ou frontend.

## 1. Objetivo

Permitir que usuários identifiquem seus documentos, enviem arquivos, consultem
os metadados dos documentos enviados e baixem seus arquivos, usando
armazenamento exclusivamente local.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos documentos associados ao usuário informado na requisição.
- Download de um documento pelo seu identificador, limitado ao usuário
  informado na requisição.
- Geração de identificadores e nomes físicos seguros para os arquivos.
- Persistência dos arquivos no filesystem local e dos metadados em memória.
- Interface web React para envio, listagem e download, integrada à API.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Banco de dados ou persistência dos metadados entre reinicializações.
- Versionamento, edição, exclusão, compartilhamento ou busca de documentos.
- Cadastro, autenticação e gestão de credenciais de usuários.
- Varredura antivírus, pré-visualização ou conversão de arquivos.
- Garantia de disponibilidade dos metadados após reinicialização do processo.

## 3. Requisitos funcionais

| ID    | Requisito |
| ----- | --------- |
| RF-01 | O sistema deve aceitar o envio de um único arquivo por requisição `multipart/form-data`, no campo `file`. |
| RF-02 | O sistema deve rejeitar requisições sem arquivo, com arquivo vazio ou que excedam o limite configurado. |
| RF-03 | Ao aceitar um arquivo, o sistema deve gravá-lo no armazenamento local e registrar seus metadados em memória. |
| RF-04 | O sistema deve gerar um identificador único e um nome físico seguro, sem usar o nome original como caminho de armazenamento. |
| RF-05 | O sistema deve associar cada documento ao identificador de usuário recebido na requisição. |
| RF-06 | O sistema deve listar somente os documentos associados ao usuário da requisição, sem incluir caminhos internos de armazenamento. |
| RF-07 | O sistema deve permitir baixar um documento pelo identificador somente quando ele pertencer ao usuário da requisição. |
| RF-08 | O sistema deve devolver erro explícito quando os dados forem inválidos, o documento não existir ou ocorrer falha de armazenamento/leitura. |
| RF-09 | A interface web deve permitir selecionar e enviar um arquivo, exibir os documentos do usuário e iniciar o download de um documento listado. |
| RF-10 | A interface deve apresentar mensagens compreensíveis de sucesso e erro para as operações de upload, listagem e download. |

## 4. Requisitos não funcionais

| ID     | Requisito |
| ------ | --------- |
| RNF-01 | Os arquivos devem ser gravados no filesystem local em `backend/storage`, usando `multer` com `diskStorage`. |
| RNF-02 | Os metadados devem permanecer em memória durante a execução do processo; reiniciar o backend pode invalidar a listagem e a associação dos arquivos existentes. |
| RNF-03 | O backend deve seguir Clean Architecture simples, com dependências no sentido `routes -> controllers -> services -> repositories`. |
| RNF-04 | A configuração operacional deve ser fornecida por variáveis de ambiente, conforme o princípio 12-Factor. |
| RNF-05 | O nome original do arquivo não deve ser usado para compor caminhos no filesystem. O caminho de armazenamento não deve ser exposto pela API. |
| RNF-06 | O limite de tamanho do upload deve ser configurável por `UPLOAD_MAX_FILE_SIZE_BYTES`; na ausência da variável, o padrão do MVP deve ser 10 MiB (10.485.760 bytes). |
| RNF-07 | Na ausência de uma política de tipos de arquivo definida, o MVP deve aceitar qualquer tipo de arquivo que respeite o limite de tamanho; o nome original deve ser tratado apenas como metadado e valor de apresentação. |
| RNF-08 | A comunicação da interface com o backend deve usar o prefixo `/api`, encaminhado pelo proxy de desenvolvimento do Vite. |
| RNF-09 | A API deve responder erros em formato JSON consistente, sem expor stack traces, caminhos locais ou detalhes internos da infraestrutura. |
| RNF-10 | A aplicação não deve depender de provedores de armazenamento ou serviços de upload externos. |

## 5. Modelo de dados

### Metadados de documento

| Campo        | Tipo   | Obrigatório | Descrição |
| ------------ | ------ | ----------- | --------- |
| `id`         | string | Sim         | Identificador único e opaco do documento, gerado pelo sistema. |
| `originalName` | string | Sim       | Nome original enviado pelo cliente; usado somente como metadado e nome de apresentação. |
| `size`       | number | Sim         | Tamanho do arquivo em bytes. Deve ser maior que zero e não exceder o limite configurado. |
| `uploadedAt` | string | Sim         | Data e hora do upload em ISO 8601, com indicação de fuso horário, em UTC. |
| `owner`      | string | Sim         | Identificador do usuário associado ao documento. |

O repositório em memória mantém os metadados indexados por `id`. A associação
com o arquivo físico é interna ao backend: o arquivo recebe nome gerado pelo
sistema e fica em `backend/storage`. Essa informação interna não faz parte das
respostas da API.

### Identificação do usuário no MVP

Como cadastro e autenticação estão fora do escopo, os contratos usam o
cabeçalho `X-User-Id` como identificador fornecido pelo cliente. O backend deve
validá-lo como valor não vazio e usá-lo para associar e filtrar documentos.
Esse cabeçalho é apenas uma identidade declarada: não autentica o usuário nem
constitui mecanismo seguro de autorização. Autenticação real deve ser tratada
em evolução futura, antes de expor o serviço em ambiente não confiável.

## 6. Contratos de API

Os caminhos abaixo são relativos ao backend. A interface acessa os mesmos
caminhos com o prefixo `/api` por meio do proxy do Vite. Todas as operações
exigem `X-User-Id`, exceto quando uma resposta de validação informa a ausência
do cabeçalho.

### Formato comum de erro

Respostas de erro usam `application/json`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição segura e compreensível do problema."
  }
}
```

O campo `code` deve ser estável para tratamento pela interface. O campo
`message` deve descrever o erro sem revelar detalhes internos.

### `POST /upload`

Envia um documento e registra seus metadados.

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: `multipart/form-data`, com exatamente um arquivo no campo `file`.
- Saída em sucesso: `201 Created`, `Content-Type: application/json`.

```json
{
  "id": "identificador-opaco",
  "originalName": "relatorio.pdf",
  "size": 2048,
  "uploadedAt": "2026-10-26T19:29:10.000Z",
  "owner": "usuario-123"
}
```

Erros previstos:

| HTTP | `code` | Situação |
| ---- | ------ | -------- |
| 400  | `VALIDATION_ERROR` | Cabeçalho ausente/vazio, arquivo ausente ou arquivo vazio. |
| 413  | `FILE_TOO_LARGE` | Arquivo acima de `UPLOAD_MAX_FILE_SIZE_BYTES`. |
| 500  | `STORAGE_ERROR` | Falha ao gravar o arquivo ou registrar os metadados. |

Se o arquivo for gravado, mas o registro dos metadados falhar, o serviço deve
tentar remover o arquivo criado e reportar o erro; não deve retornar sucesso
com um documento parcialmente registrado.

### `GET /documents`

Lista documentos do usuário informado. A lista deve ser ordenada por
`uploadedAt` decrescente; em caso de empate, a ordem pode ser qualquer.

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Saída em sucesso: `200 OK`, `Content-Type: application/json`.
- Corpo: array de metadados; retornar `[]` quando não houver documentos.
- Os itens devem conter somente os campos públicos do modelo de metadados.

Erros previstos:

| HTTP | `code` | Situação |
| ---- | ------ | -------- |
| 400  | `VALIDATION_ERROR` | Cabeçalho ausente ou vazio. |
| 500  | `INTERNAL_ERROR` | Falha inesperada ao consultar o repositório. |

### `GET /documents/:id/download`

Transmite o conteúdo binário do documento. O documento deve existir e pertencer
ao usuário indicado em `X-User-Id`.

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Saída em sucesso: `200 OK`, conteúdo binário do arquivo.
- `Content-Disposition` deve indicar `attachment` e usar o nome original como
  nome de download, devidamente tratado como valor de cabeçalho.
- O caminho físico e o nome interno de armazenamento não devem ser retornados.

Erros previstos:

| HTTP | `code` | Situação |
| ---- | ------ | -------- |
| 400  | `VALIDATION_ERROR` | Cabeçalho ausente ou vazio. |
| 404  | `DOCUMENT_NOT_FOUND` | Identificador inexistente ou documento não pertencente ao usuário informado. |
| 500  | `STORAGE_ERROR` | Falha ao localizar ou ler o arquivo físico. |

## 7. Decisões arquiteturais

- **Routes:** declaram os métodos e caminhos HTTP, aplicam middlewares de
  transporte (incluindo `multer`) e delegam aos controllers.
- **Controllers:** validam e traduzem entrada/saída HTTP; não implementam regras
  de negócio nem acesso direto ao filesystem.
- **Services:** aplicam as regras de upload, associação ao usuário, listagem,
  download e consistência entre gravação do arquivo e registro do metadado.
- **Repositories:** mantêm os metadados em memória e isolam as operações
  necessárias para localizar e associar documentos a arquivos locais.
- **Armazenamento:** `multer` com `diskStorage` grava em `backend/storage`.
  O diretório pode ser parametrizado por `STORAGE_DIR`, cujo padrão é
  `backend/storage`; não deve haver armazenamento externo.
- **Identificadores e arquivos:** usar identificador gerado pelo sistema para
  distinguir o documento e um nome físico gerado separadamente. Nunca resolver
  o caminho usando `id` ou `originalName` sem validação e controle do backend.
- **Frontend:** React com componentes funcionais e Hooks, organizado em
  componentes, páginas e serviços; chamadas HTTP via `fetch` e prefixo `/api`.
- **Configuração:** `PORT` controla a porta do backend; `STORAGE_DIR` controla o
  diretório local; `UPLOAD_MAX_FILE_SIZE_BYTES` controla o limite de upload.
- **Tratamento de falhas:** erros devem ser convertidos no limite HTTP para os
  status e códigos definidos. Falhas de filesystem não devem ser ocultadas nem
  convertidas em respostas de sucesso.
- **Limitação de identidade:** `X-User-Id` atende apenas à separação funcional
  básica do MVP; não substitui autenticação/autorização confiável.

## 8. Plano de execução

Etapas de planejamento e implementação futura, em ordem. Este plano não inclui
alterações nem tarefas de execução de arquivos de backend ou frontend.

1. Revisar e aprovar escopo, decisões do MVP, contrato da identidade
   `X-User-Id` e códigos de erro.
2. Preparar o ambiente e definir a configuração de execução local, incluindo
   diretório de armazenamento e limite de upload.
3. Implementar o fluxo de upload local e registro de metadados em memória,
   incluindo validação e tratamento de falhas parciais.
4. Implementar listagem isolada por usuário e download do arquivo associado,
   com respostas consistentes para documentos ausentes e falhas de leitura.
5. Implementar a interface para enviar, listar e baixar documentos, integrada
   à API pelo proxy `/api`.
6. Validar contratos, cenários de erro, isolamento por usuário, limite de
   tamanho e gravação exclusivamente local.
7. Documentar execução local, limitações de persistência e a ausência de
   autenticação real antes de considerar o MVP concluído.
