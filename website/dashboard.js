// Dashboard JavaScript - PromoBOT

// Integrações destacadas (não são plataformas de e-commerce)
const integrations = [
  { id: 'telegram', name: 'Telegram', status: 'active', icon: 'fab fa-telegram', color: '#0088cc', isIntegration: true },
  { id: 'whatsapp', name: 'WhatsApp', status: 'active', icon: 'fab fa-whatsapp', color: '#25d366', isIntegration: true },
  { id: 'deepseek', name: 'DeepSeek', status: 'active', icon: 'fas fa-brain', color: '#6366f1', isIntegration: true },
  { id: 'botfather', name: 'Bot Father', status: 'active', icon: 'fas fa-robot', color: '#0088cc', isIntegration: true }
];

// Plataformas de e-commerce
const platforms = [
  { id: 'aliexpress', name: 'AliExpress', status: 'active', icon: 'fas fa-shopping-bag', favicon: 'https://www.google.com/s2/favicons?domain=aliexpress.com&sz=32' },
  { id: 'americanas', name: 'Americanas', status: 'soon', icon: 'fas fa-store', favicon: 'https://www.google.com/s2/favicons?domain=americanas.com.br&sz=32' },
  { id: 'amazon', name: 'Amazon', status: 'active', icon: 'fab fa-amazon', favicon: 'https://www.google.com/s2/favicons?domain=amazon.com.br&sz=32' },
  { id: 'kabum', name: 'Kabum', status: 'active', icon: 'fas fa-laptop', favicon: 'https://www.google.com/s2/favicons?domain=kabum.com.br&sz=32' },
  { id: 'magazineluiza', name: 'Magazine Luiza', status: 'active', icon: 'fas fa-shopping-cart', favicon: 'https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=32' },
  { id: 'mercadolivre', name: 'Mercado Livre', status: 'active', icon: 'fas fa-truck', favicon: 'https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=32' },
  { id: 'netshoes', name: 'Netshoes', status: 'soon', icon: 'fas fa-running', favicon: 'https://www.google.com/s2/favicons?domain=netshoes.com.br&sz=32' },
  { id: 'shopee', name: 'Shopee', status: 'active', icon: 'fas fa-box', favicon: 'https://www.google.com/s2/favicons?domain=shopee.com.br&sz=32' },
  { id: 'submarino', name: 'Submarino', status: 'soon', icon: 'fas fa-ship', favicon: 'https://www.google.com/s2/favicons?domain=submarino.com.br&sz=32' }
];

// Dados do usuário
let currentUser = null;

// Variáveis de monitoramento
let monitoringInterval = null;
let isMonitoring = false;
let autoScrollEnabled = true;

// WebSocket para mensagens do Telegram
let telegramWebSocket = null;
let telegramSessions = [];

// ===== CONFIGURAÇÃO DA API EXISTENTE =====
// URL da API do Telegram
const TELEGRAM_API_URL = localStorage.getItem('telegramApiUrl') || 'https://promobot-telegram.meoy4a.easypanel.host';
const TELEGRAM_WS_URL = localStorage.getItem('telegramWsUrl') || 'wss://promobot-telegram.meoy4a.easypanel.host';

// URL da API do DeepSeek
const DEEPSEEK_API_URL = localStorage.getItem('deepseekApiUrl') || 'https://promobot-deepseek.meoy4a.easypanel.host';

// URL da API do Bot Father
const BOTFATHER_API_URL = localStorage.getItem('botfatherApiUrl') || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : 'https://promobot-botfather.meoy4a.easypanel.host');
// ==========================================

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
  // Carregar tema salvo (já aplicado no script inline, apenas atualizar ícone)
  const savedTheme = localStorage.getItem('theme') || 'light';
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (savedTheme === 'dark') {
      themeIcon.className = 'fas fa-sun';
    } else {
      themeIcon.className = 'fas fa-moon';
    }
  }
  
  // Carregar dados do usuário PRIMEIRO para evitar flash
  await checkAuth();
  
  // Carregar perfil imediatamente após autenticação
  if (currentUser) {
    loadUserProfile();
  }
  
  // Configurar resto
  setupEventListeners();
  loadPlatforms();
  initMonitoring();
  // Telegram desabilitado temporariamente - será configurado depois
  // initTelegramWebSocket();
  // loadTelegramSessions();
  
  // Restaurar aba ativa salva (já aplicada no script inline, apenas garantir sincronização)
  const savedPanel = localStorage.getItem('activePanel') || 'overview';
  // Verificar se já está ativa (aplicada pelo script inline)
  const activePanel = document.querySelector('.content-panel.active');
  if (!activePanel || activePanel.id !== savedPanel + 'Panel') {
    showPanel(savedPanel);
  }
});

// Verificar autenticação
async function checkAuth() {
  if (!window.firebaseAuth) {
    const userData = localStorage.getItem('userData');
    if (!userData) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = JSON.parse(userData);
    return;
  }

  return new Promise((resolve) => {
    window.firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          emailVerified: user.emailVerified,
          photoURL: user.photoURL
        };
        localStorage.setItem('userData', JSON.stringify(currentUser));
        resolve();
      } else {
        const userData = localStorage.getItem('userData');
        if (userData) {
          currentUser = JSON.parse(userData);
          resolve();
        } else {
          window.location.href = 'login.html';
        }
      }
    });
  });
}

// Configurar event listeners
function setupEventListeners() {
  // Menu navigation
  document.querySelectorAll('.menu-item[data-panel]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const panel = item.getAttribute('data-panel');
      showPanel(panel);
    });
  });

  // Profile form
  document.getElementById('profileForm').addEventListener('submit', handleProfileUpdate);
  
  // Password form
  document.getElementById('passwordForm').addEventListener('submit', handlePasswordChange);

  // Close modal on outside click
  document.getElementById('platformModal').addEventListener('click', (e) => {
    if (e.target.id === 'platformModal') {
      closeModal();
    }
  });
}

