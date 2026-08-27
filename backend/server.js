const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Simulação de banco de dados em memória para o teste inicial gratuito
let cardapio = [
  { id: 1, nome: "Hambúrguer da Casa", preco: 25.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
  { id: 2, nome: "Pizza Margherita", preco: 45.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500" }
];

let pedidos = [];

io.on('connection', (socket) => {
  console.log('Um usuário se conectou:', socket.id);

  // Envia o cardápio atual assim que alguém conecta
  socket.emit('atualizar_cardapio', cardapio);
  socket.emit('atualizar_pedidos', pedidos);

  // Administrador altera a disponibilidade de um prato
  socket.on('mudar_disponibilidade', (id) => {
    const item = cardapio.find(p => p.id === id);
    if (item) {
      item.disponivel = !item.disponivel;
      // Avisa todo mundo (clientes e admin) instantaneamente
      io.emit('atualizar_cardapio', cardapio);
    }
  });

  // Cliente faz um pedido
  socket.on('novo_pedido', (pedido) => {
    const novoPedido = { id: Date.now(), ...pedido, status: 'Pendente', tempoPreparo: 'A definir' };
    pedidos.push(novoPedido);
    io.emit('atualizar_pedidos', pedidos);
  });

  // Administrador atualiza o status do pedido (Ex: Saindo para entrega)
  socket.on('atualizar_status_pedido', ({ idPedido, status, tempo }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.status = status;
      if (tempo) pedido.tempoPreparo = tempo;
      io.emit('atualizar_pedidos', pedidos);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuário desconectado');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
