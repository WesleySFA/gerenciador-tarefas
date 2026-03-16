# Gerenciador de Tarefas

Sistema de gerenciamento de tarefas desenvolvido como projeto para a matéria de Projeto de Software.

## 📋 Descrição

Aplicação web para gerenciar tarefas diárias com funcionalidades completas de CRUD (Criar, Ler, Atualizar, Deletar), filtragem por status e reordenação.

## 🏗️ Arquitetura (3 Camadas)

| Camada | Tecnologia |
|--------|-------------|
| **Front-end** | HTML, CSS, JavaScript (Vanilla) |
| **Back-end** | Node.js + Express |
| **Banco de Dados** | MySQL |

## 🚀 Funcionalidades

- ✅ **Criar tarefa** - Adicionar nova tarefa com título, descrição e status
- ✅ **Listar tarefas** - Exibir todas as tarefas cadastradas com detalhes
- ✅ **Filtrar tarefas** - Filtrar por status (Todas, Pendente, Em Andamento, Concluída)
- ✅ **Alterar status** - Mudar status da tarefa via botões
- ✅ **Mover tarefas** - Reordenar tarefas (mover para cima/baixo)
- ✅ **Deletar tarefa** - Excluir tarefa com confirmação
- ✅ **Exibir datas** - Mostrar data de criação e conclusão
- ✅ **Visual diferenciado** - Estilo visual específico para tarefas concluídas

## 📦 Pré-requisitos

- Node.js (v14 ou superior)
- MySQL (v5.7 ou superior)
- npm ou yarn

## ⚙️ Instalação

```bash
# Clone o repositório
git clone https://github.com/WesleySFA/gerenciador-tarefas.git

# Acesse o diretório
cd gerenciador-tarefas

# Instale as dependências
npm install

# Configure o banco de dados
# Edite o arquivo index.js com suas credenciais MySQL:
# - host: 'localhost'
# - user: 'seu_usuario'
# - password: 'sua_senha'
# - database: 'tarefas_db'

# Inicie o servidor
npm start
```

## 🔧 Configuração do Banco de Dados

O banco de dados `tarefas_db` deve ser criado automaticamente ao iniciar o servidor. Se preferir criar manualmente:

```sql
CREATE DATABASE tarefas_db;
```

A tabela `tasks` será criada automaticamente com a estrutura:

| Campo | Tipo | Descrição |
|-------|------|------------|
| id | INT AUTO_INCREMENT | ID único |
| titulo | VARCHAR(255) | Título da tarefa |
| descricao | TEXT | Descrição da tarefa |
| status | VARCHAR(50) | Status (pendente/andamento/concluida) |
| done | TINYINT | Marcador de conclusão (0/1) |
| ordem | INT | Ordem de exibição |
| created_at | DATETIME | Data de criação |
| data_conclusao | DATETIME | Data de conclusão |

## 🎮 Como Usar

1. Acesse http://localhost:3000 no navegador
2. Preencha o título e descrição da tarefa
3. Selecione o status inicial
4. Clique em "Adicionar tarefa"
5. Use os botões para mover, alterar status ou excluir tarefas
6. Use os filtros para visualizar tarefas por status

## 📁 Estrutura de Arquivos

```
gerenciador-tarefas/
├── public/
│   ├── index.html    # Página principal
│   ├── styles.css    # Estilos CSS
│   └── script.js     # Lógica do front-end
├── index.js          # Servidor Node.js (back-end)
├── package.json      # Dependências do projeto
└── README.md         # Este arquivo
```

## 📅 Cronograma de Entregas

| Entrega | Data | Status |
|---------|------|--------|
| 1ª AC | 15/03 | ✅ Concluída |
| 2ª AC | 12/04 | 🔄 Em desenvolvimento |
| 3ª AC | 10/05 | 📝 Pendente |
| Entrega Final | 07/06 | 📝 Pendente |

## 👥 Equipe

- Wesley Santos de Souza Araujo (WesleySFA)

## 📄 Licença

Este projeto está disponível para fins educacionais.

## 🔗 Links Úteis

- **Repositório**: https://github.com/WesleySFA/gerenciador-tarefas
- **Board do Projeto**: https://github.com/users/WesleySFA/projects

---

Desenvolvido para a matéria de Projeto de Software.