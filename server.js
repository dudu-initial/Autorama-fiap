// server.js

// Importa as bibliotecas necessárias
const WebSocket = require('ws');
const NeuroSky = require('node-neurosky');

// Cria o servidor WebSocket na porta 8080
const wss = new WebSocket.Server({ port: 8080 });
console.log('Servidor WebSocket iniciado na porta 8080. Aguardando conexões...');

// Cria o cliente para se conectar ao NeuroSky
// Certifique-se de que o software do seu NeuroSky (ThinkGear Connector) está rodando.
// CÓDIGO NOVO E CORRIGIDO
const neuroskyClient = NeuroSky.createClient({
    appName: 'NodeNeuroSky',
    appKey: '0fc4141b4b45c675cc8d3a765b8d71c5bde9390'
});

// Objeto para guardar os dados mais recentes dos jogadores
let playersData = {
    player1: { concentration: 0 },
    player2: { concentration: 0 }
    // Adicione mais dados conforme necessário (ex: dados da corrida)
};

// Função para transmitir os dados para todos os clientes conectados
function broadcastData() {
    const dataString = JSON.stringify(playersData);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(dataString);
        }
    });
}

// Evento que é disparado quando o front-end (navegador) se conecta
wss.on('connection', ws => {
    console.log('Cliente conectado!');
    // Envia os dados atuais assim que o cliente se conectar
    ws.send(JSON.stringify(playersData));

    // Evento que é disparado quando o servidor recebe uma mensagem do cliente
    ws.on('message', message => {
        console.log(`Mensagem recebida: ${message}`);
        // Aqui você pode adicionar lógica para START, FINISH, RESTART
        // Ex: if (message === 'start') { ...iniciar a lógica da corrida... }
    });

    ws.on('close', () => {
        console.log('Cliente desconectado.');
    });
});

// ===================================================================
// AQUI ESTÁ A MÁGICA: OUVINDO OS DADOS DO NEUROSKY
// ===================================================================

// Este evento é chamado sempre que o NeuroSky envia um novo pacote de dados
neuroskyClient.on('data', data => {
    // Vamos assumir que o PLAYER 1 está usando o headset
    // O valor de 'eSense' (attention/concentration) vai de 0 a 100
    if (data.eSense) {
        console.log(`Nível de concentração recebido: ${data.eSense.attention}`);
        
        // Atualiza o valor do jogador 1
        playersData.player1.concentration = data.eSense.attention;
        
        // (Simulação para o jogador 2, já que temos apenas um headset)
        // Em um cenário real, você teria duas conexões ou uma forma de diferenciar os jogadores
        playersData.player2.concentration = Math.floor(Math.random() * 81) + 10; // Simulação para P2

        // Envia os dados atualizados para o front-end
        broadcastData();
    }
});

// Tenta se conectar ao NeuroSky
console.log('Tentando conectar ao NeuroSky...');
neuroskyClient.connect();