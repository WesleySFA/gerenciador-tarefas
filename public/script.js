const API = "http://localhost:3000"
let currentFilter = "all"
let searchTerm = ""
let allTasks = []
let currentView = "list"

function getToken() {
  return localStorage.getItem("token")
}

function authFetch(url, options = {}) {
  const token = getToken()
  if (token) {
    options.headers = options.headers || {}
    options.headers["Authorization"] = "Bearer " + token
  }
  return fetch(url, options)
}

function checkAuth() {
  const token = getToken()
  if (token) {
    authFetch(API + "/me")
      .then(res => {
        if (res.ok) return res.json()
        throw new Error("Token inválido")
      })
      .then(user => {
        document.getElementById("user-name").textContent = user.nome
        document.getElementById("auth-section").style.display = "none"
        document.getElementById("tasks-section").style.display = "block"
        listar()
      })
      .catch(() => {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        showAuth()
      })
  } else {
    showAuth()
  }
}

function showAuth() {
  document.getElementById("auth-section").style.display = "block"
  document.getElementById("tasks-section").style.display = "none"
}

function showAuthForm(form) {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"))
  document.querySelector(`.auth-tab[onclick*="${form}"]`).classList.add("active")
  document.getElementById("auth-login").style.display = form === "login" ? "block" : "none"
  document.getElementById("auth-register").style.display = form === "register" ? "block" : "none"
}

function login() {
  const email = document.getElementById("login-email").value
  const senha = document.getElementById("login-senha").value
  document.getElementById("login-error").textContent = ""
  fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, senha })
  })
    .then(async res => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    })
    .then(data => {
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      checkAuth()
    })
    .catch(err => {
      document.getElementById("login-error").textContent = err.message
    })
}

function register() {
  const nome = document.getElementById("register-nome").value
  const email = document.getElementById("register-email").value
  const senha = document.getElementById("register-senha").value
  document.getElementById("register-error").textContent = ""
  fetch(API + "/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome, email, senha })
  })
    .then(async res => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      return data
    })
    .then(data => {
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      checkAuth()
    })
    .catch(err => {
      document.getElementById("register-error").textContent = err.message
    })
}

function logout() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
  showAuth()
}

function toggleView(view) {
  currentView = view
  document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"))
  document.querySelector(`.view-btn[data-view="${view}"]`).classList.add("active")
  if (view === "list") {
    document.getElementById("list-view").style.display = "block"
    document.getElementById("list-filters").style.display = "flex"
    document.getElementById("kanban-view").style.display = "none"
  } else {
    document.getElementById("list-view").style.display = "none"
    document.getElementById("list-filters").style.display = "none"
    document.getElementById("kanban-view").style.display = "block"
  }
  renderTasks()
}

function listar() {
  authFetch(API + "/tasks")
    .then(res => res.json())
    .then(tasks => {
      allTasks = tasks
      renderTasks()
    })
}

function filtrarBusca() {
  searchTerm = document.getElementById("busca").value.toLowerCase()
  renderTasks()
}

function getFilteredTasks() {
  let filtered = currentFilter === "all"
    ? allTasks
    : allTasks.filter(t => t.status === currentFilter)
  if (searchTerm) {
    filtered = filtered.filter(t =>
      t.titulo.toLowerCase().includes(searchTerm) ||
      (t.descricao && t.descricao.toLowerCase().includes(searchTerm))
    )
  }
  return filtered
}

function renderTasks() {
  if (currentView === "list") {
    renderListView()
  } else {
    renderKanbanView()
  }
}

function renderListView() {
  const lista = document.getElementById("lista")
  lista.innerHTML = ""
  const filtered = getFilteredTasks()
  document.getElementById("contador").textContent = `(${filtered.length})`
  if (filtered.length === 0) {
    lista.innerHTML = `
      <div class="empty-state">
        <span>📝</span>
        <p>Nenhuma tarefa encontrada</p>
      </div>
    `
    return
  }
  filtered.forEach(task => {
    const li = document.createElement("li")
    if (task.status === "concluida") li.classList.add("concluida")
    const dataCriacao = formatDate(task.data_criacao)
    const dataConclusao = task.data_conclusao ? formatDate(task.data_conclusao) : null
    const prazoFormatado = task.prazo ? formatDate(task.prazo) : null
    const prazoAtrasado = task.prazo && new Date(task.prazo) < new Date() && task.status !== "concluida"
    li.innerHTML = `
      <div class="task-info">
        <div class="task-header">
          <span class="prioridade-dot ${task.prioridade}" title="Prioridade ${formatPrioridade(task.prioridade)}"></span>
          <strong class="task-title">${task.titulo}</strong>
        </div>
        <span class="task-desc">${task.descricao || "Sem descrição"}</span>
        <div class="task-meta">
          <span class="task-status ${task.status}">${formatStatus(task.status)}</span>
          ${prazoFormatado ? `<span class="task-prazo ${prazoAtrasado ? 'atrasado' : ''}">📅 ${prazoFormatado}</span>` : ""}
        </div>
        <div class="task-dates">
          <span class="date-created">Criada: ${dataCriacao}</span>
          ${dataConclusao ? `<span class="date-completed">Concluída: ${dataConclusao}</span>` : ""}
        </div>
      </div>
      <div class="botoes">
        <button class="btn-mover" onclick="moverTarefa('${task.id}', 'cima')" title="Mover para cima">↑</button>
        <button class="btn-mover" onclick="moverTarefa('${task.id}', 'baixo')" title="Mover para baixo">↓</button>
        ${task.status !== "andamento" ? `<button class="btn-andamento" onclick="mudarStatus('${task.id}', 'andamento')" title="Em Andamento">⏳</button>` : ""}
        ${task.status !== "concluida" ? `<button class="btn-concluir" onclick="mudarStatus('${task.id}', 'concluida')" title="Concluir">✓</button>` : ""}
        <button class="btn-deletar" onclick="deletar('${task.id}')" title="Excluir">✕</button>
      </div>
    `
    lista.appendChild(li)
  })
}

