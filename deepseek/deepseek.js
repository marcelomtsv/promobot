import fetch from 'node-fetch';
import http from 'http';
import https from 'https';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODELS_URL = 'https://api.deepseek.com/models';

// Agent HTTP/HTTPS otimizado para connection pooling (reutiliza conexões)
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 256, // Múltiplas conexões simultâneas
  maxFreeSockets: 256,
  timeout: 30000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 256,
  maxFreeSockets: 256,
  timeout: 30000
});

// Função fetch otimizada com connection pooling
const optimizedFetch = (url, options = {}) => {
  const isHttps = url.startsWith('https://');
  const agent = isHttps ? httpsAgent : httpAgent;
  
  return fetch(url, {
    ...options,
    agent,
    headers: {
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br',
      ...options.headers
    }
  });
};

export async function validateApiKey(apiKey) {
    try {
        const response = await optimizedFetch(MODELS_URL, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 segundos para validação
        });
        return response.ok;
    } catch {
        return false;
    }
}

function cleanResponseText(text) {
    if (!text) return null;
    
    let cleaned = text.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.split('\n').slice(1).join('\n').trim();
    }
    if (cleaned.endsWith('```')) {
        cleaned = cleaned.replace(/```$/g, '').trim();
    }
    return cleaned;
}

export async function processText(messages, apiKey, temperature = 0.3) {
    const response = await optimizedFetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages,
            temperature
        }),
        timeout: 60000 // 60 segundos para processamento de IA
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText.substring(0, 120)}`);
    }
    
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const cleanedContent = cleanResponseText(content);
    
    try {
        return JSON.parse(cleanedContent);
    } catch {
        return { raw_response: cleanedContent };
    }
}

