const venom = require('venom-bot');

// ===== CONFIGURAÇÕES =====
const CONFIG = {
    sessionName: 'meu-bot-whatsapp',
    headless: false, // true = sem interface gráfica, false = mostra o navegador
    logLevel: 'error', // 'error', 'warn', 'info', 'debug'
    browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-default-browser-check'
    ]
};

// ===== MENSAGENS DE RESPOSTA =====
const RESPOSTAS = {
    // Resposta padrão para qualquer mensagem
    padrao: [
        "🤖 Olá! Esta é uma resposta automática.",
        "📱 Estou temporariamente indisponível, mas sua mensagem foi recebida!",
        "⏰ Responderei assim que possível. Obrigado pela paciência!"
    ],
    
    // Respostas específicas para certas palavras-chave
    palavrasChave: {
        'oi': ["👋 Oi! Como posso ajudar?"],
        'olá': ["👋 Olá! Tudo bem?"],
        'bom dia': ["🌅 Bom dia! Tenha um ótimo dia!"],
        'boa tarde': ["🌞 Boa tarde! Como está seu dia?"],
        'boa noite': ["🌙 Boa noite! Descanse bem!"],
        'obrigado': ["😊 De nada! Sempre à disposição!"],
        'tchau': ["👋 Tchau! Até mais!"],
        'ajuda': ["🆘 Estou aqui para ajudar! Me diga o que precisa."]
    }
};

// ===== CONFIGURAÇÕES DE COMPORTAMENTO =====
const COMPORTAMENTO = {
    responderApenas: {
        grupos: false,        // true = responde em grupos, false = não responde
        contatos: true,       // true = responde contatos individuais
        numerosDesconhecidos: true // true = responde números que não estão na agenda
    },
    
    // Lista de contatos que NÃO devem receber respostas automáticas
    // Coloque o número no formato: 5511999999999@c.us
    contatosIgnorados: [
        // '5511999999999@c.us', // Exemplo
    ],
    
    // Tempo de espera entre mensagens (em milissegundos)
    delayEntreMensagens: 5000, // 2 segundos
    
    // Enviar mensagens de forma aleatória (para parecer mais humano)
    ordemAleatoria: true
};

// ===== FUNÇÕES AUXILIARES =====

// Verifica se deve responder a mensagem
function deveResponder(message) {
    // Não responde próprias mensagens
    if (message.fromMe) return false;
    
    // Não responde mensagens de sistema
    if (message.type !== 'chat') return false;
    
    // Verifica se é grupo
    if (message.isGroupMsg && !COMPORTAMENTO.responderApenas.grupos) {
        console.log('📵 Mensagem de grupo ignorada');
        return false;
    }
    
    // Verifica se é contato individual
    if (!message.isGroupMsg && !COMPORTAMENTO.responderApenas.contatos) {
        console.log('📵 Mensagem individual ignorada');
        return false;
    }
    
    // Verifica se o contato está na lista de ignorados
    if (COMPORTAMENTO.contatosIgnorados.includes(message.from)) {
        console.log('📵 Contato ignorado:', message.from);
        return false;
    }
    
    // Verifica se é número desconhecido
    if (!message.isGroupMsg && !message.sender.isMyContact && !COMPORTAMENTO.responderApenas.numerosDesconhecidos) {
        console.log('📵 Número desconhecido ignorado');
        return false;
    }
    
    return true;
}

// Escolhe qual resposta enviar baseada na mensagem recebida
function escolherResposta(mensagem) {
    const texto = mensagem.body.toLowerCase();
    
    // Verifica se contém alguma palavra-chave
    for (const [palavra, respostas] of Object.entries(RESPOSTAS.palavrasChave)) {
        if (texto.includes(palavra)) {
            return respostas;
        }
    }
    
    // Se não encontrou palavra-chave, usa resposta padrão
    return RESPOSTAS.padrao;
}

// Embaralha array (para ordem aleatória)
function embaralhar(array) {
    const novoArray = [...array];
    for (let i = novoArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [novoArray[i], novoArray[j]] = [novoArray[j], novoArray[i]];
    }
    return novoArray;
}

// Delay entre mensagens
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Envia múltiplas mensagens com delay
async function enviarMensagens(client, chatId, mensagens) {
    let mensagensParaEnviar = [...mensagens];
    
    // Embaralha se configurado para ordem aleatória
    if (COMPORTAMENTO.ordemAleatoria) {
        mensagensParaEnviar = embaralhar(mensagensParaEnviar);
    }
    
    for (let i = 0; i < mensagensParaEnviar.length; i++) {
        try {
            await client.sendText(chatId, mensagensParaEnviar[i]);
            console.log(`✅ Mensagem ${i + 1}/${mensagensParaEnviar.length} enviada`);
            
            // Delay entre mensagens (exceto na última)
            if (i < mensagensParaEnviar.length - 1) {
                await delay(COMPORTAMENTO.delayEntreMensagens);
            }
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
        }
    }
}

// ===== FUNÇÃO PRINCIPAL =====
async function iniciarBot() {
    try {
        console.log('🚀 Iniciando bot do WhatsApp...');
        
        const client = await venom.create(
            CONFIG.sessionName,
            (base64Qr, asciiQR, attempts, urlCode) => {
                console.log('📱 QR Code gerado! Escaneie com seu WhatsApp:');
                console.log(asciiQR);
            },
            (statusSession, session) => {
                console.log('📊 Status da sessão:', statusSession);
            },
            {
                headless: CONFIG.headless,
                logLevel: CONFIG.logLevel,
                browserArgs: CONFIG.browserArgs
            }
        );
        
        console.log('✅ Bot conectado com sucesso!');
        console.log('👂 Aguardando mensagens...\n');
        
        // Escuta todas as mensagens
        client.onMessage(async (message) => {
            try {
                console.log('\n📨 Nova mensagem recebida:');
                console.log(`   De: ${message.sender.pushname || message.from}`);
                console.log(`   Mensagem: ${message.body}`);
                console.log(`   Tipo: ${message.isGroupMsg ? 'Grupo' : 'Individual'}`);
                
                // Verifica se deve responder
                if (!deveResponder(message)) {
                    return;
                }
                
                console.log('🤖 Enviando resposta automática...');
                
                // Escolhe as mensagens para responder
                const mensagensResposta = escolherResposta(message);
                
                // Envia as mensagens
                await enviarMensagens(client, message.from, mensagensResposta);
                
                console.log('✅ Resposta automática enviada com sucesso!');
                
            } catch (error) {
                console.error('❌ Erro ao processar mensagem:', error);
            }
        });
        
        // Mantém o bot rodando
        console.log('🔄 Bot ativo! Pressione Ctrl+C para parar.');
        
    } catch (error) {
        console.error('❌ Erro ao iniciar o bot:', error);
        process.exit(1);
    }
}

// ===== TRATAMENTO DE ERROS E SINAIS =====
process.on('SIGINT', () => {
    console.log('\n👋 Encerrando bot...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Erro não tratado:', reason);
});

// ===== INICIAR O BOT =====
iniciarBot();