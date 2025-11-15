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
  initTelegramWebSocket();
  loadTelegramSessions();
  
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
  } else if (integration.id === 'deepseek' || integration.id === 'botfather') {
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
      
      setTimeout(() => {
        const form = document.getElementById('deepseekConfigForm');
        if (form) {
          form.addEventListener('submit', handleDeepSeekConfig);
        }
      }, 100);
      return;
    } else if (platformId === 'botfather') {
      modalTitle.textContent = `Sobre ${integration.name}`;
      modalBody.innerHTML = getBotFatherInfoHTML();
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
        <label>Ativar Monitoramento</label>
        <select id="platformEnabled">
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </div>
      <div class="form-group">
        <label>Intervalo de Verificação (minutos)</label>
        <input type="number" id="checkInterval" value="15" min="5" max="60">
      </div>
      <div class="form-group">
        <label>Desconto Mínimo (%)</label>
        <input type="number" id="minDiscount" value="10" min="0" max="100">
      </div>
      <div class="form-group">
        <label>Palavras-chave (separadas por vírgula)</label>
        <textarea id="keywords" placeholder="exemplo: notebook, smartphone, fone"></textarea>
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
  return `
    <form id="deepseekConfigForm">
      <div class="form-group">
        <label>API Key do DeepSeek</label>
        <input type="text" id="deepseekApiKey" placeholder="sk-...">
        <small style="color: var(--text-light); font-size: 0.85rem;">
          Obtenha sua API Key em <a href="https://platform.deepseek.com" target="_blank">platform.deepseek.com</a>
        </small>
      </div>
      <div class="form-group">
        <label>Modelo</label>
        <select id="deepseekModel">
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="deepseek-coder">DeepSeek Coder</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ativar Análise Inteligente</label>
        <select id="deepseekEnabled">
          <option value="true">Sim</option>
          <option value="false">Não</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary">Salvar Configuração</button>
      </div>
    </form>
  `;
}

// HTML de informações do Bot Father
function getBotFatherInfoHTML() {
  return `
    <div style="padding: 1rem 0;">
      <p style="margin-bottom: 1rem;">
        <strong>Bot Father</strong> é o bot oficial do Telegram para criar e gerenciar bots.
      </p>
      <div style="background: var(--bg-light); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <h4 style="margin-bottom: 0.5rem;">Como usar:</h4>
        <ol style="padding-left: 1.5rem; color: var(--text-light);">
          <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
          <li>Envie o comando <code>/newbot</code></li>
          <li>Siga as instruções para criar seu bot</li>
          <li>Copie o token fornecido</li>
          <li>Configure o token na integração do Telegram acima</li>
        </ol>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" onclick="closeModal()">Entendi</button>
      </div>
    </div>
  `;
}

// HTML de configuração de notificações
function getNotificationConfigHTML(type) {
  if (type === 'telegram') {
    return `
      <div id="telegramConfigContainer">
        <div style="margin-bottom: 1.5rem;">
          <h4 style="margin-bottom: 1rem;">Contas do Telegram</h4>
          <div id="telegramAccountsList" style="margin-bottom: 1rem;">
            <!-- Contas serão carregadas aqui -->
          </div>
        </div>
        <div id="addTelegramAccountForm" style="padding: 1rem; background: var(--bg-light); border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="margin-bottom: 1rem;">Adicionar Nova Conta</h4>
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
    console.error('Erro ao atualizar perfil:', error);
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
    console.error('Erro ao alterar senha:', error);
    
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

// Salvar configuração do DeepSeek
function handleDeepSeekConfig(e) {
  e.preventDefault();
  
  const apiKey = document.getElementById('deepseekApiKey').value;
  const model = document.getElementById('deepseekModel').value;
  const enabled = document.getElementById('deepseekEnabled').value === 'true';

  if (!apiKey && enabled) {
    alert('Preencha a API Key do DeepSeek');
    return;
  }

  const configs = JSON.parse(localStorage.getItem('integrationConfigs') || '{}');
  configs.deepseek = { apiKey, model, enabled };
  localStorage.setItem('integrationConfigs', JSON.stringify(configs));

  loadPlatforms();
  alert('DeepSeek configurado com sucesso!');
  closeModal();
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
        console.error('Erro ao fazer logout:', error);
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
  // Usar URL da API existente configurada
  const wsUrl = TELEGRAM_WS_URL;
  
  telegramWebSocket = new WebSocket(wsUrl);
  
  telegramWebSocket.onopen = () => {
    console.log('WebSocket conectado');
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
      console.error('Erro ao processar mensagem WebSocket:', error);
    }
  };
  
  telegramWebSocket.onerror = (error) => {
    console.error('Erro no WebSocket:', error);
    addConsoleLine('error', '❌ Erro na conexão WebSocket');
  };
  
  telegramWebSocket.onclose = () => {
    console.log('WebSocket desconectado. Tentando reconectar...');
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
  try {
    // Verificar se a API está disponível primeiro
    const isApiAvailable = await checkTelegramApiStatus();
    if (!isApiAvailable) {
      console.warn('API do Telegram não está disponível em:', TELEGRAM_API_URL);
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
    if (error.name === 'AbortError') {
      console.error('Timeout ao conectar com a API do Telegram');
    } else {
      console.error('Erro ao carregar sessões do Telegram:', error);
    }
    console.error('Verifique se a API está rodando em:', TELEGRAM_API_URL);
    console.error('Para configurar a URL da API, use: localStorage.setItem("telegramApiUrl", "sua-url-aqui")');
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
          <strong>${session.name}</strong>
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
    console.error('Erro ao carregar lista de contas:', error);
    container.innerHTML = '<p style="color: var(--accent-color);">Erro ao carregar contas.</p>';
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
    console.error('Erro ao adicionar conta:', error);
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
    console.error('Erro ao pausar sessão:', error);
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
    console.error('Erro ao retomar sessão:', error);
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
    console.error('Erro ao excluir sessão:', error);
    alert('Erro ao excluir conta.');
  }
}

// Exportar funções globalmente
window.showAddTelegramAccountForm = showAddTelegramAccountForm;
window.hideAddTelegramAccountForm = hideAddTelegramAccountForm;
window.pauseTelegramSession = pauseTelegramSession;
window.resumeTelegramSession = resumeTelegramSession;
window.deleteTelegramSession = deleteTelegramSession;