function renderKanbanView() {
  const columns = ["pendente", "andamento", "concluida"]
  columns.forEach(status => {
    const container = document.getElementById("kanban-" + status)
    container.innerHTML = ""
    let tasks = allTasks.filter(t => t.status === status)
    if (searchTerm) {
      tasks = tasks.filter(t =>
        t.titulo.toLowerCase().includes(searchTerm) ||
        (t.descricao && t.descricao.toLowerCase().includes(searchTerm))
      )
    }
    document.getElementById("count-" + status).textContent = tasks.length
    if (tasks.length === 0) {
      container.innerHTML = `<div class="kanban-empty">Nenhuma tarefa</div>`
      return
    }
    tasks.forEach(task => {
      const card = document.createElement("div")
      card.className = "kanban-card" + (task.status === "concluida" ? " concluida" : "")
      card.draggable = true
      card.dataset.id = task.id
      card.ondragstart = function(e) { dragTask(e, task.id) }
      const prazoFormatado = task.prazo ? formatDate(task.prazo) : null
      const prazoAtrasado = task.prazo && new Date(task.prazo) < new Date() && task.status !== "concluida"
      card.innerHTML = `
        <div class="kanban-card-header">
          <span class="prioridade-dot ${task.prioridade}" title="Prioridade ${formatPrioridade(task.prioridade)}"></span>
          <strong>${task.titulo}</strong>
        </div>
        ${task.descricao ? `<p class="kanban-card-desc">${task.descricao}</p>` : ""}
        <div class="kanban-card-meta">
          ${prazoFormatado ? `<span class="${prazoAtrasado ? 'atrasado' : ''}">📅 ${prazoFormatado}</span>` : ""}
        </div>
        <div class="kanban-card-actions">
          <button class="btn-deletar-sm" onclick="deletar('${task.id}')" title="Excluir">✕</button>
        </div>
      `
      container.appendChild(card)
    })
  })
}

function dragTask(e, id) {
  e.dataTransfer.setData("text/plain", id)
}

function allowDrop(e) {
  e.preventDefault()
  const column = e.target.closest(".kanban-column")
  if (column) column.setAttribute("dragover", "true")
}

function dragLeaveColumn(e) {
  const column = e.target.closest(".kanban-column")
  if (column) column.removeAttribute("dragover")
}

function dropTask(e) {
  e.preventDefault()
  const id = e.dataTransfer.getData("text/plain")
  const column = e.target.closest(".kanban-column")
  if (!column) return
  column.removeAttribute("dragover")
  const newStatus = column.dataset.status
  const task = allTasks.find(t => t.id === id)
  if (!task || task.status === newStatus) return
  mudarStatus(id, newStatus)
}

function formatDate(dateString) {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  })
}

function formatStatus(status) {
  const map = { pendente: "Pendente", andamento: "Em Andamento", concluida: "Concluída" }
  return map[status] || status
}

function formatPrioridade(prioridade) {
  const map = { alta: "Alta", media: "Média", baixa: "Baixa" }
  return map[prioridade] || prioridade
}

function criar() {
  const titulo = document.getElementById("titulo").value
  const descricao = document.getElementById("descricao").value
  const status = document.getElementById("status").value
  const prioridade = document.getElementById("prioridade").value
  const prazo = document.getElementById("prazo").value
  if (!titulo.trim()) {
    alert("Por favor, insira um título")
    return
  }
  authFetch(API + "/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, descricao, status, prioridade, prazo: prazo || null })
  }).then(() => {
    document.getElementById("titulo").value = ""
    document.getElementById("descricao").value = ""
    document.getElementById("prioridade").value = "media"
    document.getElementById("prazo").value = ""
    document.getElementById("status").value = "pendente"
    listar()
  })
}

function mudarStatus(id, novoStatus) {
  authFetch(API + "/tasks/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: novoStatus })
  }).then(() => listar())
}

function moverTarefa(id, direcao) {
  authFetch(API + "/tasks/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao: direcao === 'cima' ? 'mover_cima' : 'mover_baixo' })
  }).then(() => listar())
}

function deletar(id) {
  if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
    authFetch(API + "/tasks/" + id, {
      method: "DELETE"
    }).then(() => listar())
  }
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"))
    btn.classList.add("active")
    currentFilter = btn.dataset.filter
    renderTasks()
  })
})

checkAuth()
