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

// Banco de dados em memória para o teste gratuito
let cardapio = [
  { id: 1, nome: "Hambúrguer da Casa", preco: 25.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500" },
  { id: 2, nome: "Pizza Margherita", preco: 45.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=500" },
  { id: 3, nome: "Batata Frita Crocante", preco: 18.00, disponivel: true, imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500" }
];

let usuarios = []; // Guarda os cadastros
let pedidos = [];

io.on('connection', (socket) => {
  console.log('Usuário conectado:', socket.id);

  // Envia estado inicial
  socket.emit('atualizar_cardapio', cardapio);
  socket.emit('atualizar_pedidos', pedidos);

  // Cadastro de Novo Cliente
  socket.on('cadastrar_usuario', (dados, callback) => {
    const existe = usuarios.find(u => u.email === dados.email);
    if (existe) {
      callback({ sucesso: false, mensagem: 'Este e-mail já está cadastrado!' });
    } else {
      usuarios.push(dados);
      callback({ sucesso: true, mensagem: 'Cadastro realizado com sucesso!' });
    }
  });

  // Login de Cliente
  socket.on('login_usuario', (dados, callback) => {
    const user = usuarios.find(u => u.email === dados.email && u.senha === dados.senha);
    if (user) {
      callback({ sucesso: true, usuario: user });
    } else {
      callback({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    }
  });

  // Login de Administrador
  socket.on('login_admin', (dados, callback) => {
    // Senha padrão de admin para teste: admin / 123456
    if (dados.usuario === 'admin' && dados.senha === '123456') {
      callback({ sucesso: true });
    } else {
      callback({ sucesso: false, mensagem: 'Credenciais de administrador inválidas.' });
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

  // Cliente faz um novo pedido com carrinho e forma de pagamento
  socket.on('novo_pedido', (dadosPedido) => {
    const novoPedido = {
      id: Date.now(),
      cliente: dadosPedido.cliente,
      telefone: dadosPedido.telefone,
      endereco: dadosPedido.endereco,
      itens: dadosPedido.itens,
      total: dadosPedido.total,
      pagamento: dadosPedido.pagamento, // Ex: "Pix" ou "Dinheiro (Troco para R$ 50)"
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
});      item.disponivel = !item.disponivel;
      io.emit('atualizar_cardapio', cardapio);
    }
  });

  // Cliente faz um novo pedido
  socket.on('novo_pedido', (dadosPedido) => {
    const novoPedido = {
      id: Date.now(),
      cliente: dadosPedido.cliente || 'Cliente',
      itens: dadosPedido.itens,
      total: dadosPedido.total,
      status: 'Pendente', // Pendente -> Preparando -> Saiu para Entrega -> Concluído
      tempoPreparo: 'A definir',
      avaliacao: null,
      comentarioAvaliacao: ''
    };
    pedidos.push(novoPedido);
    io.emit('atualizar_pedidos', pedidos);
  });

  // Admin atualiza o status do pedido e o tempo de preparo
  socket.on('atualizar_status', ({ idPedido, status, tempoPreparo }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.status = status;
      if (tempoPreparo) pedido.tempoPreparo = tempoPreparo;
      io.emit('atualizar_pedidos', pedidos);
    }
  });

  // Cliente envia avaliação ao concluir
  socket.on('avaliar_pedido', ({ idPedido, nota, comentario }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.avaliacao = nota;
      pedido.comentarioAvaliacao = comentario;
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
