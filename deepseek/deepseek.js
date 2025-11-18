import fetch from 'node-fetch';

const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODELS_URL = 'https://api.deepseek.com/models';

export async function validateApiKey(apiKey) {
    try {
        const response = await fetch(MODELS_URL, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
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
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages,
            temperature
        })
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