// Carregar perfil do usuário
function loadUserProfile() {
  if (!currentUser) {
    // Se não houver usuário, manter skeleton visível
    return;
  }

  const avatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');

  // Remover skeleton e mostrar dados reais com fade-in
  if (avatar) {
    // Remover skeleton
    const skeleton = avatar.querySelector('.skeleton-avatar');
    if (skeleton) {
      skeleton.remove();
    }
    
    // Configurar avatar
    if (currentUser.photoURL) {
      avatar.style.backgroundImage = `url(${currentUser.photoURL})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
      avatar.textContent = '';
    } else {
      const initial = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U';
      avatar.textContent = initial;
      avatar.style.backgroundImage = 'none';
    }
    
    // Fade in
    avatar.style.transition = 'opacity 0.3s ease';
    avatar.style.opacity = '1';
  }

  // Nome e email com fade-in
  if (userName) {
    // Remover skeleton
    const skeleton = userName.querySelector('.skeleton-text');
    if (skeleton) {
      skeleton.remove();
    }
    
    userName.textContent = currentUser.displayName || 'Usuário';
    userName.style.transition = 'opacity 0.3s ease';
    userName.style.opacity = '1';
  }

  if (userEmail) {
    // Remover skeleton
    const skeleton = userEmail.querySelector('.skeleton-text');
    if (skeleton) {
      skeleton.remove();
    }
    
    userEmail.textContent = currentUser.email || 'usuario@email.com';
    userEmail.style.transition = 'opacity 0.3s ease';
    userEmail.style.opacity = '1';
  }

  // Formulário (sem fade, já que está em outra seção)
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  
  if (profileName) {
    profileName.value = currentUser.displayName || '';
  }
  
  if (profileEmail) {
    profileEmail.value = currentUser.email || '';
  }

  // Animar contadores
  setTimeout(() => {
    animateCounter('creditsBalance', 100);
    animateCounter('promotionsSent', 47);
    animateCounter('moneySaved', 1250, 'R$ ');
    animateCounter('successRate', 94, '', '%');
  }, 500);
}

// Animar contadores
function animateCounter(elementId, target, prefix = '', suffix = '') {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  let current = 0;
  const increment = target / 50;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = prefix + target + suffix;
      clearInterval(timer);
    } else {
      if (prefix === 'R$ ') {
        element.textContent = prefix + Math.floor(current).toLocaleString('pt-BR') + suffix;
      } else {
        element.textContent = prefix + Math.floor(current) + suffix;
      }
    }
  }, 30);
}

// Carregar plataformas e integrações
function loadPlatforms() {
  const platformsList = document.getElementById('platformsList');
  const integrationsList = document.getElementById('integrationsList');
  const activePreview = document.getElementById('activePlatformsPreview');
  
  // Limpar
  if (platformsList) platformsList.innerHTML = '';
  if (integrationsList) integrationsList.innerHTML = '';
  if (activePreview) activePreview.innerHTML = '';

  // Carregar integrações destacadas
  if (integrationsList) {
    integrations.forEach(integration => {
      const card = createIntegrationCard(integration);
      integrationsList.appendChild(card);
    });
  }

  // Carregar plataformas de e-commerce
  if (platformsList) {
    platforms.forEach(platform => {
      const card = createPlatformCard(platform);
      platformsList.appendChild(card);
    });
  }

  // Preview de plataformas ativas (apenas e-commerce)
  if (activePreview) {
    platforms.forEach(platform => {
      if (platform.status === 'active') {
        const previewCard = createPlatformCard(platform);
        activePreview.appendChild(previewCard);
      }
    });
  }
}

// Criar card de integração destacada
function createIntegrationCard(integration) {
  const card = document.createElement('div');
  card.className = 'platform-card integration-card';
  
  // Verificar se está configurado
  const notificationConfigs = JSON.parse(localStorage.getItem('notificationConfigs') || '{}');
  let statusText = 'Não configurado';
  let statusClass = 'soon';
  
  if (integration.id === 'telegram') {
    // Verificar se há contas do Telegram configuradas
    if (telegramSessions && telegramSessions.length > 0) {
      const activeSessions = telegramSessions.filter(s => s.status === 'connected');
      statusText = `${activeSessions.length} conta(s) ativa(s)`;
      statusClass = 'active';
    } else {
      statusText = 'Não configurado';
      statusClass = 'soon';
    }
  } else if (integration.id === 'whatsapp' && notificationConfigs.whatsapp) {
    statusText = 'Configurado';
    statusClass = 'active';
  } else if (integration.id === 'deepseek') {
    // Verificar configuração do DeepSeek
    const integrationConfigs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
    const deepseekConfig = integrationConfigs.deepseek || {};
    
    if (deepseekConfig.apiKey && deepseekConfig.verified) {
      statusText = 'Configurado e Verificado';
      statusClass = 'active';
    } else if (deepseekConfig.apiKey) {
      statusText = 'Configurado (não verificado)';
      statusClass = 'soon';
    } else {
      statusText = 'Não configurado';
      statusClass = 'soon';
    }
  } else if (integration.id === 'botfather') {
    statusText = 'Ativo';
    statusClass = 'active';
  }
  
  const descriptions = {
    'telegram': 'Gerencie suas contas do Telegram e receba mensagens em tempo real',
    'whatsapp': 'Configure o WhatsApp para receber notificações',
    'deepseek': 'IA para análise inteligente de promoções',
    'botfather': 'Crie e gerencie bots do Telegram'
  };
  
  card.innerHTML = `
    <div class="platform-header">
      <div class="platform-name">
        <i class="${integration.icon}" style="color: ${integration.color};"></i>
        <span>${integration.name}</span>
      </div>
      <span class="platform-status ${statusClass}">${statusText}</span>
    </div>
    <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1rem;">
      ${descriptions[integration.id] || 'Integração disponível'}
    </p>
    <div class="platform-actions">
      <button class="btn-sm btn-primary" onclick="openPlatformConfig('${integration.id}')">
        <i class="fas fa-cog"></i>
        ${integration.id === 'telegram' ? 'Gerenciar Contas' : 'Configurar'}
      </button>
    </div>
  `;
  
  return card;
}

// Criar card de plataforma
function createPlatformCard(platform) {
  const card = document.createElement('div');
  card.className = 'platform-card';
  
  const statusClass = platform.status === 'active' ? 'active' : 'soon';
  const statusText = platform.status === 'active' ? 'Ativo' : 'Em Breve';
  
  // Usar favicon se disponível, senão usar ícone FontAwesome
  const iconHTML = platform.favicon 
    ? `<img src="${platform.favicon}" alt="${platform.name}" class="platform-favicon" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';">
       <i class="${platform.icon}" style="display: none;"></i>`
    : `<i class="${platform.icon}"></i>`;
  
  card.innerHTML = `
    <div class="platform-header">
      <div class="platform-name">
        ${iconHTML}
        <span>${platform.name}</span>
      </div>
      <span class="platform-status ${statusClass}">${statusText}</span>
    </div>
    <div class="platform-actions">
      ${platform.status === 'active' ? `
        <button class="btn-sm btn-primary" onclick="openPlatformConfig('${platform.id}')">
          <i class="fas fa-cog"></i>
          Configurar
        </button>
      ` : `
        <button class="btn-sm btn-outline" disabled>
          <i class="fas fa-clock"></i>
          Em Breve
        </button>
      `}
    </div>
  `;
  
  return card;
}

// Mostrar painel
function showPanel(panelId) {
  // Mapear 'platforms' para 'tools' para compatibilidade
  if (panelId === 'platforms') {
    panelId = 'tools';
  }
  
  // Esconder todos os painéis
  document.querySelectorAll('.content-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Mostrar o painel selecionado
  const panel = document.getElementById(panelId + 'Panel');
  if (panel) {
    panel.classList.add('active');
  }
  
  // Atualizar menu ativo - garantir que o item correto fique destacado
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
    const itemPanel = item.getAttribute('data-panel');
    if (itemPanel === panelId) {
      item.classList.add('active');
    }
  });
  
  // Salvar aba ativa no localStorage
  localStorage.setItem('activePanel', panelId);
  
  // Fechar sidebar no mobile após seleção
  if (window.innerWidth <= 768) {
    document.querySelector('.sidebar')?.classList.remove('active');
  }
}

// Abrir modal de configuração
function openPlatformConfig(platformId) {
  const modal = document.getElementById('platformModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  // Verificar se é integração
  const integration = integrations.find(i => i.id === platformId);
  if (integration) {
    if (platformId === 'telegram' || platformId === 'whatsapp') {
      modalTitle.textContent = `Configurar ${integration.name}`;
      modalBody.innerHTML = getNotificationConfigHTML(platformId);
      modal.classList.add('active');
      
      setTimeout(() => {
        loadTelegramAccountsList();
        const form = document.getElementById('addTelegramAccountFormElement');
        if (form) {
          // Remover listeners antigos se existirem
          const newForm = form.cloneNode(true);
          form.parentNode.replaceChild(newForm, form);
          
          // Adicionar novo listener
          document.getElementById('addTelegramAccountFormElement').addEventListener('submit', (e) => {
            e.preventDefault();
            handleAddTelegramAccount(e);
          });
        }
      }, 100);
      return;
    } else if (platformId === 'deepseek') {
      modalTitle.textContent = `Configurar ${integration.name}`;
      modalBody.innerHTML = getDeepSeekConfigHTML();
      modal.classList.add('active');
      
      // Não precisa mais de configuração adicional, o HTML já gerencia tudo
      return;
    } else if (platformId === 'botfather') {
      modalTitle.textContent = `Configurar ${integration.name}`;
      modalBody.innerHTML = getBotFatherConfigHTML();
      modal.classList.add('active');
      return;
    }
  }
  
  // Verificar se é plataforma de e-commerce
  const platform = platforms.find(p => p.id === platformId);
  if (platform) {
    modalTitle.textContent = `Configurar ${platform.name}`;
    modalBody.innerHTML = getPlatformConfigHTML(platform);
    modal.classList.add('active');
    
    setTimeout(() => {
      const form = document.getElementById('platformConfigForm');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          handlePlatformConfig(platformId, e);
        });
      }
    }, 100);
  }
}

// HTML de configuração de plataforma
function getPlatformConfigHTML(platform) {
  return `
    <form id="platformConfigForm">
      <div class="form-group">
        <label style="color: var(--text-dark);">Ativar Monitoramento</label>
        <select id="platformEnabled" style="background: var(--bg-white); color: var(--text-dark); border: 1px solid var(--border-color);">
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </div>
      <div class="form-group">
        <label style="color: var(--text-dark);">Intervalo de Verificação (minutos)</label>
        <input type="number" id="checkInterval" value="15" min="5" max="60" style="background: var(--bg-white); color: var(--text-dark); border: 1px solid var(--border-color);">
      </div>
      <div class="form-group">
        <label style="color: var(--text-dark);">Desconto Mínimo (%)</label>
        <input type="number" id="minDiscount" value="10" min="0" max="100" style="background: var(--bg-white); color: var(--text-dark); border: 1px solid var(--border-color);">
      </div>
      <div class="form-group">
        <label style="color: var(--text-dark);">Palavras-chave (separadas por vírgula)</label>
        <textarea id="keywords" placeholder="exemplo: notebook, smartphone, fone" style="background: var(--bg-white); color: var(--text-dark); border: 1px solid var(--border-color);"></textarea>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar Configuração</button>
      </div>
    </form>
  `;
}

// HTML de configuração do DeepSeek
function getDeepSeekConfigHTML() {
  const savedConfig = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  const deepseekConfig = savedConfig.deepseek || {};
  const hasApiKey = deepseekConfig.apiKey && deepseekConfig.verified;
  const isEnabled = deepseekConfig.enabled !== false;
  
  return `
    <div id="deepseekConfigContainer">
      ${hasApiKey && isEnabled ? `
        <!-- Status: Configurado e Ativo -->
        <div style="text-align: center; padding: 2rem 1rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">DeepSeek Configurado</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">Sua API Key está ativa e funcionando</p>
          
          <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: var(--text-light); font-size: 0.85rem;">Status:</span>
              <span class="platform-status active" style="display: inline-block; padding: 4px 12px; font-size: 0.75rem;">Ativo</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-light); font-size: 0.85rem;">API Key:</span>
              <code style="background: var(--bg-white); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--text-dark);">
                ${deepseekConfig.apiKey.substring(0, 8)}...${deepseekConfig.apiKey.substring(deepseekConfig.apiKey.length - 4)}
              </code>
            </div>
          </div>
          
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-outline" onclick="removeDeepSeekApiKey()" style="flex: 1;">
              <i class="fas fa-trash"></i> Remover
            </button>
            <button type="button" class="btn btn-primary" onclick="showDeepSeekApiKeyInput()" style="flex: 1;">
              <i class="fas fa-edit"></i> Trocar API Key
            </button>
          </div>
        </div>
      ` : `
        <!-- Formulário: Adicionar API Key -->
        <form id="deepseekConfigForm">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="width: 60px; height: 60px; margin: 0 auto 1rem; background: linear-gradient(135deg, var(--accent-color) 0%, #0052cc 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-key" style="font-size: 1.5rem; color: white;"></i>
            </div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">Configurar DeepSeek</h3>
            <p style="color: var(--text-light); margin: 0; font-size: 0.9rem;">Insira sua API Key do DeepSeek para ativar a análise inteligente</p>
          </div>
          
          <div class="form-group">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">API Key do DeepSeek</label>
            <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
              <input 
                type="password" 
                id="deepseekApiKey" 
                value="${deepseekConfig.apiKey || ''}" 
                placeholder="sk-..." 
                style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
                autocomplete="off"
              >
              <button 
                type="button" 
                class="btn btn-outline" 
                onclick="toggleApiKeyVisibility()" 
                style="white-space: nowrap; padding: 0.75rem 1rem;"
                title="Mostrar/Ocultar"
              >
                <i class="fas fa-eye" id="apiKeyToggleIcon"></i>
              </button>
            </div>
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Obtenha sua API Key em <a href="https://platform.deepseek.com" target="_blank" style="color: var(--accent-color);">platform.deepseek.com</a>
            </small>
          </div>
          
          <!-- Loading Screen -->
          <div id="deepseekLoadingScreen" style="display: none; text-align: center; padding: 3rem 1rem;">
            <div style="width: 100px; height: 100px; margin: 0 auto 2rem; position: relative;">
              <!-- Spinner externo -->
              <div style="width: 100px; height: 100px; border: 4px solid var(--bg-light); border-top: 4px solid var(--accent-color); border-right: 4px solid var(--accent-color); border-radius: 50%; animation: spin 1s linear infinite; position: absolute; top: 0; left: 0;"></div>
              <!-- Spinner interno -->
              <div style="width: 70px; height: 70px; border: 3px solid transparent; border-top: 3px solid var(--primary-color); border-radius: 50%; animation: spinReverse 0.8s linear infinite; position: absolute; top: 15px; left: 15px;"></div>
              <!-- Ícone central -->
              <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: pulse 2s ease-in-out infinite;">
                <i class="fas fa-brain" style="font-size: 2.5rem; color: var(--accent-color); filter: drop-shadow(0 2px 8px rgba(0, 82, 212, 0.3));"></i>
              </div>
            </div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); animation: fadeInUp 0.5s ease; min-height: 2rem;">
              <span id="loadingStatusText">Verificando API Key</span><span id="loadingDots" style="animation: blink 1.4s infinite;">...</span>
            </h3>
            <p style="color: var(--text-light); margin: 0; font-size: 0.9rem; animation: fadeInUp 0.5s ease 0.1s both; min-height: 1.5rem;">
              <span id="loadingSubText">Conectando com o servidor</span>
            </p>
            <!-- Pontos animados -->
            <div style="display: flex; justify-content: center; gap: 6px; margin-top: 1rem; animation: fadeInUp 0.5s ease 0.2s both;">
              <div style="width: 8px; height: 8px; background: var(--accent-color); border-radius: 50%; animation: bounce 1.4s ease-in-out infinite;"></div>
              <div style="width: 8px; height: 8px; background: var(--accent-color); border-radius: 50%; animation: bounce 1.4s ease-in-out 0.2s infinite;"></div>
              <div style="width: 8px; height: 8px; background: var(--accent-color); border-radius: 50%; animation: bounce 1.4s ease-in-out 0.4s infinite;"></div>
            </div>
          </div>
          
          <!-- Status Message -->
          <div id="apiKeyStatus" style="margin-top: 1rem; display: none;"></div>
          
          <div class="form-actions" style="margin-top: 2rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="addDeepSeekApiKey()" id="addApiKeyBtn" style="flex: 1;">
              <i class="fas fa-plus"></i> Adicionar API Key
            </button>
          </div>
        </form>
      `}
    </div>
    
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes spinReverse {
        0% { transform: rotate(360deg); }
        100% { transform: rotate(0deg); }
      }
      @keyframes scaleIn {
        0% { transform: scale(0); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes pulse {
        0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
      }
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes bounce {
        0%, 80%, 100% {
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% {
          transform: scale(1.2);
          opacity: 1;
        }
      }
      @keyframes shine {
        0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
      }
      @keyframes checkMark {
        0% {
          transform: scale(0) rotate(-45deg);
          opacity: 0;
        }
        50% {
          transform: scale(1.2) rotate(10deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }
      @keyframes particle1 {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(-30px, -30px) scale(0);
          opacity: 0;
        }
      }
      @keyframes particle2 {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(30px, -20px) scale(0);
          opacity: 0;
        }
      }
      @keyframes particle3 {
        0% {
          transform: translate(0, 0) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(-20px, 30px) scale(0);
          opacity: 0;
        }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      @keyframes textFade {
        0% { opacity: 0; transform: translateY(5px); }
        50% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-5px); }
      }
    </style>
  `;
}

// HTML de configuração do Bot Father
function getBotFatherConfigHTML() {
  const savedConfig = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  const botfatherConfig = savedConfig.botfather || {};
  const hasConfig = botfatherConfig.botToken && botfatherConfig.channel && botfatherConfig.group && botfatherConfig.verified;
  const isEnabled = botfatherConfig.enabled !== false;
  
  return `
    <div id="botfatherConfigContainer">
      ${hasConfig && isEnabled ? `
        <!-- Status: Configurado e Ativo -->
        <div style="text-align: center; padding: 2rem 1rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">Bot Father Configurado</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">Sua configuração está ativa e funcionando</p>
          
          <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: var(--text-light); font-size: 0.85rem;">Status:</span>
              <span class="platform-status active" style="display: inline-block; padding: 4px 12px; font-size: 0.75rem;">Ativo</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: var(--text-light); font-size: 0.85rem;">Bot Token:</span>
              <code style="background: var(--bg-white); border: 1px solid var(--border-color); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--text-dark);">
                ${botfatherConfig.botToken.substring(0, 8)}...${botfatherConfig.botToken.substring(botfatherConfig.botToken.length - 4)}
              </code>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <span style="color: var(--text-light); font-size: 0.85rem;">Channel:</span>
              <span style="color: var(--text-dark); font-size: 0.85rem; font-weight: 500;">${botfatherConfig.channel}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-light); font-size: 0.85rem;">Group:</span>
              <span style="color: var(--text-dark); font-size: 0.85rem; font-weight: 500;">${botfatherConfig.group}</span>
            </div>
          </div>
          
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-outline" onclick="removeBotFatherConfig()" style="flex: 1;">
              <i class="fas fa-trash"></i> Remover
            </button>
            <button type="button" class="btn btn-primary" onclick="showBotFatherConfigInput()" style="flex: 1;">
              <i class="fas fa-edit"></i> Trocar Configuração
            </button>
          </div>
        </div>
      ` : `
        <!-- Formulário: Adicionar Configuração -->
        <form id="botfatherConfigForm">
          <div style="text-align: center; margin-bottom: 2rem;">
            <div style="width: 60px; height: 60px; margin: 0 auto 1rem; background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <i class="fas fa-robot" style="font-size: 1.5rem; color: white;"></i>
            </div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">Configurar Bot Father</h3>
            <p style="color: var(--text-light); margin: 0; font-size: 0.9rem;">Configure seu bot do Telegram com token, canal e grupo</p>
          </div>
          
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">Bot Token</label>
            <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
              <input 
                type="password" 
                id="botfatherBotToken" 
                value="${botfatherConfig.botToken || ''}" 
                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" 
                style="flex: 1; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
                autocomplete="off"
              >
              <button 
                type="button" 
                class="btn btn-outline" 
                onclick="toggleBotTokenVisibility()" 
                style="white-space: nowrap; padding: 0.75rem 1rem;"
                title="Mostrar/Ocultar"
              >
                <i class="fas fa-eye" id="botTokenToggleIcon"></i>
              </button>
            </div>
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Obtenha seu Bot Token em <a href="https://t.me/BotFather" target="_blank" style="color: var(--accent-color);">@BotFather</a> no Telegram
            </small>
          </div>
          
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">Channel</label>
            <input 
              type="text" 
              id="botfatherChannel" 
              value="${botfatherConfig.channel || ''}" 
              placeholder="@meucanal ou -1001234567890" 
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
              autocomplete="off"
            >
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Nome do canal (ex: @meucanal) ou ID do canal (ex: -1001234567890)
            </small>
          </div>
          
          <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">Group</label>
            <input 
              type="text" 
              id="botfatherGroup" 
              value="${botfatherConfig.group || ''}" 
              placeholder="@meugrupo ou -1001234567890" 
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
              autocomplete="off"
            >
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Nome do grupo (ex: @meugrupo) ou ID do grupo (ex: -1001234567890)
            </small>
          </div>
          
          <!-- Status Message -->
          <div id="botfatherStatus" style="margin-top: 1rem; display: none;"></div>
          
          <div class="form-actions" style="margin-top: 2rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="addBotFatherConfig()" id="addBotFatherBtn" style="flex: 1;">
              <i class="fas fa-plus"></i> Adicionar Configuração
            </button>
          </div>
        </form>
      `}
    </div>
  `;
}

// HTML de configuração de notificações
function getNotificationConfigHTML(type) {
  if (type === 'telegram') {
    return `
      <div id="telegramConfigContainer">
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 1rem; color: var(--text-dark);">Contas do Telegram</h4>
          <div id="telegramAccountsList" style="margin-bottom: 1rem;">
            <!-- Contas serão carregadas aqui -->
          </div>
        </div>
        <div id="addTelegramAccountForm" style="padding: 1rem; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="margin-bottom: 1rem; color: var(--text-dark);">Adicionar Nova Conta</h4>
          <p style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 1rem;">
            Preencha os dados abaixo para adicionar uma conta do Telegram. Você receberá um código SMS para confirmar.
          </p>
          <form id="addTelegramAccountFormElement">
            <div class="form-group">
              <label>Nome da Conta</label>
              <input type="text" id="telegramAccountName" placeholder="Ex: Minha Conta Pessoal" required>
            </div>
            <div class="form-group">
              <label>Telefone (com código do país)</label>
              <input type="text" id="telegramPhone" placeholder="+5511999999999" required>
              <small style="color: var(--text-light); font-size: 0.85rem;">
                Formato: +código do país + DDD + número (ex: +5511999999999)
              </small>
            </div>
            <div class="form-group">
              <label>API ID</label>
              <input type="text" id="telegramApiId" placeholder="12345678" required>
              <small style="color: var(--text-light); font-size: 0.85rem;">
                Obtenha em <a href="https://my.telegram.org/apps" target="_blank">my.telegram.org/apps</a>
              </small>
            </div>
            <div class="form-group">
              <label>API Hash</label>
              <input type="text" id="telegramApiHash" placeholder="abcdef1234567890abcdef1234567890" required>
              <small style="color: var(--text-light); font-size: 0.85rem;">
                Obtenha em <a href="https://my.telegram.org/apps" target="_blank">my.telegram.org/apps</a>
              </small>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary">
                <i class="fas fa-plus"></i>
                Adicionar Conta
              </button>
            </div>
          </form>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
        </div>
      </div>
    `;
  } else if (type === 'whatsapp') {
    return `
      <form id="notificationConfigForm">
        <div class="form-group">
          <label>Número do WhatsApp (com código do país)</label>
          <input type="text" id="whatsappNumber" placeholder="5511999999999">
          <small style="color: var(--text-light); font-size: 0.85rem;">
            Formato: código do país + DDD + número (ex: 5511999999999)
          </small>
        </div>
        <div class="form-group">
          <label>API Key (se usar serviço externo)</label>
          <input type="text" id="whatsappApiKey" placeholder="Opcional">
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Salvar Configuração</button>
        </div>
      </form>
    `;
  }
}

// Fechar modal
function closeModal() {
  document.getElementById('platformModal').classList.remove('active');
}

// Atualizar perfil
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const newName = document.getElementById('profileName').value.trim();
  
  if (!newName || newName.length < 2) {
    alert('Nome deve ter pelo menos 2 caracteres');
    return;
  }

  try {
    if (window.firebaseAuth && currentUser) {
      const user = window.firebaseAuth.currentUser;
      if (user) {
        await user.updateProfile({
          displayName: newName
        });
        
        currentUser.displayName = newName;
        localStorage.setItem('userData', JSON.stringify(currentUser));
        
        loadUserProfile();
        alert('Perfil atualizado com sucesso!');
      }
    } else {
      // Fallback: apenas atualizar localStorage
      currentUser.displayName = newName;
      localStorage.setItem('userData', JSON.stringify(currentUser));
      loadUserProfile();
      alert('Perfil atualizado com sucesso!');
    }
  } catch (error) {
    alert('Erro ao atualizar perfil. Tente novamente.');
  }
}

// Alterar senha
async function handlePasswordChange(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    alert('Preencha todos os campos');
    return;
  }

  if (newPassword.length < 8) {
    alert('A nova senha deve ter pelo menos 8 caracteres');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('As senhas não coincidem');
    return;
  }

  try {
    if (window.firebaseAuth) {
      const user = window.firebaseAuth.currentUser;
      if (user) {
        // Reautenticar antes de mudar senha
        // Nota: Esta funcionalidade requer Firebase Auth configurado corretamente
        // Por enquanto, vamos apenas validar e mostrar mensagem
        alert('Funcionalidade de alteração de senha requer reautenticação. Use a opção "Esqueci minha senha" na página de login.');
        return;
      }
    } else {
      alert('Firebase não configurado. Funcionalidade não disponível.');
    }
  } catch (error) {
    let errorMessage = 'Erro ao alterar senha. ';
    if (error.code === 'auth/wrong-password') {
      errorMessage += 'Senha atual incorreta.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage += 'A nova senha é muito fraca.';
    } else {
      errorMessage += 'Tente novamente.';
    }
    
    alert(errorMessage);
  }
}

// Salvar configuração de plataforma
function handlePlatformConfig(platformId, e) {
  const enabled = document.getElementById('platformEnabled').value === 'true';
  const interval = document.getElementById('checkInterval').value;
  const minDiscount = document.getElementById('minDiscount').value;
  const keywords = document.getElementById('keywords').value;

  // Salvar no localStorage (simulação)
  const configs = JSON.parse(localStorage.getItem('platformConfigs') || '{}');
  configs[platformId] = {
    enabled,
    interval: parseInt(interval),
    minDiscount: parseInt(minDiscount),
    keywords: keywords.split(',').map(k => k.trim())
  };
  localStorage.setItem('platformConfigs', JSON.stringify(configs));

  alert('Configuração salva com sucesso!');
  closeModal();
}

// Alternar visibilidade da API Key
function toggleApiKeyVisibility() {
  const input = document.getElementById('deepseekApiKey');
  const icon = document.getElementById('apiKeyToggleIcon');
  
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

// Alternar visibilidade do Bot Token
function toggleBotTokenVisibility() {
  const input = document.getElementById('botfatherBotToken');
  const icon = document.getElementById('botTokenToggleIcon');
  
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

// Adicionar API Key do DeepSeek (com loading e verificação)
async function addDeepSeekApiKey() {
  const apiKeyInput = document.getElementById('deepseekApiKey');
  const form = document.getElementById('deepseekConfigForm');
  const loadingScreen = document.getElementById('deepseekLoadingScreen');
  const statusDiv = document.getElementById('apiKeyStatus');
  const addBtn = document.getElementById('addApiKeyBtn');
  
  if (!apiKeyInput) return;
  
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira uma API Key</div>';
    statusDiv.style.display = 'block';
    return;
  }
  
  // Mostrar loading no botão e mensagem de verificação
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  }
  
  if (statusDiv) {
    statusDiv.innerHTML = '<div style="background: rgba(0, 82, 212, 0.1); border: 1px solid rgba(0, 82, 212, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> Verificando API Key...</div>';
    statusDiv.style.display = 'block';
  }
  
  try {
    // Verificar API Key
    const response = await fetch(`${DEEPSEEK_API_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey
      }),
      signal: createTimeoutSignal(20000), // 20 segundos - otimizado
      credentials: 'omit'
    });
    
    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Resposta inválida da API: ${response.status}`);
    }
    
    if (response.ok && data.success && data.valid) {
      // API Key válida - Salvar
      const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
      configs.deepseek = {
        apiKey: apiKey,
        model: 'deepseek-chat',
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString()
      };
      localStorage.setItem('integrationConfigs', JSON.stringify(configs));
      
      // Atualizar o conteúdo do modal para mostrar a tela de "configurado"
      const modalBody = document.getElementById('modalBody');
      if (modalBody) {
        modalBody.innerHTML = getDeepSeekConfigHTML();
      }
      
      // Atualizar plataformas
      loadPlatforms();
      
    } else {
      // API Key inválida
      throw new Error(data.message || 'API Key inválida ou expirada');
    }
  } catch (error) {
    // Reabilitar botão
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar API Key';
    }
    
    let errorMessage = 'API key inválida ou expirada';
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: A verificação demorou muito. Tente novamente.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Não foi possível conectar com a API. Verifique sua conexão.';
    } else if (error.message.includes('inválida') || error.message.includes('expirada') || error.message.includes('Invalid')) {
      errorMessage = 'API key inválida ou expirada';
    } else {
      errorMessage = error.message;
    }
    
    if (statusDiv) {
      statusDiv.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-times-circle"></i> ${errorMessage}</div>`;
      statusDiv.style.display = 'block';
    }
  }
}

