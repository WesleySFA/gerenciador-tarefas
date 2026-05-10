const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'
app.use(cors())
app.use(express.json())
app.use(express.static('public'))
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tarefas_db',
    waitForConnections: true,
    connectionLimit: 10
})
async function initDB() {
    const connection = await pool.getConnection()
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nome VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                senha VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                status VARCHAR(50) DEFAULT 'pendente',
                done TINYINT DEFAULT 0,
                ordem INT DEFAULT 0,
                prioridade VARCHAR(20) DEFAULT 'media',
                prazo DATETIME DEFAULT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                data_conclusao DATETIME DEFAULT NULL
            )
        `)
        try { await connection.query("ALTER TABLE tasks ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE") } catch (e) {}
        console.log("Banco de dados atualizado com sucesso")
    } finally {
        connection.release()
    }
}
function sanitize(str) {
    if (typeof str !== 'string') return str
    return str.trim().replace(/<[^>]*>/g, '').substring(0, 500)
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization
    if (!header) return res.status(401).json({ error: 'Token não fornecido' })
    try {
        const decoded = jwt.verify(header.replace('Bearer ', ''), JWT_SECRET)
        req.userId = decoded.id
        next()
    } catch (err) {
        res.status(401).json({ error: 'Token inválido' })
    }
}
app.post('/register', async (req, res) => {
    const nome = sanitize(req.body.nome)
    const email = sanitize(req.body.email)
    const senha = req.body.senha
    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Preencha todos os campos' })
    }
    if (senha.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' })
    }
    try {
        const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email])
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' })
        }
        const senhaHash = await bcrypt.hash(senha, 10)
        const [result] = await pool.query("INSERT INTO users (nome, email, senha) VALUES (?, ?, ?)", [nome, email, senhaHash])
        const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET, { expiresIn: '7d' })
        res.status(201).json({ token, user: { id: result.insertId, nome, email } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.post('/login', async (req, res) => {
    const email = sanitize(req.body.email)
    const senha = req.body.senha
    if (!email || !senha) {
        return res.status(400).json({ error: 'Preencha todos os campos' })
    }
    try {
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email])
        if (users.length === 0) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }
        const user = users[0]
        const senhaValida = await bcrypt.compare(senha, user.senha)
        if (!senhaValida) {
            return res.status(401).json({ error: 'Email ou senha inválidos' })
        }
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' })
        res.json({ token, user: { id: user.id, nome: user.nome, email: user.email } })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.get('/me', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query("SELECT id, nome, email FROM users WHERE id = ?", [req.userId])
        if (users.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' })
        res.json(users[0])
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.get('/tasks', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM tasks WHERE user_id = ? ORDER BY FIELD(prioridade, 'alta', 'media', 'baixa'), ordem ASC, created_at DESC", [req.userId])
        res.json(rows.map(row => ({
            id: row.id.toString(),
            user_id: row.user_id,
            titulo: row.titulo,
            descricao: row.descricao,
            status: row.status,
            done: row.done === 1,
            ordem: row.ordem,
            prioridade: row.prioridade,
            prazo: row.prazo,
            data_criacao: row.created_at,
            data_conclusao: row.data_conclusao
        })))
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.post('/tasks', authMiddleware, async (req, res) => {
    const titulo = sanitize(req.body.titulo)
    const descricao = sanitize(req.body.descricao || "")
    const status = ["pendente", "andamento", "concluida"].includes(req.body.status) ? req.body.status : "pendente"
    const prioridade = ["baixa", "media", "alta"].includes(req.body.prioridade) ? req.body.prioridade : "media"
    const prazo = req.body.prazo || null
    if (!titulo) {
        return res.status(400).json({ error: 'Título é obrigatório' })
    }
    try {
        const [maxOrdem] = await pool.query("SELECT MAX(ordem) as max FROM tasks WHERE user_id = ?", [req.userId])
        const novaOrdem = (maxOrdem[0].max || 0) + 1
        const [result] = await pool.query(
            "INSERT INTO tasks (user_id, titulo, descricao, status, done, ordem, prioridade, prazo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [req.userId, titulo, descricao || "", status || "pendente", status === "concluida" ? 1 : 0, novaOrdem, prioridade || "media", prazo || null]
        )
        const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [result.insertId])
        const row = rows[0]
        res.status(201).json({
            id: row.id.toString(),
            user_id: row.user_id,
            titulo: row.titulo,
            descricao: row.descricao,
            status: row.status,
            done: row.done === 1,
            ordem: row.ordem,
            prioridade: row.prioridade,
            prazo: row.prazo,
            data_criacao: row.created_at,
            data_conclusao: row.data_conclusao
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.put('/tasks/:id', authMiddleware, async (req, res) => {
    const acao = req.body.acao
    const status = ["pendente", "andamento", "concluida"].includes(req.body.status) ? req.body.status : null
    const prioridade = ["baixa", "media", "alta"].includes(req.body.prioridade) ? req.body.prioridade : req.body.prioridade
    const prazo = req.body.prazo
    const id = req.params.id
    try {
        const [taskCheck] = await pool.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, req.userId])
        if (taskCheck.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' })
        if (acao === 'mover_cima') {
            const [tasks] = await pool.query("SELECT * FROM tasks WHERE user_id = ? ORDER BY FIELD(prioridade, 'alta', 'media', 'baixa'), ordem ASC", [req.userId])
            const currentIndex = tasks.findIndex(t => t.id.toString() === id)
            if (currentIndex > 0) {
                const currentTask = tasks[currentIndex]
                const aboveTask = tasks[currentIndex - 1]
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [aboveTask.ordem, currentTask.id])
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [currentTask.ordem, aboveTask.id])
            }
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            return res.json(rows[0] ? {
                id: rows[0].id.toString(), user_id: rows[0].user_id, titulo: rows[0].titulo,
                descricao: rows[0].descricao, status: rows[0].status, done: rows[0].done === 1,
                ordem: rows[0].ordem, prioridade: rows[0].prioridade, prazo: rows[0].prazo,
                data_criacao: rows[0].created_at, data_conclusao: rows[0].data_conclusao
            } : {})
        }
        if (acao === 'mover_baixo') {
            const [tasks] = await pool.query("SELECT * FROM tasks WHERE user_id = ? ORDER BY FIELD(prioridade, 'alta', 'media', 'baixa'), ordem ASC", [req.userId])
            const currentIndex = tasks.findIndex(t => t.id.toString() === id)
            if (currentIndex < tasks.length - 1) {
                const currentTask = tasks[currentIndex]
                const belowTask = tasks[currentIndex + 1]
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [belowTask.ordem, currentTask.id])
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [currentTask.ordem, belowTask.id])
            }
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            return res.json(rows[0] ? {
                id: rows[0].id.toString(), user_id: rows[0].user_id, titulo: rows[0].titulo,
                descricao: rows[0].descricao, status: rows[0].status, done: rows[0].done === 1,
                ordem: rows[0].ordem, prioridade: rows[0].prioridade, prazo: rows[0].prazo,
                data_criacao: rows[0].created_at, data_conclusao: rows[0].data_conclusao
            } : {})
        }
        if (prioridade !== undefined || prazo !== undefined) {
            const updates = []; const values = []
            if (prioridade !== undefined) { updates.push("prioridade = ?"); values.push(prioridade) }
            if (prazo !== undefined) { updates.push("prazo = ?"); values.push(prazo || null) }
            values.push(id)
            await pool.query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, values)
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            const row = rows[0]
            return res.json({
                id: row.id.toString(), user_id: row.user_id, titulo: row.titulo, descricao: row.descricao,
                status: row.status, done: row.done === 1, ordem: row.ordem, prioridade: row.prioridade,
                prazo: row.prazo, data_criacao: row.created_at, data_conclusao: row.data_conclusao
            })
        }
        if (status) {
            const dataConclusao = status === "concluida" ? new Date() : null
            await pool.query("UPDATE tasks SET status = ?, done = ?, data_conclusao = ? WHERE id = ? AND user_id = ?",
                [status, status === "concluida" ? 1 : 0, dataConclusao, id, req.userId])
            res.json({ id, status, done: status === "concluida", data_conclusao: dataConclusao })
        } else {
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ? AND user_id = ?", [id, req.userId])
            if (rows.length === 0) return res.status(404).send("Tarefa não encontrada")
            const row = rows[0]
            const newStatus = row.done ? "pendente" : "concluida"
            const newDone = row.done ? 0 : 1
            const dataConclusao = newDone ? new Date() : null
            await pool.query("UPDATE tasks SET status = ?, done = ?, data_conclusao = ? WHERE id = ? AND user_id = ?",
                [newStatus, newDone, dataConclusao, id, req.userId])
            res.json({ id, status: newStatus, done: newDone === 1, data_conclusao: dataConclusao })
        }
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
    try {
        await pool.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [req.params.id, req.userId])
        res.send("Tarefa deletada")
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
initDB().then(() => {
    app.listen(PORT, () => {
        console.log("Servidor rodando http://localhost:3000")
        console.log("Banco de dados MySQL conectado")
    })
}).catch(err => {
    console.error("Erro ao conectar no MySQL:", err.message)
})
