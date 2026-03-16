const API = "http://localhost:3000/tasks"
let currentFilter = "all"
function listar() {
  fetch(API)
    .then(res => res.json())
    .then(tasks => {
      const lista = document.getElementById("lista")
      lista.innerHTML = ""
      
      const filtered = currentFilter === "all" 
        ? tasks 
        : tasks.filter(t => t.status === currentFilter)
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
        
        if (task.status === "concluida") {
          li.classList.add("concluida")
        }
        const dataCriacao = formatDate(task.data_criacao)
        const dataConclusao = task.data_conclusao ? formatDate(task.data_conclusao) : null
        li.innerHTML = `
          <div class="task-info">
            <strong class="task-title">${task.titulo}</strong>
            <span class="task-desc">${task.descricao || "Sem descrição"}</span>
            <span class="task-status ${task.status}">${formatStatus(task.status)}</span>
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
    })
}
function formatDate(dateString) {
  if (!dateString) return "-"
  const date = new Date(dateString)
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}
function formatStatus(status) {
  const map = {
    pendente: "Pendente",
    andamento: "Em Andamento",
    concluida: "Concluída"
  }
  return map[status] || status
}
function criar() {
  const titulo = document.getElementById("titulo").value
  const descricao = document.getElementById("descricao").value
  const status = document.getElementById("status").value
  if (!titulo.trim()) {
    alert("Por favor, insira um título")
    return
  }
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, descricao, status })
  }).then(() => {
    document.getElementById("titulo").value = ""
    document.getElementById("descricao").value = ""
    document.getElementById("status").value = "pendente"
    listar()
  })
}
function mudarStatus(id, novoStatus) {
  fetch(API + "/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: novoStatus })
  }).then(() => listar())
}
function moverTarefa(id, direcao) {
  fetch(API + "/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ acao: direcao === 'cima' ? 'mover_cima' : 'mover_baixo' })
  }).then(() => listar())
}
function deletar(id) {
  if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
    fetch(API + "/" + id, {
      method: "DELETE"
    }).then(() => listar())
  }
}
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"))
    btn.classList.add("active")
    currentFilter = btn.dataset.filter
    listar()
  })
})
listar()