// Remover API Key do DeepSeek
function removeDeepSeekApiKey() {
  if (!confirm('Tem certeza que deseja remover a API Key do DeepSeek? Esta ação desativará a integração.')) {
    return;
  }
  
  const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  configs.deepseek = {
    apiKey: '',
    enabled: false,
    verified: false
  };
  localStorage.setItem('integrationConfigs', JSON.stringify(configs));
  
  loadPlatforms();
  closeModal();
  
  // Mostrar mensagem de sucesso
  setTimeout(() => {
    alert('API Key removida com sucesso!');
  }, 300);
}

// Mostrar formulário para trocar API Key
function showDeepSeekApiKeyInput() {
  const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  configs.deepseek = {
    ...configs.deepseek,
    apiKey: '',
    verified: false
  };
  localStorage.setItem('integrationConfigs', JSON.stringify(configs));
  
  // Recarregar o modal
  const modal = document.getElementById('platformModal');
  const modalBody = document.getElementById('modalBody');
  if (modal && modalBody) {
    modalBody.innerHTML = getDeepSeekConfigHTML();
    
    // Reconfigurar event listeners
    setTimeout(() => {
      const form = document.getElementById('deepseekConfigForm');
      if (form) {
        // Não precisa de listener, já está usando onclick
      }
    }, 100);
  }
}

