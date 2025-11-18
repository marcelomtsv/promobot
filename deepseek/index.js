import express from 'express';
import { validateApiKey, processText } from './deepseek.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
    res.json({ 
        success: true, 
        message: 'DeepSeek API está rodando',
        endpoints: {
            'POST /check': 'Verifica se a API key é válida',
            'POST /chat': 'Processa mensagens com DeepSeek'
        }
    });
});

app.post('/check', async (req, res) => {
    try {
        const { api_key } = req.body;
        if (!api_key) {
            return res.status(400).json({ success: false, error: 'api_key é obrigatório' });
        }
        
        const isValid = await validateApiKey(api_key);
        res.json({ success: isValid, valid: isValid });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/chat', async (req, res) => {
    try {
        const { api_key, messages, temperature } = req.body;
        
        if (!api_key) {
            return res.status(400).json({ success: false, error: 'api_key é obrigatório' });
        }
        
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ success: false, error: 'messages deve ser um array não vazio' });
        }
        
        if (!messages.every(msg => msg.role && msg.content)) {
            return res.status(400).json({ success: false, error: 'Cada mensagem deve ter "role" e "content"' });
        }
        
        const result = await processText(messages, api_key, temperature || 0.3);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DeepSeek API rodando na porta ${PORT}`);
});
