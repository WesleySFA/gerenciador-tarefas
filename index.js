const express = require('express')
const cors = require('cors')
const mysql = require('mysql2/promise')
const app = express()
const PORT = 3000
app.use(cors())
app.use(express.json())
app.use(express.static('public'))
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '12345',
    database: 'tarefas_db',
    waitForConnections: true,
    connectionLimit: 10
})
async function initDB() {
    const connection = await pool.getConnection()
    try {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
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
        
        try {
            await connection.query("ALTER TABLE tasks ADD COLUMN ordem INT DEFAULT 0")
        } catch (e) {}

        try {
            await connection.query("ALTER TABLE tasks ADD COLUMN prioridade VARCHAR(20) DEFAULT 'media'")
        } catch (e) {}

        try {
            await connection.query("ALTER TABLE tasks ADD COLUMN prazo DATETIME DEFAULT NULL")
        } catch (e) {}
        
        console.log("Tabela 'tasks' atualizada com sucesso")
    } finally {
        connection.release()
    }
}
app.get('/tasks', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM tasks ORDER BY FIELD(prioridade, 'alta', 'media', 'baixa'), ordem ASC, created_at DESC")
        res.json(rows.map(row => ({
            id: row.id.toString(),
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
app.post('/tasks', async (req, res) => {
    const { titulo, descricao, status, prioridade, prazo } = req.body
    
    try {
        const [maxOrdem] = await pool.query("SELECT MAX(ordem) as max FROM tasks")
        const novaOrdem = (maxOrdem[0].max || 0) + 1
        
        const [result] = await pool.query(
            "INSERT INTO tasks (titulo, descricao, status, done, ordem, prioridade, prazo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [titulo, descricao || "", status || "pendente", status === "concluida" ? 1 : 0, novaOrdem, prioridade || "media", prazo || null]
        )
        
        const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [result.insertId])
        const row = rows[0]
        
        res.status(201).json({
            id: row.id.toString(),
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
app.put('/tasks/:id', async (req, res) => {
    const { status, ordem, acao, prioridade, prazo } = req.body
    const id = req.params.id
    
    try {
        if (acao === 'mover_cima') {
            const [tasks] = await pool.query("SELECT * FROM tasks ORDER BY FIELD(prioridade, 'alta', 'media', 'baixa'), ordem ASC")
            const currentIndex = tasks.findIndex(t => t.id.toString() === id)
            
            if (currentIndex > 0) {
                const currentTask = tasks[currentIndex]
                const aboveTask = tasks[currentIndex - 1]
                
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [aboveTask.ordem, currentTask.id])
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [currentTask.ordem, aboveTask.id])
            }
            
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            return res.json(rows[0] ? {
                id: rows[0].id.toString(),
                titulo: rows[0].titulo,
                descricao: rows[0].descricao,
                status: rows[0].status,
                done: rows[0].done === 1,
                ordem: rows[0].ordem,
                prioridade: rows[0].prioridade,
                prazo: rows[0].prazo,
                data_criacao: rows[0].created_at,
                data_conclusao: rows[0].data_conclusao
            } : {})
        }
        
        if (acao === 'mover_baixo') {
            const [tasks] = await pool.query("SELECT * FROM tasks ORDER BY FIELD(prioridade, 'alta', 'media', 'baixa'), ordem ASC")
            const currentIndex = tasks.findIndex(t => t.id.toString() === id)
            
            if (currentIndex < tasks.length - 1) {
                const currentTask = tasks[currentIndex]
                const belowTask = tasks[currentIndex + 1]
                
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [belowTask.ordem, currentTask.id])
                await pool.query("UPDATE tasks SET ordem = ? WHERE id = ?", [currentTask.ordem, belowTask.id])
            }
            
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            return res.json(rows[0] ? {
                id: rows[0].id.toString(),
                titulo: rows[0].titulo,
                descricao: rows[0].descricao,
                status: rows[0].status,
                done: rows[0].done === 1,
                ordem: rows[0].ordem,
                prioridade: rows[0].prioridade,
                prazo: rows[0].prazo,
                data_criacao: rows[0].created_at,
                data_conclusao: rows[0].data_conclusao
            } : {})
        }
        
        if (prioridade !== undefined || prazo !== undefined) {
            const updates = []
            const values = []
            if (prioridade !== undefined) {
                updates.push("prioridade = ?")
                values.push(prioridade)
            }
            if (prazo !== undefined) {
                updates.push("prazo = ?")
                values.push(prazo || null)
            }
            values.push(id)
            await pool.query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, values)
            
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            const row = rows[0]
            return res.json({
                id: row.id.toString(),
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
        }
        
        if (status) {
            const dataConclusao = status === "concluida" ? new Date() : null
            await pool.query(
                "UPDATE tasks SET status = ?, done = ?, data_conclusao = ? WHERE id = ?",
                [status, status === "concluida" ? 1 : 0, dataConclusao, id]
            )
            res.json({ id, status, done: status === "concluida", data_conclusao: dataConclusao })
        } else {
            const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [id])
            if (rows.length === 0) return res.status(404).send("Tarefa não encontrada")
            
            const row = rows[0]
            const newStatus = row.done ? "pendente" : "concluida"
            const newDone = row.done ? 0 : 1
            const dataConclusao = newDone ? new Date() : null
            
            await pool.query(
                "UPDATE tasks SET status = ?, done = ?, data_conclusao = ? WHERE id = ?",
                [newStatus, newDone, dataConclusao, id]
            )
            res.json({ id, status: newStatus, done: newDone === 1, data_conclusao: dataConclusao })
        }
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})
app.delete('/tasks/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM tasks WHERE id = ?", [req.params.id])
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