// Adicionar Configuração do Bot Father (com verificação)
async function addBotFatherConfig() {
  const botTokenInput = document.getElementById('botfatherBotToken');
  const channelInput = document.getElementById('botfatherChannel');
  const groupInput = document.getElementById('botfatherGroup');
  const statusDiv = document.getElementById('botfatherStatus');
  const addBtn = document.getElementById('addBotFatherBtn');
  
  if (!botTokenInput || !channelInput || !groupInput) return;
  
  const botToken = botTokenInput.value.trim();
  const channel = channelInput.value.trim();
  const group = groupInput.value.trim();
  
  // Validação básica
  if (!botToken) {
    if (statusDiv) {
      statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira o Bot Token</div>';
      statusDiv.style.display = 'block';
    }
    return;
  }
  
  if (!channel) {
    if (statusDiv) {
      statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira o Channel</div>';
      statusDiv.style.display = 'block';
    }
    return;
  }
  
  if (!group) {
    if (statusDiv) {
      statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira o Group</div>';
      statusDiv.style.display = 'block';
    }
    return;
  }
  
  // Mostrar loading no botão e mensagem de verificação
  if (addBtn) {
    addBtn.disabled = true;
    addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  }
  
  if (statusDiv) {
    statusDiv.innerHTML = '<div style="background: rgba(0, 82, 212, 0.1); border: 1px solid rgba(0, 82, 212, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--primary-color);"><i class="fas fa-spinner fa-spin"></i> Verificando configuração...</div>';
    statusDiv.style.display = 'block';
  }
  
  try {
    // Verificar configuração na API
    const response = await fetch(`${BOTFATHER_API_URL}/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        bot_token: botToken,
        channel: channel,
        group: group
      }),
      signal: createTimeoutSignal(20000), // 20 segundos - otimizado
      credentials: 'omit'
    });
    
    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Resposta inválida da API: ${response.status}`);
    }
    
    if (response.ok && data.success && data.valid) {
      // Configuração válida - Salvar
      const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
      configs.botfather = {
        botToken: botToken,
        channel: channel,
        group: group,
        enabled: true,
        verified: true,
        verifiedAt: new Date().toISOString()
      };
      localStorage.setItem('integrationConfigs', JSON.stringify(configs));
      
      // Atualizar o conteúdo do modal para mostrar a tela de "configurado"
      const modalBody = document.getElementById('modalBody');
      if (modalBody) {
        modalBody.innerHTML = getBotFatherConfigHTML();
      }
      
      // Atualizar plataformas
      loadPlatforms();
      
    } else {
      // Usar mensagem direta da API
      throw new Error(data.message || 'Configuração inválida');
    }
  } catch (error) {
    // Reabilitar botão
    if (addBtn) {
      addBtn.disabled = false;
      addBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Configuração';
    }
    
    let errorMessage = error.message || 'Configuração inválida';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: A verificação demorou muito. Tente novamente.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Não foi possível conectar com a API. Verifique sua conexão.';
    }
    
    // Destacar Canal/Grupo se presente
    let errorHTML = errorMessage;
    if (errorMessage.includes('Canal:') || errorMessage.includes('Grupo:')) {
      errorHTML = errorMessage
        .replace(/Canal: (.+)/g, '<strong style="color: var(--accent-color);">Canal:</strong> $1')
        .replace(/Grupo: (.+)/g, '<strong style="color: var(--accent-color);">Grupo:</strong> $1');
    }
    
    if (statusDiv) {
      statusDiv.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-times-circle"></i> ${errorHTML}</div>`;
      statusDiv.style.display = 'block';
    }
  }
}

