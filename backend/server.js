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

let cardapio = [
  { id: 1, nome: "Hambúrguer da Casa", preco: 25.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
  { id: 2, nome: "Pizza Margherita", preco: 45.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500" },
  { id: 3, nome: "Batata Frita Crocante", preco: 18.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500" }
];

let usuarios = [];
let pedidos = [];

io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  socket.emit('atualizar_cardapio', cardapio);
  socket.emit('atualizar_pedidos', pedidos);

  // Cadastro de Novo Usuário (Cliente ou Admin)
  socket.on('cadastrar_usuario', (dados, callback) => {
    const existe = usuarios.find(u => u.email === dados.email);
    if (existe) {
      callback({ sucesso: false, mensagem: 'Este e-mail já está cadastrado!' });
    } else {
      usuarios.push(dados);
      callback({ sucesso: true, mensagem: 'Cadastro realizado com sucesso!' });
    }
  });

  // Login Unificado (Cliente ou Admin via administrador@...)
  socket.on('login_usuario', (dados, callback) => {
    // Verifica se é o Admin (começa com administrador@)
    if (dados.email.startsWith('administrador@')) {
      // Aqui você define a senha padrão do admin ou valida com os cadastrados
      const adminCadastrado = usuarios.find(u => u.email === dados.email && u.senha === dados.senha);
      if (adminCadastrado || dados.senha === '123456') { // Senha mestre opcional '123456' para emergência
        callback({ sucesso: true, tipo: 'admin', usuario: { nome: 'Administrador' } });
        return;
      } else {
        callback({ sucesso: false, mensagem: 'Senha de administrador incorreta.' });
        return;
      }
    }

    // Login normal de cliente
    const user = usuarios.find(u => u.email === dados.email && u.senha === dados.senha);
    if (user) {
      callback({ sucesso: true, tipo: 'cliente', usuario: user });
    } else {
      callback({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    }
  });

  // Admin altera disponibilidade de prato
  socket.on('mudar_disponibilidade', (id) => {
    const item = cardapio.find(p => p.id === id);
    if (item) {
      item.disponivel = !item.disponivel;
      io.emit('atualizar_cardapio', cardapio);
    }
  });

  // Cliente faz um novo pedido
  socket.on('novo_pedido', (dadosPedido) => {
    const novoPedido = {
      id: Date.now(),
      cliente: dadosPedido.cliente,
      telefone: dadosPedido.telefone,
      endereco: dadosPedido.endereco,
      itens: dadosPedido.itens,
      total: dadosPedido.total,
      pagamento: dadosPedido.pagamento,
      status: 'Pendente',
      tempoPreparo: 'A definir',
      avaliacao: null,
      comentarioAvaliacao: ''
    };
    pedidos.push(novoPedido);
    io.emit('atualizar_pedidos', pedidos);
  });

  // Admin atualiza status do pedido
  socket.on('atualizar_status', ({ idPedido, status, tempoPreparo }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.status = status;
      if (tempoPreparo) pedido.tempoPreparo = tempoPreparo;
      io.emit('atualizar_pedidos', pedidos);
    }
  });

  // Cliente avalia o pedido
  socket.on('avaliar_pedido', ({ idPedido, nota, comentario }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.avaliacao = nota;
      pedido.comentarioAvaliacao = comentario;
      io.emit('atualizar_pedidos', pedidos);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
