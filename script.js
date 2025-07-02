document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURAÇÕES DO EVENTO ---
    const MAX_LAPS = 3;
    const LAP_DISTANCE = 1000; // Distância/pontos para completar uma volta
    const SCOREBOARD_SIZE = 8;

    // --- ELEMENTOS DO DOM ---
    const player1NameInput = document.getElementById('player1-name-input');
    const player2NameInput = document.getElementById('player2-name-input');
    const player1ConcentrationEl = document.getElementById('player1-concentration');
    const player2ConcentrationEl = document.getElementById('player2-concentration');
    const player1LapsEl = document.getElementById('player1-laps');
    const player2LapsEl = document.getElementById('player2-laps');
    const leaderboardBodyEl = document.getElementById('leaderboard-body');
    const startBtn = document.getElementById('start-btn');
    const finishBtn = document.getElementById('finish-btn');
    const restartBtn = document.getElementById('restart-btn'); // Será nosso "Limpar Placar"

    // --- ESTADO DO JOGO ---
    let scoreboardData = []; // Array para armazenar TODOS os resultados {name, time}
    let currentHeatPlayers = []; // Array para os 2 jogadores da bateria ATUAL
    let raceIsRunning = false;
    let animationFrameId = null;

    // --- LÓGICA DA CORRIDA (GAME LOOP) ---
    let lastTimestamp = 0;
    function gameLoop(timestamp) {
        if (!raceIsRunning) return;

        if (!lastTimestamp) lastTimestamp = timestamp;
        const deltaTime = (timestamp - lastTimestamp) / 1000; // Tempo em segundos
        lastTimestamp = timestamp;

        currentHeatPlayers.forEach(player => {
            if (player.laps < MAX_LAPS) {
                player.time += deltaTime;
                const speed = player.concentration * 2;
                player.progress += speed * deltaTime;

                if (player.progress >= LAP_DISTANCE) {
                    player.laps++;
                    player.progress = 0;
                }
            }
        });

        updateUI();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- FUNÇÃO PRINCIPAL DE ATUALIZAÇÃO DA INTERFACE ---
    function updateUI() {
        // Atualiza os painéis da bateria atual (se houver jogadores)
        const [player1, player2] = currentHeatPlayers;
        if (player1) {
            player1ConcentrationEl.textContent = `${player1.concentration}%`;
            player1LapsEl.textContent = `${player1.laps}/${MAX_LAPS}`;
        }
        if (player2) {
            player2ConcentrationEl.textContent = `${player2.concentration}%`;
            player2LapsEl.textContent = `${player2.laps}/${MAX_LAPS}`;
        }

        // Atualiza o placar geral (leaderboard)
        leaderboardBodyEl.innerHTML = '';
        const topPlayers = scoreboardData
            .sort((a, b) => a.time - b.time) // Ordena por menor tempo
            .slice(0, SCOREBOARD_SIZE); // Pega apenas os 8 melhores

        topPlayers.forEach((player, index) => {
            const pos = index + 1;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${pos}</td>
                <td>${player.name}</td>
                <td>${player.time.toFixed(1)} s</td>
            `;
            leaderboardBodyEl.appendChild(row);
        });
    }

    // --- CONTROLES DO EVENTO ---

    function startHeat() {
        if (raceIsRunning) return;
        const p1Name = player1NameInput.value.toUpperCase();
        const p2Name = player2NameInput.value.toUpperCase();

        if (!p1Name || !p2Name) {
            alert("Por favor, insira o nome dos dois jogadores.");
            return;
        }

        // Cria os jogadores para a bateria atual
        currentHeatPlayers = [
            { id: 1, name: p1Name, concentration: 0, laps: 0, time: 0, progress: 0 },
            { id: 2, name: p2Name, concentration: 0, laps: 0, time: 0, progress: 0 }
        ];

        raceIsRunning = true;
        lastTimestamp = 0;
        player1NameInput.disabled = true;
        player2NameInput.disabled = true;
        
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function finishHeat() {
        if (!raceIsRunning) return;
        raceIsRunning = false;
        cancelAnimationFrame(animationFrameId);

        // Adiciona os resultados da bateria ao placar geral
        currentHeatPlayers.forEach(player => {
            // Adiciona ao placar apenas se o jogador completou pelo menos uma volta
            if (player.laps > 0) {
                 scoreboardData.push({
                    name: player.name,
                    time: player.time
                });
            }
        });

        // Atualiza a UI para mostrar o placar final
        updateUI();

        // Prepara a interface para a próxima bateria
        resetForNextHeat();
    }

    function resetForNextHeat() {
        currentHeatPlayers = []; // Limpa os jogadores da bateria
        player1NameInput.value = '';
        player2NameInput.value = '';
        player1NameInput.disabled = false;
        player2NameInput.disabled = false;
        
        // Zera os displays da bateria atual
        player1ConcentrationEl.textContent = '0%';
        player1LapsEl.textContent = `0/${MAX_LAPS}`;
        player2ConcentrationEl.textContent = '0%';
        player2LapsEl.textContent = `0/${MAX_LAPS}`;
    }

    function clearScoreboard() {
        if (confirm("Você tem certeza que deseja limpar todo o placar e reiniciar o evento?")) {
            raceIsRunning = false;
            cancelAnimationFrame(animationFrameId);
            scoreboardData = [];
            resetForNextHeat();
            updateUI(); // Limpa a tabela na tela
        }
    }
    
    startBtn.addEventListener('click', startHeat);
    finishBtn.addEventListener('click', finishHeat);
    restartBtn.addEventListener('click', clearScoreboard); // RESTART agora limpa tudo

    // --- CONEXÃO WEBSOCKET ---
    const socket = new WebSocket('ws://localhost:8080');

    socket.onopen = () => console.log('Conectado ao servidor de dados.');
    socket.onclose = () => console.log('Desconectado do servidor de dados.');

    socket.onmessage = (event) => {
        if (currentHeatPlayers.length === 0) return; // Ignora se não houver bateria ativa

        const data = JSON.parse(event.data);
        if (data.player1) {
            currentHeatPlayers[0].concentration = data.player1.concentration;
        }
        // Simulação para o jogador 2, já que temos um headset
        currentHeatPlayers[1].concentration = Math.floor(Math.random() * 71) + 20;

        // Atualiza a UI para mostrar a concentração mesmo se a corrida não começou
        if (!raceIsRunning) {
            updateUI();
        }
    };
    
    // Inicia a UI com o placar vazio
    updateUI();
});