// Remover Configuração do Bot Father
function removeBotFatherConfig() {
  if (!confirm('Tem certeza que deseja remover a configuração do Bot Father? Esta ação desativará a integração.')) {
    return;
  }
  
  const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  delete configs.botfather;
  localStorage.setItem('integrationConfigs', JSON.stringify(configs));
  
  // Atualizar modal
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    modalBody.innerHTML = getBotFatherConfigHTML();
  }
  
  // Atualizar plataformas
  loadPlatforms();
}

// Mostrar input para trocar configuração do Bot Father
function showBotFatherConfigInput() {
  const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  delete configs.botfather;
  localStorage.setItem('integrationConfigs', JSON.stringify(configs));
  
  // Atualizar modal
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    modalBody.innerHTML = getBotFatherConfigHTML();
  }
}

// Testar conexão com a API do DeepSeek
async function testDeepSeekApiConnection() {
  const statusDiv = document.getElementById('apiKeyStatus');
  const testBtn = document.getElementById('testApiBtn');
  
  // Obter URL da API
  const urlInput = document.getElementById('deepseekApiUrl');
  const apiUrl = (urlInput && urlInput.value.trim()) || DEEPSEEK_API_URL || 'https://promobot-deepseek.meoy4a.easypanel.host';
  
  if (!apiUrl || apiUrl.trim() === '') {
    statusDiv.innerHTML = '<span style="color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira a URL da API primeiro</span>';
    statusDiv.style.display = 'block';
    return;
  }
  
  // Desabilitar botão durante teste
  testBtn.disabled = true;
  testBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testando...';
  
  // Limpar status anterior
  statusDiv.style.display = 'none';
  
  try {
    // Tentar fazer requisição simples primeiro
    let response;
    try {
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: createTimeoutSignal(10000)
      });
    } catch (fetchError) {
      // Se falhar, tentar novamente
      response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: createTimeoutSignal(10000)
      });
    }
    
    if (response.ok) {
      const data = await response.json();
      statusDiv.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> API está acessível!<br><small style="color: var(--text-light);">${data.message || 'Conexão estabelecida com sucesso'}</small></span>`;
      statusDiv.style.display = 'block';
    } else {
      statusDiv.innerHTML = `<span style="color: var(--accent-color);"><i class="fas fa-exclamation-triangle"></i> API retornou status ${response.status}<br><small style="color: var(--text-light);">Verifique se a URL está correta</small></span>`;
      statusDiv.style.display = 'block';
    }
  } catch (error) {
    let errorMessage = 'Não foi possível conectar com a API.';
    let errorDetails = '';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: A conexão demorou muito.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Erro de conexão com a API.';
      errorDetails = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 1rem; margin-top: 0.5rem;">
          <strong style="color: var(--accent-color); display: block; margin-bottom: 0.5rem;">URL testada:</strong>
          <code style="color: var(--text-dark); background: var(--bg-white); border: 1px solid var(--border-color); padding: 0.25rem 0.5rem; border-radius: 3px; display: inline-block; margin-bottom: 0.75rem;">${apiUrl}</code>
          
          <strong style="color: var(--accent-color); display: block; margin-bottom: 0.5rem;">Possíveis causas:</strong>
          <ul style="color: var(--text-light); margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>API offline ou inacessível</li>
            <li>Extensão do navegador bloqueando requisições</li>
            <li>Problema de rede/firewall</li>
            <li>URL da API incorreta</li>
          </ul>
          
          <small style="color: var(--text-light); display: block; margin-top: 0.5rem;">
            <strong>Teste rápido:</strong> Abra <a href="${apiUrl}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">${apiUrl}</a> no navegador para verificar se a API está acessível.
          </small>
        </div>`;
    } else {
      errorMessage = `Erro: ${error.message}`;
    }
    
    statusDiv.innerHTML = `<span style="color: var(--accent-color);"><i class="fas fa-times-circle"></i> ${errorMessage}${errorDetails}</span>`;
    statusDiv.style.display = 'block';
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = '<i class="fas fa-network-wired"></i> Testar Conexão';
  }
}

