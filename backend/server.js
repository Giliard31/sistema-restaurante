const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path'); // <-- Necessário para localizar a pasta do frontend

const app = express();
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// AQUI: Configura o servidor para servir os arquivos estáticos da pasta "frontend"
// (O "../" sai da pasta 'backend' e entra na pasta 'frontend')
app.use(express.static(path.join(__dirname, '../frontend')));

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
let configuracoesLoja = { 
  taxaEntrega: 5.00, 
  chavePix: "seuemail@exemplo.com", 
  nomePix: "Delicias da Casa"
};

io.on('connection', (socket) => {
  console.log('Novo usuário conectado:', socket.id);

  // Envia os dados atuais imediatamente para quem acabou de conectar
  socket.emit('atualizar_cardapio', cardapio);
  socket.emit('atualizar_pedidos', pedidos);
  socket.emit('atualizar_config', configuracoesLoja);

  socket.on('cadastrar_usuario', (dados, callback) => {
    const existe = usuarios.find(u => u.email === dados.email);
    if (existe) {
      callback({ sucesso: false, mensagem: 'Este e-mail já está cadastrado!' });
    } else {
      usuarios.push(dados);
      callback({ sucesso: true, mensagem: 'Cadastro realizado com sucesso!' });
    }
  });

  socket.on('login_usuario', (dados, callback) => {
    if (dados.email.startsWith('administrador@')) {
      const adminCadastrado = usuarios.find(u => u.email === dados.email && u.senha === dados.senha);
      if (adminCadastrado || dados.senha === '123456') {
        callback({ sucesso: true, tipo: 'admin', usuario: { nome: 'Administrador' } });
        return;
      } else {
        callback({ sucesso: false, mensagem: 'Senha de administrador incorreta.' });
        return;
      }
    }

    const user = usuarios.find(u => u.email === dados.email && u.senha === dados.senha);
    if (user) {
      callback({ sucesso: true, tipo: 'cliente', usuario: user });
    } else {
      callback({ sucesso: false, mensagem: 'E-mail ou senha incorretos.' });
    }
  });

  socket.on('recuperar_senha', (email, callback) => {
    const user = usuarios.find(u => u.email === email);
    if (user) {
      const codigoTemp = Math.floor(1000 + Math.random() * 9000);
      user.codigoRecuperacao = codigoTemp.toString();
      callback({ sucesso: true, mensagem: `Código de recuperação gerado: ${codigoTemp}` });
    } else {
      callback({ sucesso: false, mensagem: 'E-mail não encontrado.' });
    }
  });

  socket.on('redefinir_senha', ({ email, codigo, novaSenha }, callback) => {
    const user = usuarios.find(u => u.email === email);
    if (user && user.codigoRecuperacao === codigo) {
      user.senha = novaSenha;
      user.codigoRecuperacao = null;
      callback({ sucesso: true, mensagem: 'Senha redefinida com sucesso!' });
    } else {
      callback({ sucesso: false, mensagem: 'Código inválido ou e-mail incorreto.' });
    }
  });

  socket.on('atualizar_config_loja', ({ taxaEntrega, chavePix, nomePix }) => {
    if(taxaEntrega !== undefined) configuracoesLoja.taxaEntrega = parseFloat(taxaEntrega);
    if(chavePix) configuracoesLoja.chavePix = chavePix;
    if(nomePix) configuracoesLoja.nomePix = nomePix;
    io.emit('atualizar_config', configuracoesLoja);
  });

  socket.on('adicionar_prato', (novoItem) => {
    novoItem.id = Date.now();
    novoItem.disponivel = true;
    cardapio.push(novoItem);
    io.emit('atualizar_cardapio', cardapio);
  });

  socket.on('remover_prato', (id) => {
    cardapio = cardapio.filter(p => p.id !== id);
    io.emit('atualizar_cardapio', cardapio);
  });

  socket.on('mudar_disponibilidade', (id) => {
    const item = cardapio.find(p => p.id === id);
    if (item) {
      item.disponivel = !item.disponivel;
      io.emit('atualizar_cardapio', cardapio);
    }
  });

  socket.on('novo_pedido', (dadosPedido) => {
    const novoPedido = {
      id: Date.now(),
      cliente: dadosPedido.cliente,
      telefone: dadosPedido.telefone,
      endereco: dadosPedido.endereco,
      bairro: dadosPedido.bairro,
      referencia: dadosPedido.referencia,
      itens: dadosPedido.itens,
      subtotal: dadosPedido.subtotal,
      taxaEntrega: dadosPedido.taxaEntrega,
      total: dadosPedido.total,
      pagamento: dadosPedido.pagamento,
      status: dadosPedido.pagamento && dadosPedido.pagamento.includes('Pix') ? 'Aguardando Confirmação de Pagamento' : 'Pendente',
      tempoPreparoMinutos: 0,
      tempoFimTimestamp: null,
      avaliacao: null,
      comentarioAvaliacao: ''
    };
    pedidos.push(novoPedido);
    io.emit('atualizar_pedidos', pedidos);
  });

  socket.on('atualizar_status', ({ idPedido, status, minutosPreparo }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.status = status;
      if (minutosPreparo) {
        pedido.tempoPreparoMinutos = parseInt(minutosPreparo);
        pedido.tempoFimTimestamp = Date.now() + (parseInt(minutosPreparo) * 60 * 1000);
      }
      io.emit('atualizar_pedidos', pedidos);
    }
  });

  socket.on('avaliar_pedido', ({ idPedido, nota, comentario }) => {
    const pedido = pedidos.find(p => p.id === idPedido);
    if (pedido) {
      pedido.avaliacao = nota;
      pedido.comentarioAvaliacao = comentario;
      io.emit('atualizar_pedidos', pedidos);
    }
  });
});

// Rota coringa para garantir que o index.html seja servido corretamente na raiz
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor rodando com sucesso na porta ${PORT}`);
});