// Verificar API Key do DeepSeek
async function verifyDeepSeekApiKey() {
  const apiKeyInput = document.getElementById('deepseekApiKey');
  const statusDiv = document.getElementById('apiKeyStatus');
  const verifyBtn = document.getElementById('verifyApiKeyBtn');
  const saveBtn = document.getElementById('saveDeepSeekBtn');
  
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    statusDiv.innerHTML = '<span style="color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira uma API Key primeiro</span>';
    statusDiv.style.display = 'block';
    return;
  }
  
  // Desabilitar botões durante verificação
  verifyBtn.disabled = true;
  saveBtn.disabled = true;
  verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  
  // Limpar status anterior
  statusDiv.style.display = 'none';
  
  try {
    // Obter URL da API do campo ou usar a padrão
    const urlInput = document.getElementById('deepseekApiUrl');
    const apiUrl = (urlInput && urlInput.value.trim()) || DEEPSEEK_API_URL || 'https://promobot-deepseek.meoy4a.easypanel.host';
    
    if (!apiUrl || apiUrl.trim() === '') {
      throw new Error('URL da API não configurada');
    }
    
    // Atualizar constante se URL foi alterada
    if (urlInput && urlInput.value.trim() && urlInput.value.trim() !== DEEPSEEK_API_URL) {
      localStorage.setItem('deepseekApiUrl', urlInput.value.trim());
    }
    
    // Fazer requisição para verificar a API Key
    let response;
    try {
      response = await fetch(`${apiUrl}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey
        }),
        signal: createTimeoutSignal(15000) // Timeout de 15 segundos
      });
    } catch (fetchError) {
      // Se falhar, tentar novamente
      response = await fetch(`${apiUrl}/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          api_key: apiKey
        }),
        signal: createTimeoutSignal(15000)
      });
    }
    
    // Verificar se a resposta é JSON válido
    let data;
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch (parseError) {
      throw new Error(`Resposta inválida da API: ${response.status} ${response.statusText}`);
    }
    
    if (response.ok && data.success && data.valid) {
      // API Key válida
      statusDiv.innerHTML = '<span style="color: #10b981;"><i class="fas fa-check-circle"></i> API Key válida! Você pode salvar a configuração.</span>';
      statusDiv.style.display = 'block';
      
      // Marcar como verificada
      apiKeyInput.dataset.verified = 'true';
      
      // Habilitar botão de salvar
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
    } else {
      // API Key inválida
      statusDiv.innerHTML = `<span style="color: var(--accent-color);"><i class="fas fa-times-circle"></i> ${data.message || 'API Key inválida ou expirada'}</span>`;
      statusDiv.style.display = 'block';
      
      // Marcar como não verificada
      apiKeyInput.dataset.verified = 'false';
      
      // Desabilitar botão de salvar
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.5';
    }
  } catch (error) {
    let errorMessage = 'Erro ao verificar API Key';
    let errorDetails = '';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Timeout: A verificação demorou muito. Tente novamente.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      errorMessage = 'Não foi possível conectar com a API do DeepSeek.';
      errorDetails = `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 1rem; margin-top: 0.5rem;">
          <strong style="color: var(--accent-color); display: block; margin-bottom: 0.5rem;">URL da API:</strong>
          <code style="color: var(--text-dark); background: var(--bg-white); border: 1px solid var(--border-color); padding: 0.25rem 0.5rem; border-radius: 3px; display: inline-block; margin-bottom: 0.75rem;">${DEEPSEEK_API_URL}</code>
          
          <strong style="color: var(--accent-color); display: block; margin-bottom: 0.5rem;">Possíveis causas:</strong>
          <ul style="color: var(--text-light); margin: 0.5rem 0; padding-left: 1.5rem;">
            <li>API offline ou inacessível</li>
            <li>Extensão do navegador bloqueando requisições</li>
            <li>Problema de rede/firewall</li>
            <li>URL da API incorreta</li>
          </ul>
          
          <small style="color: var(--text-light); display: block; margin-top: 0.5rem;">
            <strong>Teste rápido:</strong> Abra <a href="${DEEPSEEK_API_URL}" target="_blank" style="color: var(--accent-color); text-decoration: underline;">${DEEPSEEK_API_URL}</a> no navegador para verificar se a API está acessível.
          </small>
        </div>`;
    } else {
      errorMessage = `Erro: ${error.message}`;
    }
    
    statusDiv.innerHTML = `<span style="color: var(--accent-color);"><i class="fas fa-exclamation-triangle"></i> ${errorMessage}${errorDetails}</span>`;
    statusDiv.style.display = 'block';
    
    apiKeyInput.dataset.verified = 'false';
    saveBtn.disabled = true;
    saveBtn.style.opacity = '0.5';
  } finally {
    // Reabilitar botão de verificação
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verificar API Key';
  }
}

// Salvar configuração do DeepSeek
async function handleDeepSeekConfig(e) {
  e.preventDefault();
  
  const apiKeyInput = document.getElementById('deepseekApiKey');
  const apiKey = apiKeyInput.value.trim();
  const model = document.getElementById('deepseekModel').value;
  const enabled = document.getElementById('deepseekEnabled').value === 'true';
  const statusDiv = document.getElementById('apiKeyStatus');
  const saveBtn = document.getElementById('saveDeepSeekBtn');

  if (!apiKey && enabled) {
    statusDiv.innerHTML = '<span style="color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Preencha a API Key do DeepSeek</span>';
    statusDiv.style.display = 'block';
    return;
  }

  // SEMPRE verificar a API Key antes de salvar se estiver habilitada
  if (enabled && apiKey) {
    // Se não foi verificada ainda, verificar agora
    if (apiKeyInput.dataset.verified !== 'true') {
      statusDiv.innerHTML = '<span style="color: var(--text-light);"><i class="fas fa-spinner fa-spin"></i> Verificando API Key antes de salvar...</span>';
      statusDiv.style.display = 'block';
      
      // Desabilitar botão durante verificação
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
      
      // Verificar a API Key
      await verifyDeepSeekApiKey();
      
      // Se não estiver verificada após tentativa, não permitir salvar
      if (apiKeyInput.dataset.verified !== 'true') {
        statusDiv.innerHTML = '<span style="color: var(--accent-color);"><i class="fas fa-times-circle"></i> Não foi possível salvar. A API Key precisa ser válida. Verifique e tente novamente.</span>';
        statusDiv.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Configuração';
        return;
      }
    }
    
    // Se chegou aqui, a API Key está verificada, continuar com o salvamento
  }

  // Desabilitar botão durante salvamento
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  try {
    // Salvar no localStorage (aqui você pode adicionar lógica para salvar no banco de dados)
    const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
    configs.deepseek = { 
      apiKey, 
      model, 
      enabled,
      verified: apiKeyInput.dataset.verified === 'true',
      verifiedAt: apiKeyInput.dataset.verified === 'true' ? new Date().toISOString() : null
    };
    localStorage.setItem('integrationConfigs', JSON.stringify(configs));

    // TODO: Aqui você pode adicionar uma chamada para salvar no banco de dados
    // Exemplo:
    // await saveDeepSeekConfigToDatabase(configs.deepseek);

    loadPlatforms();
    
    statusDiv.innerHTML = '<span style="color: #10b981;"><i class="fas fa-check-circle"></i> Configuração salva com sucesso!</span>';
    statusDiv.style.display = 'block';
    
    // Fechar modal após 1 segundo
    setTimeout(() => {
      closeModal();
    }, 1000);
  } catch (error) {
    statusDiv.innerHTML = `<span style="color: var(--accent-color);"><i class="fas fa-times-circle"></i> Erro ao salvar: ${error.message}</span>`;
    statusDiv.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Configuração';
  }
}

// Salvar configuração de notificação
function handleNotificationConfig(type, e) {
  if (type === 'telegram') {
    const token = document.getElementById('telegramToken').value;
    const chatId = document.getElementById('telegramChatId').value;

    if (!token || !chatId) {
      alert('Preencha todos os campos');
      return;
    }

    const configs = JSON.parse(localStorage.getItem('notificationConfigs') || '{}');
    configs.telegram = { token, chatId };
    localStorage.setItem('notificationConfigs', JSON.stringify(configs));

    document.getElementById('telegramStatus').textContent = 'Configurado';
    document.getElementById('telegramStatus').className = 'platform-status active';
    
    alert('Telegram configurado com sucesso!');
  } else if (type === 'whatsapp') {
    const number = document.getElementById('whatsappNumber').value;
    const apiKey = document.getElementById('whatsappApiKey').value;

    if (!number) {
      alert('Preencha o número do WhatsApp');
      return;
    }

    const configs = JSON.parse(localStorage.getItem('notificationConfigs') || '{}');
    configs.whatsapp = { number, apiKey };
    localStorage.setItem('notificationConfigs', JSON.stringify(configs));

    document.getElementById('whatsappStatus').textContent = 'Configurado';
    document.getElementById('whatsappStatus').className = 'platform-status active';
    
    alert('WhatsApp configurado com sucesso!');
  }

  closeModal();
}

// Resetar formulários
function resetProfileForm() {
  document.getElementById('profileName').value = currentUser.displayName;
}

function resetPasswordForm() {
  document.getElementById('passwordForm').reset();
}

// Logout
async function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    if (window.firebaseAuth && window.firebaseAuth.signOut) {
      try {
        await window.firebaseAuth.signOut();
      } catch (error) {
        // Erro silencioso no logout
      }
    }
    
    localStorage.clear();
    window.location.href = 'login.html';
  }
}

// Sistema de Monitoramento
function initMonitoring() {
  addConsoleLine('info', 'Sistema de monitoramento inicializado. Pronto para iniciar.');
}

function startMonitoring() {
  if (isMonitoring) return;
  
  isMonitoring = true;
  const startBtn = document.getElementById('startMonitoringBtn');
  const stopBtn = document.getElementById('stopMonitoringBtn');
  
  if (startBtn) startBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'inline-flex';
  
  addConsoleLine('info', '═══════════════════════════════════════════════════════');
  addConsoleLine('info', '🚀 MONITORAMENTO INICIADO');
  addConsoleLine('info', '═══════════════════════════════════════════════════════');
  
  // Simular processo de monitoramento
  monitoringInterval = setInterval(() => {
    simulateMonitoringCycle();
  }, 8000); // A cada 8 segundos um ciclo completo
}

function stopMonitoring() {
  if (!isMonitoring) return;
  
  isMonitoring = false;
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  const startBtn = document.getElementById('startMonitoringBtn');
  const stopBtn = document.getElementById('stopMonitoringBtn');
  
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (stopBtn) stopBtn.style.display = 'none';
  
  addConsoleLine('warning', '⏸️ Monitoramento pausado pelo usuário');
}

function simulateMonitoringCycle() {
  const platforms = ['AliExpress', 'Amazon', 'Shopee', 'Mercado Livre', 'Kabum', 'Magazine Luiza'];
  const platform = platforms[Math.floor(Math.random() * platforms.length)];
  
  // Etapa 1: Verificando plataforma
  addConsoleLine('checking', `🔍 Verificando ${platform}...`);
  
  setTimeout(() => {
    // Etapa 2: Encontrando promoção (ou não)
    const foundPromo = Math.random() > 0.6; // 40% de chance de encontrar
    
    if (foundPromo) {
      const products = [
        'Notebook Gamer',
        'Smartphone',
        'Fone Bluetooth',
        'Smart TV',
        'Tablet',
        'Mouse Gamer',
        'Teclado Mecânico',
        'Monitor 4K'
      ];
      const product = products[Math.floor(Math.random() * products.length)];
      const discount = Math.floor(Math.random() * 30) + 10; // 10-40%
      const price = (Math.random() * 2000 + 500).toFixed(2);
      
      addConsoleLine('found', `🎉 PROMOÇÃO ENCONTRADA! ${platform}: ${product} com ${discount}% OFF - R$ ${parseFloat(price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      
      setTimeout(() => {
        // Etapa 3: Processando promoção
        addConsoleLine('processing', `⚙️ Processando promoção: ${product}`);
        addConsoleLine('processing', `   └─ Desconto: ${discount}%`);
        addConsoleLine('processing', `   └─ Preço: R$ ${parseFloat(price).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
        addConsoleLine('processing', `   └─ Plataforma: ${platform}`);
        
        setTimeout(() => {
          // Etapa 4: Enviando notificação
          const notificationMethods = [];
          const notificationConfigs = JSON.parse(localStorage.getItem('notificationConfigs') || '{}');
          
          if (notificationConfigs.telegram) notificationMethods.push('Telegram');
          if (notificationConfigs.whatsapp) notificationMethods.push('WhatsApp');
          
          if (notificationMethods.length > 0) {
            notificationMethods.forEach(method => {
              addConsoleLine('sending', `📤 Enviando notificação via ${method}...`);
            });
            
            setTimeout(() => {
              // Etapa 5: Sucesso
              notificationMethods.forEach(method => {
                addConsoleLine('success', `✅ Notificação enviada com sucesso via ${method}!`);
              });
              addConsoleLine('complete', `✨ Processo completo! Promoção de ${product} enviada.`);
              addConsoleLine('info', '───────────────────────────────────────────────────────────');
            }, 2000);
          } else {
            addConsoleLine('warning', `⚠️ Nenhum método de notificação configurado. Promoção não será enviada.`);
            addConsoleLine('info', '💡 Configure Telegram ou WhatsApp nas Configurações para receber notificações.');
            addConsoleLine('info', '───────────────────────────────────────────────────────────');
          }
        }, 1500);
      }, 1000);
    } else {
      addConsoleLine('info', `✓ ${platform}: Nenhuma promoção encontrada no momento.`);
      addConsoleLine('info', '───────────────────────────────────────────────────────────');
    }
  }, 2000);
}

function addConsoleLine(type, message) {
  const console = document.getElementById('monitoringConsole');
  if (!console) return;
  
  const time = new Date().toLocaleTimeString('pt-BR');
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.innerHTML = `
    <span class="console-time">[${time}]</span>
    <span class="console-message">${message}</span>
  `;
  
  console.appendChild(line);
  
  if (autoScrollEnabled) {
    console.scrollTop = console.scrollHeight;
  }
  
  // Limitar número de linhas (manter últimas 200)
  const lines = console.querySelectorAll('.console-line');
  if (lines.length > 200) {
    lines[0].remove();
  }
}

function clearConsole() {
  const console = document.getElementById('monitoringConsole');
  if (console) {
    console.innerHTML = `
      <div class="console-line info">
        <span class="console-time">[${new Date().toLocaleTimeString('pt-BR')}]</span>
        <span class="console-message">Console limpo. Sistema em execução...</span>
      </div>
    `;
  }
}

function toggleAutoScroll() {
  autoScrollEnabled = !autoScrollEnabled;
  const btn = document.getElementById('autoScrollBtn');
  if (btn) {
    btn.innerHTML = autoScrollEnabled 
      ? '<i class="fas fa-arrow-down"></i> Auto-scroll'
      : '<i class="fas fa-pause"></i> Pausado';
  }
}

// Sistema de Tema
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (theme === 'dark') {
      themeIcon.className = 'fas fa-sun';
    } else {
      themeIcon.className = 'fas fa-moon';
    }
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// Exportar funções globalmente
window.startMonitoring = startMonitoring;
window.stopMonitoring = stopMonitoring;
window.clearConsole = clearConsole;
window.toggleAutoScroll = toggleAutoScroll;
window.toggleTheme = toggleTheme;

// Toggle Sidebar (Mobile)
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const mobileToggle = document.getElementById('mobileMenuToggle');
  
  if (sidebar) {
    sidebar.classList.toggle('active');
    
    // Mudar ícone do botão
    if (mobileToggle) {
      const icon = mobileToggle.querySelector('i');
      if (sidebar.classList.contains('active')) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    }
  }
}

window.toggleSidebar = toggleSidebar;

// ==================== TELEGRAM MANAGEMENT ====================

// Inicializar WebSocket para mensagens do Telegram
function initTelegramWebSocket() {
  // Telegram desabilitado temporariamente - será configurado depois
  return;
  
  // Usar URL da API existente configurada
  const wsUrl = TELEGRAM_WS_URL;
  
  telegramWebSocket = new WebSocket(wsUrl);
  
  telegramWebSocket.onopen = () => {
    addConsoleLine('info', '🔌 Conectado ao servidor de mensagens do Telegram');
  };
  
  telegramWebSocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // A API envia mensagens em batch
      if (data.type === 'batch_messages' && data.data) {
        data.data.forEach(message => {
          const session = telegramSessions.find(s => s.id === message.sessionId);
          const sessionName = session ? session.name : 'Desconhecida';
          
          addConsoleLine('found', `📨 [${sessionName}] Mensagem recebida de ${message.senderName}: ${message.message}`);
        });
      } else if (data.type === 'new_message') {
        // Fallback para formato individual
        const message = data.data;
        const session = telegramSessions.find(s => s.id === message.sessionId);
        const sessionName = session ? session.name : 'Desconhecida';
        
        addConsoleLine('found', `📨 [${sessionName}] Mensagem recebida de ${message.senderName}: ${message.message}`);
      }
    } catch (error) {
      // Erro silencioso ao processar mensagem WebSocket
    }
  };
  
  telegramWebSocket.onerror = (error) => {
    addConsoleLine('error', '❌ Erro na conexão WebSocket');
  };
  
  telegramWebSocket.onclose = () => {
    setTimeout(() => {
      initTelegramWebSocket();
    }, 3000);
  };
}

// Helper para criar timeout (compatibilidade com navegadores antigos)
function createTimeoutSignal(ms) {
  const controller = new AbortController();
  if (AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// Verificar se a API do Telegram está disponível
async function checkTelegramApiStatus() {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/api/config`, {
      method: 'GET',
      signal: createTimeoutSignal(5000) // Timeout de 5 segundos
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Carregar sessões do Telegram
async function loadTelegramSessions() {
  // Telegram desabilitado temporariamente - será configurado depois
  telegramSessions = [];
  return;
  
  try {
    // Verificar se a API está disponível primeiro
    const isApiAvailable = await checkTelegramApiStatus();
    if (!isApiAvailable) {
      telegramSessions = [];
      loadPlatforms();
      return;
    }

    // A API usa /api/sessions, não /api/telegram/sessions
    const response = await fetch(`${TELEGRAM_API_URL}/api/sessions`, {
      signal: createTimeoutSignal(10000) // Timeout de 10 segundos
    });
    
    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }
    
    const data = await response.json();
    telegramSessions = data.sessions || [];
    
    // Atualizar card do Telegram se estiver visível
    loadPlatforms();
  } catch (error) {
    telegramSessions = [];
    loadPlatforms();
  }
}

// Carregar lista de contas no modal
async function loadTelegramAccountsList() {
  const container = document.getElementById('telegramAccountsList');
  if (!container) return;
  
  try {
    await loadTelegramSessions();
    
    if (telegramSessions.length === 0) {
      container.innerHTML = '<p style="color: var(--text-light); text-align: center; padding: 1rem;">Nenhuma conta configurada ainda.</p>';
      return;
    }
    
    container.innerHTML = telegramSessions.map(session => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: var(--bg-white); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem;">
        <div>
          <strong style="color: var(--text-dark);">${session.name}</strong>
          <div style="font-size: 0.85rem; color: var(--text-light); margin-top: 0.25rem;">
            ${session.phone} • 
            <span class="platform-status ${session.status === 'connected' ? 'active' : 'soon'}" style="display: inline-block; padding: 2px 8px; font-size: 0.75rem;">
              ${session.status === 'connected' ? 'Conectada' : session.status === 'paused' ? 'Pausada' : 'Desconectada'}
            </span>
          </div>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          ${session.status === 'connected' ? `
            <button class="btn-sm btn-outline" onclick="pauseTelegramSession('${session.id}')" title="Pausar">
              <i class="fas fa-pause"></i>
            </button>
          ` : session.status === 'paused' ? `
            <button class="btn-sm btn-primary" onclick="resumeTelegramSession('${session.id}')" title="Retomar">
              <i class="fas fa-play"></i>
            </button>
          ` : ''}
          <button class="btn-sm btn-outline" onclick="deleteTelegramSession('${session.id}')" title="Excluir" style="color: var(--accent-color);">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    container.innerHTML = '<p style="color: var(--accent-color); text-align: center; padding: 1rem;">Erro ao carregar contas.</p>';
  }
}

// Mostrar formulário de adicionar conta
function showAddTelegramAccountForm() {
  const form = document.getElementById('addTelegramAccountForm');
  if (form) {
    form.style.display = 'block';
  }
}

// Esconder formulário de adicionar conta
function hideAddTelegramAccountForm() {
  const form = document.getElementById('addTelegramAccountForm');
  if (form) {
    form.style.display = 'none';
    const formElement = document.getElementById('addTelegramAccountFormElement');
    if (formElement) formElement.reset();
  }
}

// Limpar formulário após adicionar conta
function resetTelegramAccountForm() {
  const formElement = document.getElementById('addTelegramAccountFormElement');
  if (formElement) {
    formElement.reset();
  }
}

// Adicionar conta do Telegram
async function handleAddTelegramAccount(e) {
  e.preventDefault();
  
  const name = document.getElementById('telegramAccountName').value.trim();
  const phone = document.getElementById('telegramPhone').value.trim();
  const apiId = document.getElementById('telegramApiId').value.trim();
  const apiHash = document.getElementById('telegramApiHash').value.trim();
  
  if (!name || !phone || !apiId || !apiHash) {
    alert('Preencha todos os campos obrigatórios');
    return;
  }
  
  try {
    // Verificar se a API está disponível
    const isApiAvailable = await checkTelegramApiStatus();
    if (!isApiAvailable) {
      alert('⚠️ API do Telegram não está disponível!\n\n' +
            'A API precisa estar rodando em: ' + TELEGRAM_API_URL + '\n\n' +
            'Para configurar uma URL diferente, use o console do navegador:\n' +
            'localStorage.setItem("telegramApiUrl", "sua-url-aqui")');
      return;
    }

    // Criar nova sessão (enviar código SMS)
    const response = await fetch(`${TELEGRAM_API_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, apiId, apiHash }),
      signal: createTimeoutSignal(30000) // Timeout de 30 segundos
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: `Status ${response.status}` }));
      throw new Error(errorData.error || `Erro HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Solicitar código de verificação
      const code = prompt('Digite o código SMS que você recebeu no Telegram:');
      if (!code) {
        alert('Código não fornecido. Tente novamente.');
        return;
      }
      
      // Verificar código
      const verifyResponse = await fetch(`${TELEGRAM_API_URL}/api/sessions/${data.sessionId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        signal: createTimeoutSignal(30000) // Timeout de 30 segundos
      });
      
      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({ error: `Status ${verifyResponse.status}` }));
        throw new Error(errorData.error || `Erro HTTP ${verifyResponse.status}`);
      }
      
      const verifyData = await verifyResponse.json();
      
      if (verifyData.success) {
        alert('Conta adicionada com sucesso!');
        resetTelegramAccountForm();
        loadTelegramAccountsList();
        loadTelegramSessions();
        loadPlatforms();
      } else {
        alert('Erro ao verificar código: ' + (verifyData.error || 'Código inválido'));
      }
    } else {
      alert('Erro ao criar sessão: ' + (data.error || 'Erro desconhecido'));
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      alert('⏱️ Timeout ao conectar com a API do Telegram.\n\nVerifique se a API está rodando e tente novamente.');
    } else if (error.message.includes('Failed to fetch')) {
      alert('❌ Não foi possível conectar com a API do Telegram.\n\n' +
            'Verifique se a API está rodando em: ' + TELEGRAM_API_URL + '\n\n' +
            'Para configurar uma URL diferente, use o console do navegador:\n' +
            'localStorage.setItem("telegramApiUrl", "sua-url-aqui")');
    } else {
      alert('❌ Erro ao adicionar conta: ' + error.message);
    }
  }
}

// Pausar sessão
async function pauseTelegramSession(sessionId) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/api/sessions/${sessionId}/pause`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.success) {
      loadTelegramAccountsList();
      loadTelegramSessions();
      loadPlatforms();
    } else {
      alert('Erro ao pausar sessão: ' + (data.error || 'Erro desconhecido'));
    }
  } catch (error) {
    alert('Erro ao pausar sessão.');
  }
}

// Retomar sessão
async function resumeTelegramSession(sessionId) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/api/sessions/${sessionId}/resume`, {
      method: 'POST',
    });
    
    const data = await response.json();
    
    if (data.success) {
      loadTelegramAccountsList();
      loadTelegramSessions();
      loadPlatforms();
    } else {
      alert('Erro ao retomar sessão: ' + (data.error || 'Erro desconhecido'));
    }
  } catch (error) {
    alert('Erro ao retomar sessão.');
  }
}

// Excluir sessão
async function deleteTelegramSession(sessionId) {
  if (!confirm('Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/api/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Conta excluída com sucesso!');
      loadTelegramAccountsList();
      loadTelegramSessions();
      loadPlatforms();
    } else {
      alert('Erro ao excluir conta: ' + (data.error || 'Erro desconhecido'));
    }
  } catch (error) {
    alert('Erro ao excluir conta.');
  }
}

// Exportar funções globalmente
window.showAddTelegramAccountForm = showAddTelegramAccountForm;
window.hideAddTelegramAccountForm = hideAddTelegramAccountForm;
window.pauseTelegramSession = pauseTelegramSession;
window.resumeTelegramSession = resumeTelegramSession;
window.deleteTelegramSession = deleteTelegramSession;
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.verifyDeepSeekApiKey = verifyDeepSeekApiKey;
window.testDeepSeekApiConnection = testDeepSeekApiConnection;
window.addDeepSeekApiKey = addDeepSeekApiKey;
window.removeDeepSeekApiKey = removeDeepSeekApiKey;
window.showDeepSeekApiKeyInput = showDeepSeekApiKeyInput;

