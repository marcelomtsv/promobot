// Painel JavaScript - PromoBOT

// Integrações destacadas (não são plataformas de e-commerce)
const integrations = [
  { id: 'telegram', name: 'Telegram', status: 'active', icon: 'fab fa-telegram', color: '#0088cc', isIntegration: true },
  { id: 'whatsapp', name: 'WhatsApp', status: 'active', icon: 'fab fa-whatsapp', color: '#25d366', isIntegration: true },
  { id: 'deepseek', name: 'DeepSeek', status: 'active', icon: 'fas fa-brain', color: '#6366f1', isIntegration: true },
  { id: 'botfather', name: 'Bot Father', status: 'active', icon: 'fas fa-robot', color: '#0088cc', isIntegration: true }
];

// Plataformas de e-commerce
// IMPORTANTE: Todas começam como 'soon' (Em Breve) até que haja configuração salva no Firebase
const platforms = [
  { id: 'aliexpress', name: 'AliExpress', status: 'soon', icon: 'fas fa-shopping-bag', favicon: 'https://www.google.com/s2/favicons?domain=aliexpress.com&sz=32' },
  { id: 'americanas', name: 'Americanas', status: 'soon', icon: 'fas fa-store', favicon: 'https://www.google.com/s2/favicons?domain=americanas.com.br&sz=32' },
  { id: 'amazon', name: 'Amazon', status: 'soon', icon: 'fab fa-amazon', favicon: 'https://www.google.com/s2/favicons?domain=amazon.com.br&sz=32' },
  { id: 'kabum', name: 'Kabum', status: 'soon', icon: 'fas fa-laptop', favicon: 'https://www.google.com/s2/favicons?domain=kabum.com.br&sz=32' },
  { id: 'magazineluiza', name: 'Magazine Luiza', status: 'soon', icon: 'fas fa-shopping-cart', favicon: 'https://www.google.com/s2/favicons?domain=magazineluiza.com.br&sz=32' },
  { id: 'mercadolivre', name: 'Mercado Livre', status: 'soon', icon: 'fas fa-truck', favicon: 'https://www.google.com/s2/favicons?domain=mercadolivre.com.br&sz=32' },
  { id: 'netshoes', name: 'Netshoes', status: 'soon', icon: 'fas fa-running', favicon: 'https://www.google.com/s2/favicons?domain=netshoes.com.br&sz=32' },
  { id: 'shopee', name: 'Shopee', status: 'soon', icon: 'fas fa-box', favicon: 'https://www.google.com/s2/favicons?domain=shopee.com.br&sz=32' },
  { id: 'submarino', name: 'Submarino', status: 'soon', icon: 'fas fa-ship', favicon: 'https://www.google.com/s2/favicons?domain=submarino.com.br&sz=32' }
];

// Dados do usuário
let currentUser = null;

// Variáveis de monitoramento
let monitoringInterval = null;
let isMonitoring = false;
let autoScrollEnabled = true;

// ===== FUNÇÕES GLOBAIS (exportadas imediatamente para uso no HTML) =====
// Toggle Sidebar (Mobile) - Exportado imediatamente para uso no HTML
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const body = document.body;
  
  if (sidebar) {
    const isActive = sidebar.classList.contains('active');
    
    if (isActive) {
      // Fechar sidebar
      sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      if (body) body.style.overflow = '';
      
      // Mudar ícone do botão
      if (mobileToggle) {
        mobileToggle.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      }
    } else {
      // Abrir sidebar
      sidebar.classList.add('active');
      if (overlay) overlay.classList.add('active');
      if (body) body.style.overflow = 'hidden';
      
      // Mudar ícone do botão
      if (mobileToggle) {
        mobileToggle.classList.add('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-times';
      }
    }
  }
}

// Exportar toggleSidebar imediatamente (antes de qualquer DOMContentLoaded)
window.toggleSidebar = toggleSidebar;

// ===== CONFIGURAÇÃO DA API =====
// Helper para obter URL da API
const getApiUrl = (key, port) => localStorage.getItem(key) || `http://localhost:${port}`;

const TELEGRAM_API_URL = getApiUrl('telegramApiUrl', 3003);
const TELEGRAM_WS_URL = localStorage.getItem('telegramWsUrl') || 'ws://localhost:3003';
const DEEPSEEK_API_URL = getApiUrl('deepseekApiUrl', 3002);
const BOTFATHER_API_URL = getApiUrl('botfatherApiUrl', 3001);
// ==========================================

// ===== SISTEMA DE CACHE PROFISSIONAL =====

/**
 * Cache Manager - Sistema profissional de cache com write-through strategy
 * 
 * Características:
 * - Write-through: Salva no Firebase E atualiza cache imediatamente
 * - Invalidação inteligente: Invalida caches relacionados automaticamente
 * - Prevenção de race conditions: Locks para evitar múltiplas chamadas simultâneas
 * - TTL configurável por tipo de dado
 * - Cache hierárquico e organizado
 */

// Estrutura de cache centralizada
// Cache simples em memória (apenas para evitar múltiplas chamadas simultâneas)
const dataCache = {
  integrationConfigs: null,
  notificationConfigs: null,
  telegramAccount: null,
  userData: null
};

// Locks para prevenir race conditions
const loadingLocks = {
  integrationConfigs: null,
  notificationConfigs: null,
  telegramAccount: null,
  userData: null
};

// Debounce function - evita chamadas excessivas
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function - limita frequência de execução
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Carregar todas as configurações do Firebase
async function loadAllConfigsFromFirebase() {
  if (!currentUser || !currentUser.uid || !window.firebaseDb) {
    return;
  }
  
  try {
    const userData = await loadUserDataFromFirebase();
    if (userData) {
      dataCache.integrationConfigs = userData.integrationConfigs || {};
      dataCache.notificationConfigs = userData.notificationConfigs || {};
      dataCache.telegramAccount = userData.telegramAccount || {};
      dataCache.userData = userData;
    }
  } catch (error) {
    // Silenciar erros
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  
  try {
    const authResult = await Promise.race([
      checkAuth(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 3000))
    ]);
    
    if (!currentUser || !currentUser.uid) {
      window.location.href = 'login.html';
      return;
    }
    
    const savedPanel = localStorage.getItem('activePanel') || 'overview';
    showPanel(savedPanel);
    
    // Carregar dados críticos primeiro (paralelo)
    const criticalLoad = Promise.allSettled([
      loadUserProfile(),
      loadAllConfigsFromFirebase()
    ]);
    
    // Carregar dados não críticos em paralelo
    const nonCriticalLoad = Promise.allSettled([
      initTheme(),
      loadPlatforms()
    ]);
    
    // Iniciar monitoramento após carregamento crítico
    criticalLoad.then(() => {
      // Usar requestIdleCallback para não bloquear UI
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => initMonitoring(), { timeout: 2000 });
      } else {
        setTimeout(() => initMonitoring(), 100);
      }
    });
    
    // Aguardar tudo carregar silenciosamente
    Promise.allSettled([criticalLoad, nonCriticalLoad]).catch(() => {});
  } catch (error) {
    if (!currentUser || !currentUser.uid) {
      window.location.href = 'login.html';
    }
  }
});

async function checkAuth() {
  if (!window.firebaseAuth) {
    window.location.href = 'login.html';
    return;
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!currentUser) {
        window.location.href = 'login.html';
      }
      reject(new Error('Timeout na autenticação'));
    }, 1500);

    const unsubscribe = window.firebaseAuth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      
      if (!user) {
        unsubscribe();
        window.location.href = 'login.html';
        return;
      }

      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        emailVerified: user.emailVerified,
        photoURL: user.photoURL
      };
      localStorage.setItem('userData', JSON.stringify(currentUser));
      unsubscribe();
      resolve();
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
  const avatarSmall = document.getElementById('userAvatarSmall');
  const avatarMenu = document.getElementById('userAvatarMenu');
  const menuName = document.getElementById('userMenuName');
  const menuEmail = document.getElementById('userMenuEmail');

  // Remover skeleton e mostrar dados reais com fade-in
  if (avatar) {
    // Remover skeleton
    const skeleton = avatar.querySelector('.skeleton-avatar');
    if (skeleton) {
      skeleton.remove();
    }
    
    // Função auxiliar para carregar avatar com tratamento de erro
    const loadAvatarWithFallback = (element, photoURL, displayName) => {
      if (!element) return;
      
      if (photoURL) {
        const img = new Image();
        img.onload = () => {
          element.style.backgroundImage = `url(${photoURL})`;
          element.style.backgroundSize = 'cover';
          element.style.backgroundPosition = 'center';
          element.textContent = '';
          element.style.backgroundColor = 'transparent';
        };
        img.onerror = () => {
          const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
          element.textContent = initial;
          element.style.backgroundImage = 'none';
          element.style.backgroundColor = '';
        };
        img.src = photoURL;
      } else {
        const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
        element.textContent = initial;
        element.style.backgroundImage = 'none';
        element.style.backgroundColor = '';
      }
    };
    
    loadAvatarWithFallback(avatar, currentUser.photoURL, currentUser.displayName);
    
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

  // Função auxiliar para carregar avatar com tratamento de erro
  const loadAvatarWithFallback = (element, photoURL, displayName) => {
    if (!element) return;
    
    if (photoURL) {
      const img = new Image();
      img.onload = () => {
        element.style.backgroundImage = `url(${photoURL})`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.textContent = '';
        element.style.backgroundColor = 'transparent';
      };
      img.onerror = () => {
        const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
        element.textContent = initial;
        element.style.backgroundImage = 'none';
        element.style.backgroundColor = '';
      };
      img.src = photoURL;
    } else {
      const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
      element.textContent = initial;
      element.style.backgroundImage = 'none';
      element.style.backgroundColor = '';
    }
  };

  // Avatar pequeno no menu
  if (avatarSmall) {
    const skeleton = avatarSmall.querySelector('.skeleton-avatar-small');
    if (skeleton) skeleton.remove();
    loadAvatarWithFallback(avatarSmall, currentUser.photoURL, currentUser.displayName);
  }

  // Avatar e info no dropdown
  if (avatarMenu) {
    const skeleton = avatarMenu.querySelector('.skeleton-avatar-menu');
    if (skeleton) skeleton.remove();
    loadAvatarWithFallback(avatarMenu, currentUser.photoURL, currentUser.displayName);
  }

  if (menuName) {
    menuName.textContent = currentUser.displayName || 'Usuário';
  }

  if (menuEmail) {
    menuEmail.textContent = currentUser.email || 'usuario@email.com';
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

// Carregar plataformas e integrações (OTIMIZADO com debounce para alta concorrência)
let isLoadingPlatforms = false; // Flag para evitar chamadas simultâneas
let loadPlatformsTimeout = null; // Timeout para debounce

// Versão com debounce (evita múltiplas chamadas em sequência)
const loadPlatformsDebounced = debounce(async () => {
  await loadPlatforms();
}, 300);

async function loadPlatforms() {
  // Evitar chamadas simultâneas que podem causar duplicação
  if (isLoadingPlatforms) {
    return;
  }
  isLoadingPlatforms = true;
  
  const platformsList = document.getElementById('platformsList');
  const integrationsList = document.getElementById('integrationsList');
  const activePreview = document.getElementById('activePlatformsPreview');
  
  // Limpar COMPLETAMENTE (remover todos os filhos)
  if (platformsList) {
    while (platformsList.firstChild) {
      platformsList.removeChild(platformsList.firstChild);
    }
  }
  if (integrationsList) {
    while (integrationsList.firstChild) {
      integrationsList.removeChild(integrationsList.firstChild);
    }
  }
  if (activePreview) {
    while (activePreview.firstChild) {
      activePreview.removeChild(activePreview.firstChild);
    }
  }

  // Verificar conta do Telegram no Firebase (apenas Firebase - mais leve)
  if (currentUser && currentUser.uid) {
    try {
      const accountStatus = await checkTelegramAccountFromFirebase();
      if (accountStatus.hasAccount && accountStatus.firebaseAccount) {
        dataCache.telegramAccount = accountStatus.firebaseAccount;
      } else {
        dataCache.telegramAccount = {};
      }
    } catch (error) {
      // Ignorar erros
    }
  }

  // Carregar integrações destacadas (verificar duplicatas antes de adicionar)
  if (integrationsList) {
    integrations.forEach(integration => {
      // Verificar se o card já existe antes de adicionar
      const existingCard = document.getElementById(`integration-card-${integration.id}`);
      if (!existingCard) {
        const card = createIntegrationCard(integration);
        integrationsList.appendChild(card);
      }
    });
  }

  // Carregar plataformas de e-commerce
  if (platformsList) {
    platforms.forEach(platform => {
      const card = createPlatformCard(platform);
      platformsList.appendChild(card);
    });
  }

  // Preview de plataformas ativas (apenas e-commerce - apenas as que têm configuração)
  if (activePreview) {
    platforms.forEach(platform => {
      // Verificar se há configuração salva no Firebase para esta loja
      const integrationConfigs = dataCache.integrationConfigs || {};
      const platformConfig = integrationConfigs[platform.id] || {};
      const hasConfig = platformConfig && Object.keys(platformConfig).length > 0 && 
                        Object.values(platformConfig).some(val => val && val.toString().trim() !== '');
      
      // Mostrar apenas se tiver configuração (status ativo)
      if (hasConfig) {
        const previewCard = createPlatformCard(platform);
        activePreview.appendChild(previewCard);
      }
    });
  }
  
  // Liberar flag após completar
  isLoadingPlatforms = false;
}

// Criar card de integração destacada
function createIntegrationCard(integration) {
  const card = document.createElement('div');
  card.className = 'platform-card integration-card';
  
  // Verificar se está configurado (usar cache do Firebase)
  const notificationConfigs = dataCache.notificationConfigs || {};
  let statusText = 'Não configurado';
  let statusClass = 'soon';
  
  if (integration.id === 'telegram') {
    // Verificar apenas Firebase (muito mais leve) - conta ativa se tiver sessionString (verificada)
    const telegramConfig = dataCache.telegramAccount || {};
    const hasAccount = telegramConfig.phone && telegramConfig.apiId && telegramConfig.apiHash;
    const isActive = hasAccount && telegramConfig.sessionString; // Ativo apenas se tiver sessionString (conta verificada)
    
    if (isActive) {
      statusText = 'Ativo';
      statusClass = 'active';
    } else if (hasAccount) {
      statusText = 'Pendente';
      statusClass = 'soon';
    } else {
      statusText = 'Não configurado';
      statusClass = 'soon';
    }
  } else if (integration.id === 'whatsapp') {
    // WhatsApp ainda não tem sistema implementado - sempre "Em Breve"
    statusText = 'Em Breve';
    statusClass = 'soon';
  } else if (integration.id === 'deepseek') {
    // Verificar configuração do DeepSeek
    const integrationConfigs = dataCache.integrationConfigs || {};
    const deepseekConfig = integrationConfigs.deepseek || {};
    
    if (deepseekConfig.apiKey) {
      statusText = 'Ativo';
      statusClass = 'active';
    } else {
      statusText = 'Não configurado';
      statusClass = 'soon';
    }
  } else if (integration.id === 'botfather') {
    // Verificar configuração do BotFather
    const integrationConfigs = dataCache.integrationConfigs || {};
    const botfatherConfig = integrationConfigs.botfather || {};
    const hasConfig = botfatherConfig.botToken && botfatherConfig.channel && botfatherConfig.group;
    
    if (hasConfig) {
      statusText = 'Ativo';
      statusClass = 'active';
    } else {
      statusText = 'Não configurado';
      statusClass = 'soon';
    }
  }
  
  const descriptions = {
    'telegram': 'Configure o Telegram para receber mensagens em tempo real',
    'whatsapp': 'Configure o WhatsApp para receber notificações',
    'deepseek': 'IA para análise inteligente de promoções',
    'botfather': 'Crie e gerencie bots do Telegram'
  };
  
  // Determinar texto do botão baseado no status
  // WhatsApp sempre desabilitado (Em Breve)
  const isWhatsApp = integration.id === 'whatsapp';
  const isActive = statusClass === 'active' && !isWhatsApp;
  const buttonText = isWhatsApp ? 'Em Breve' : (isActive ? 'Gerenciar' : 'Cadastrar');
  const buttonIcon = isWhatsApp ? 'fas fa-clock' : (isActive ? 'fas fa-edit' : 'fas fa-plus');
  const buttonDisabled = isWhatsApp ? 'disabled' : '';
  
  // Adicionar ID único ao card para evitar duplicação
  card.setAttribute('data-integration-id', integration.id);
  card.id = `integration-card-${integration.id}`;
  
  card.innerHTML = `
    <div class="platform-header">
      <div class="platform-name">
        <i class="${integration.icon}" style="color: ${integration.color}; font-size: 1.75rem;"></i>
        <span>${integration.name}</span>
      </div>
      <span class="platform-status ${statusClass}">${statusText}</span>
    </div>
    <p style="color: var(--text-light); font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.25rem; flex: 1;">
      ${descriptions[integration.id] || 'Integração disponível'}
    </p>
    <div class="platform-actions">
      ${isWhatsApp ? `
        <button class="btn-sm btn-outline" disabled>
          <i class="${buttonIcon}"></i>
          ${buttonText}
        </button>
      ` : `
        <button class="btn-sm btn-primary" onclick="openPlatformConfig('${integration.id}')">
          <i class="${buttonIcon}"></i>
          ${buttonText}
        </button>
      `}
    </div>
  `;
  
  return card;
}

// Criar card de plataforma
function createPlatformCard(platform) {
  const card = document.createElement('div');
  card.className = 'platform-card';
  
  // Verificar se há configuração salva no Firebase para esta loja
  const integrationConfigs = CacheManager.get('integrationConfigs') || {};
  const platformConfig = integrationConfigs[platform.id] || {};
  
  // Verificar se há configuração válida (pode variar por loja, mas geralmente precisa ter pelo menos um campo)
  const hasConfig = platformConfig && Object.keys(platformConfig).length > 0 && 
                    Object.values(platformConfig).some(val => val && val.toString().trim() !== '');
  
  // Status: 'active' apenas se houver configuração, senão 'soon' (Em Breve)
  const statusClass = hasConfig ? 'active' : 'soon';
  const statusText = hasConfig ? 'Ativo' : 'Em Breve';
  
  // Usar favicon se disponível, senão usar ícone FontAwesome
  // OTIMIZADO: Adicionar cache busting e melhor tratamento de erro
  const iconHTML = platform.favicon 
    ? `<img src="${platform.favicon}&t=${Date.now()}" alt="${platform.name}" class="platform-favicon" loading="lazy" decoding="async" crossorigin="anonymous" referrerpolicy="no-referrer" onerror="this.style.display='none'; const nextIcon = this.nextElementSibling; if (nextIcon) nextIcon.style.display='inline';" onload="this.classList.add('loaded'); const nextIcon = this.nextElementSibling; if (nextIcon) nextIcon.style.display='none';">
       <i class="${platform.icon}" style="display: inline-block;"></i>`
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
      ${hasConfig ? `
        <button class="btn-sm btn-primary" onclick="openPlatformConfig('${platform.id}')">
          <i class="fas fa-edit"></i>
          Gerenciar
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
    setTimeout(() => {
      const sidebar = document.querySelector('.sidebar');
      const overlay = document.querySelector('.sidebar-overlay');
      const mobileToggle = document.getElementById('mobileMenuToggle');
      const body = document.body;
      
      if (sidebar) sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      if (body) body.style.overflow = '';
      
      if (mobileToggle) {
        mobileToggle.classList.remove('active');
        const icon = mobileToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      }
    }, 300);
  }
}

// Abrir modal de configuração
async function openPlatformConfig(platformId) {
  const modal = document.getElementById('platformModal');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  
  // Verificar se é integração
  const integration = integrations.find(i => i.id === platformId);
  if (integration) {
    if (platformId === 'telegram') {
      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0088cc 0%, #229ED9 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);">
            <i class="fab fa-telegram-plane" style="font-size: 1.25rem; color: white;"></i>
          </div>
          <span>Cadastrar Telegram</span>
        </div>
      `;
      
      // Verificar API ANTES de abrir o modal
      try {
        const isApiAvailable = await checkApiStatus('telegram');
        if (!isApiAvailable) {
          // Só abrir modal para mostrar erro
          showApiLoadingModal(modalBody, 'telegram');
          modal.classList.add('active');
          showApiUnavailableModal(modalBody, 'telegram');
          return;
        }
        
        // API disponível - abrir modal e carregar dados
        showApiLoadingModal(modalBody, 'telegram');
        modal.classList.add('active');
        
        // Carregar conta do Firebase
        await loadTelegramAccountFromFirebase();
        
        // Mostrar conteúdo
        modalBody.innerHTML = getTelegramConfigHTML();
      } catch (error) {
        // Em caso de erro, verificar API novamente
        const isApiAvailable = await checkApiStatus('telegram');
        if (!isApiAvailable) {
          showApiLoadingModal(modalBody, 'telegram');
          modal.classList.add('active');
          showApiUnavailableModal(modalBody, 'telegram');
          return;
        }
        modalBody.innerHTML = getTelegramConfigHTML();
      }
      
      return;
    } else if (platformId === 'whatsapp') {
      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
            <i class="fab fa-whatsapp" style="font-size: 1.25rem; color: white;"></i>
          </div>
          <span>Adicionar WhatsApp</span>
        </div>
      `;
      modalBody.innerHTML = getNotificationConfigHTML(platformId);
      modal.classList.add('active');
      
      // Para WhatsApp, apenas adicionar listener do formulário
      setTimeout(() => {
        const form = document.getElementById('notificationConfigForm');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleNotificationConfig('whatsapp');
          });
        }
      }, 100);
      return;
    } else if (platformId === 'deepseek') {
      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
            <i class="fas fa-brain" style="font-size: 1.25rem; color: white;"></i>
          </div>
          <span>Cadastrar DeepSeek</span>
        </div>
      `;
      
      // Verificar API ANTES de abrir o modal
      try {
        const isApiAvailable = await checkApiStatus('deepseek');
        if (!isApiAvailable) {
          showApiLoadingModal(modalBody, 'deepseek');
          modal.classList.add('active');
          showApiUnavailableModal(modalBody, 'deepseek');
          return;
        }
        
        // API disponível - abrir modal e carregar dados
        showApiLoadingModal(modalBody, 'deepseek');
        modal.classList.add('active');
        
        await loadAllConfigsFromFirebase(true);
        modalBody.innerHTML = getDeepSeekConfigHTML();
      } catch (error) {
        const isApiAvailable = await checkApiStatus('deepseek');
        if (!isApiAvailable) {
          showApiLoadingModal(modalBody, 'deepseek');
          modal.classList.add('active');
          showApiUnavailableModal(modalBody, 'deepseek');
          return;
        }
        modalBody.innerHTML = getDeepSeekConfigHTML();
      }
      
      return;
    } else if (platformId === 'botfather') {
      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);">
            <i class="fas fa-robot" style="font-size: 1.25rem; color: white;"></i>
          </div>
          <span>Cadastrar Bot Father</span>
        </div>
      `;
      
      // Verificar API ANTES de abrir o modal
      try {
        const isApiAvailable = await checkApiStatus('botfather');
        if (!isApiAvailable) {
          showApiLoadingModal(modalBody, 'botfather');
          modal.classList.add('active');
          showApiUnavailableModal(modalBody, 'botfather');
          return;
        }
        
        // API disponível - abrir modal e carregar dados
        showApiLoadingModal(modalBody, 'botfather');
        modal.classList.add('active');
        
        await loadAllConfigsFromFirebase(true);
        modalBody.innerHTML = getBotFatherConfigHTML();
      } catch (error) {
        const isApiAvailable = await checkApiStatus('botfather');
        if (!isApiAvailable) {
          showApiLoadingModal(modalBody, 'botfather');
          modal.classList.add('active');
          showApiUnavailableModal(modalBody, 'botfather');
          return;
        }
        modalBody.innerHTML = getBotFatherConfigHTML();
      }
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

// HTML de configuração do Telegram (padrão DeepSeek)
function getTelegramConfigHTML() {
  // Carregar do cache (só mostra como ativo se tiver no Firebase E na API)
  const telegramConfig = window.telegramConfigCache || {};
  // Só considerar como tendo conta se tiver os dados básicos
  // O status "Ativo" só será mostrado se checkTelegramAccountSync() confirmar que tem nos dois
  const hasAccount = telegramConfig.phone && telegramConfig.apiId && telegramConfig.apiHash;
  
  return `
    <div id="telegramConfigContainer">
      ${hasAccount ? `
        <!-- Status: Configurado e Ativo - Design Melhorado -->
        <div style="text-align: center; padding: 2.5rem 1.5rem;">
          <!-- Ícone de Sucesso -->
          <div style="width: 100px; height: 100px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25); position: relative; animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
            <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(16, 185, 129, 0.2); animation: pulse 2s infinite;"></div>
          </div>
          
          <!-- Título e Descrição -->
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.5rem; font-weight: 600;">Telegram Configurado</h3>
          <p style="color: var(--text-light); margin: 0 0 2.5rem 0; font-size: 0.95rem; line-height: 1.5;">Sua conta está ativa e funcionando perfeitamente</p>
          
          <!-- Card de Informações -->
          <div style="background: linear-gradient(135deg, var(--bg-light) 0%, var(--bg-white) 100%); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; text-align: left; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <!-- Status -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-circle" style="font-size: 0.5rem; color: #10b981;"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Status da Conta</span>
              </div>
              <span class="platform-status active" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 20px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);">
                <i class="fas fa-check-circle" style="font-size: 0.7rem;"></i>
                ATIVO
              </span>
            </div>
            
            <!-- Telefone -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-phone" style="font-size: 0.85rem; color: var(--text-light);"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Telefone</span>
              </div>
              <span style="color: var(--text-dark); font-size: 0.9rem; font-weight: 600; font-family: 'Courier New', monospace;">${telegramConfig.phone || 'N/A'}</span>
            </div>
            
            <!-- API ID -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-key" style="font-size: 0.85rem; color: var(--text-light);"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">API ID</span>
              </div>
              <code style="background: var(--bg-light); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: var(--text-dark); font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">
                ${telegramConfig.apiId ? telegramConfig.apiId.substring(0, 4) + '...' + telegramConfig.apiId.substring(telegramConfig.apiId.length - 2) : 'N/A'}
              </code>
            </div>
          </div>
          
          <!-- Botões de Ação -->
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-outline" onclick="abrirConfirmacaoRemoverTelegram()" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; border: 2px solid var(--border-color); transition: all 0.2s;">
              <i class="fas fa-trash-alt" style="margin-right: 0.5rem;"></i> 
              Remover
            </button>
            <button type="button" class="btn btn-primary" onclick="showTelegramAccountInput()" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%); box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3); transition: all 0.2s;">
              <i class="fas fa-edit" style="margin-right: 0.5rem;"></i> 
              Editar
            </button>
          </div>
        </div>
        
        <style>
          @keyframes scaleIn {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.1);
            }
          }
        </style>
      ` : `
        <!-- Formulário: Adicionar Conta -->
        <form id="telegramConfigForm">
          <!-- Status Message -->
          <div id="telegramStatusMessage" style="display: none; margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: var(--bg-white); border: 1px solid var(--border-color);"></div>
          
          <div class="form-group">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">Telefone (com código do país)</label>
            <input 
              type="text" 
              id="telegramPhone" 
              value="${telegramConfig.phone || ''}" 
              placeholder="+5511999999999" 
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
              autocomplete="off"
              required
            >
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Formato: +código do país + DDD + número (ex: +5511999999999)
            </small>
          </div>
          
          <div class="form-group">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">API ID</label>
            <input 
              type="text" 
              id="telegramApiId" 
              value="${telegramConfig.apiId || ''}" 
              placeholder="12345678" 
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
              autocomplete="off"
              required
            >
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Obtenha em <a href="https://my.telegram.org/apps" target="_blank" style="color: var(--accent-color);">my.telegram.org/apps</a>
            </small>
          </div>
          
          <div class="form-group">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">API Hash</label>
            <input 
              type="text" 
              id="telegramApiHash" 
              value="${telegramConfig.apiHash || ''}" 
              placeholder="abcdef1234567890abcdef1234567890" 
              style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
              autocomplete="off"
              required
            >
            <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
              Obtenha em <a href="https://my.telegram.org/apps" target="_blank" style="color: var(--accent-color);">my.telegram.org/apps</a>
            </small>
          </div>
          
          <div class="form-actions" style="margin-top: 2rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="addTelegramAccount()" id="addTelegramAccountBtn" style="flex: 1;">
              <i class="fas fa-plus"></i> Adicionar Conta
            </button>
          </div>
        </form>
      `}
    </div>
  `;
}

// HTML de configuração do DeepSeek
function getDeepSeekConfigHTML(forceForm = false) {
  const integrationConfigs = dataCache.integrationConfigs || {};
  const deepseekConfig = integrationConfigs.deepseek || {};
  const hasApiKey = !forceForm && !!deepseekConfig.apiKey;
  
  return `
    <div id="deepseekConfigContainer">
      ${hasApiKey ? `
        <!-- Status: Configurado e Ativo - Design Melhorado (ESTILO UNIFICADO COM TELEGRAM) -->
        <div style="text-align: center; padding: 2.5rem 1.5rem;">
          <!-- Ícone de Sucesso -->
          <div style="width: 100px; height: 100px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25); position: relative; animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
            <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(16, 185, 129, 0.2); animation: pulse 2s infinite;"></div>
          </div>
          
          <!-- Título e Descrição -->
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.5rem; font-weight: 600;">DeepSeek Configurado</h3>
          <p style="color: var(--text-light); margin: 0 0 2.5rem 0; font-size: 0.95rem; line-height: 1.5;">Sua API Key está ativa e funcionando perfeitamente</p>
          
          <!-- Card de Informações -->
          <div style="background: linear-gradient(135deg, var(--bg-light) 0%, var(--bg-white) 100%); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; text-align: left; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <!-- Status -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-circle" style="font-size: 0.5rem; color: #10b981;"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Status da API Key</span>
              </div>
              <span class="platform-status active" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 20px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);">
                <i class="fas fa-check-circle" style="font-size: 0.7rem;"></i>
                ATIVO
              </span>
            </div>
            
            <!-- API Key -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-key" style="font-size: 0.85rem; color: var(--text-light);"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">API Key</span>
              </div>
              <code style="background: var(--bg-light); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: var(--text-dark); font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">
                ${deepseekConfig.apiKey.substring(0, 8)}...${deepseekConfig.apiKey.substring(deepseekConfig.apiKey.length - 4)}
              </code>
            </div>
          </div>
          
          <!-- Botões de Ação (ESTILO UNIFICADO COM TELEGRAM E BOTFATHER) -->
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-outline" onclick="abrirConfirmacaoRemoverDeepSeek()" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; border: 2px solid var(--border-color); transition: all 0.2s;">
              <i class="fas fa-trash-alt" style="margin-right: 0.5rem;"></i> 
              Remover
            </button>
            <button type="button" class="btn btn-primary" onclick="showDeepSeekApiKeyInput()" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: all 0.2s;">
              <i class="fas fa-edit" style="margin-right: 0.5rem;"></i> 
              Editar
            </button>
          </div>
        </div>
        
        <style>
          @keyframes scaleIn {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.1);
            }
          }
        </style>
      ` : `
        <!-- Formulário: Adicionar/Trocar API Key (ESTILO UNIFICADO) -->
        <form id="deepseekConfigForm">
          <!-- Status Message -->
          <div id="apiKeyStatus" style="display: none; margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: var(--bg-white); border: 1px solid var(--border-color);"></div>
          
          ${hasApiKey ? `
          <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: var(--text-light); font-size: 0.9rem; margin: 0; text-align: center;">
              <i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>
              Você está trocando a API Key atual. Preencha o novo valor abaixo.
            </p>
          </div>
          ` : ''}
          
          <div class="form-group">
            <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">API Key do DeepSeek</label>
            <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
              <input 
                type="password" 
                id="deepseekApiKey" 
                value="" 
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
          
          <div class="form-actions" style="margin-top: 2rem;">
            <button type="button" class="btn btn-secondary" onclick="closeModal()" style="flex: 1;">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="cadastrarDeepSeek()" id="cadastrarDeepSeekBtn" style="flex: 1;">
              <i class="fas fa-plus"></i> ${hasApiKey ? 'Salvar Nova API Key' : 'Cadastrar'}
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

// HTML de configuração do Bot Father (ESTILO UNIFICADO COM TELEGRAM)
function getBotFatherConfigHTML(forceForm = false) {
  const integrationConfigs = CacheManager.get('integrationConfigs') || {};
  const botfatherConfig = integrationConfigs.botfather || {};
  const hasConfig = !forceForm && botfatherConfig.botToken && botfatherConfig.channel && botfatherConfig.group;
  
  return `
    <div id="botfatherConfigContainer">
      ${hasConfig ? `
        <!-- Status: Configurado e Ativo - Design Melhorado (ESTILO UNIFICADO COM TELEGRAM) -->
        <div style="text-align: center; padding: 2.5rem 1.5rem;">
          <!-- Ícone de Sucesso -->
          <div style="width: 100px; height: 100px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25); position: relative; animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
            <div style="position: absolute; inset: -4px; border-radius: 50%; border: 2px solid rgba(16, 185, 129, 0.2); animation: pulse 2s infinite;"></div>
          </div>
          
          <!-- Título e Descrição -->
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.5rem; font-weight: 600;">Bot Father Configurado</h3>
          <p style="color: var(--text-light); margin: 0 0 2.5rem 0; font-size: 0.95rem; line-height: 1.5;">Sua configuração está ativa e funcionando perfeitamente</p>
          
          <!-- Card de Informações -->
          <div style="background: linear-gradient(135deg, var(--bg-light) 0%, var(--bg-white) 100%); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; text-align: left; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
            <!-- Status -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-circle" style="font-size: 0.5rem; color: #10b981;"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Status da Configuração</span>
              </div>
              <span class="platform-status active" style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 6px 14px; font-size: 0.8rem; font-weight: 600; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 20px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);">
                <i class="fas fa-check-circle" style="font-size: 0.7rem;"></i>
                ATIVO
              </span>
            </div>
            
            <!-- Bot Token -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-key" style="font-size: 0.85rem; color: var(--text-light);"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Bot Token</span>
              </div>
              <code style="background: var(--bg-light); border: 1px solid var(--border-color); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: var(--text-dark); font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 0.5px;">
                ${botfatherConfig.botToken.substring(0, 8)}...${botfatherConfig.botToken.substring(botfatherConfig.botToken.length - 4)}
              </code>
            </div>
            
            <!-- Channel -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-hashtag" style="font-size: 0.85rem; color: var(--text-light);"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Channel</span>
              </div>
              <span style="color: var(--text-dark); font-size: 0.9rem; font-weight: 600; font-family: 'Courier New', monospace;">${botfatherConfig.channel}</span>
            </div>
            
            <!-- Group -->
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-users" style="font-size: 0.85rem; color: var(--text-light);"></i>
                <span style="color: var(--text-light); font-size: 0.9rem; font-weight: 500;">Group</span>
              </div>
              <span style="color: var(--text-dark); font-size: 0.9rem; font-weight: 600; font-family: 'Courier New', monospace;">${botfatherConfig.group}</span>
            </div>
          </div>
          
          <!-- Botões de Ação (ESTILO UNIFICADO) -->
          <div style="display: flex; gap: 0.75rem; justify-content: center;">
            <button type="button" class="btn btn-outline" onclick="abrirConfirmacaoRemoverBotFather()" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; border: 2px solid var(--border-color); transition: all 0.2s;">
              <i class="fas fa-trash-alt" style="margin-right: 0.5rem;"></i> 
              Remover
            </button>
            <button type="button" class="btn btn-primary" onclick="showBotFatherConfigInput()" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; background: linear-gradient(135deg, #0088cc 0%, #0066aa 100%); box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3); transition: all 0.2s;">
              <i class="fas fa-edit" style="margin-right: 0.5rem;"></i> 
              Editar
            </button>
          </div>
        </div>
        
        <style>
          @keyframes scaleIn {
            from {
              transform: scale(0.8);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(1.1);
            }
          }
        </style>
      ` : `
        <!-- Formulário: Adicionar Configuração (ESTILO UNIFICADO) -->
        <form id="botfatherConfigForm">
          <!-- Status Message -->
          <div id="botfatherStatusMessage" style="display: none; margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: var(--bg-white); border: 1px solid var(--border-color);"></div>
          
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
              value="" 
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
              <i class="fas fa-plus"></i> ${hasConfig ? 'Salvar Nova Configuração' : 'Adicionar Configuração'}
            </button>
          </div>
        </form>
      `}
    </div>
  `;
}

// HTML de configuração de notificações (padronizado)
function getNotificationConfigHTML(type) {
  if (type === 'telegram') {
    return `
      <div id="telegramConfigContainer">
        <div style="margin-bottom: 2rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid var(--border-color);">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #0088cc 0%, #229ED9 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0, 136, 204, 0.3);">
              <i class="fab fa-telegram-plane" style="font-size: 1.5rem; color: white;"></i>
            </div>
            <div>
              <h3 style="margin: 0; color: var(--text-dark); font-size: 1.25rem; font-weight: 600;">Telegram</h3>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-light); font-size: 0.9rem;">Gerencie sua conta do Telegram</p>
            </div>
          </div>
          
        </div>
        
        <div id="addTelegramAccountForm" style="padding: 1.5rem; background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 12px; margin-bottom: 1.5rem;">
          <h4 style="margin: 0 0 0.75rem 0; color: var(--text-dark); font-size: 1.1rem; font-weight: 600;">Adicionar Conta</h4>
          <p style="color: var(--text-light); font-size: 0.9rem; margin: 0 0 1.5rem 0; line-height: 1.5;">
            Preencha os dados abaixo para adicionar sua conta do Telegram. Você receberá um código SMS para confirmar.
            <br><strong style="color: var(--text-dark);">Nota:</strong> Apenas uma conta pode ser cadastrada por vez.
          </p>
          
          <!-- Status Message -->
          <div id="telegramStatusMessage" style="display: none; margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: var(--bg-white); border: 1px solid var(--border-color);"></div>
          
          <form id="addTelegramAccountFormElement">
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
                Obtenha em <a href="https://my.telegram.org/apps" target="_blank" style="color: var(--primary-color);">my.telegram.org/apps</a>
              </small>
            </div>
            <div class="form-group">
              <label>API Hash</label>
              <input type="text" id="telegramApiHash" placeholder="abcdef1234567890abcdef1234567890" required>
              <small style="color: var(--text-light); font-size: 0.85rem;">
                Obtenha em <a href="https://my.telegram.org/apps" target="_blank" style="color: var(--primary-color);">my.telegram.org/apps</a>
              </small>
            </div>
            <div class="form-actions" style="margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="addTelegramAccountBtn">
                <i class="fas fa-plus"></i>
                <span id="addTelegramAccountBtnText">Adicionar Conta</span>
              </button>
            </div>
          </form>
        </div>
        
        <div class="form-actions" style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
          <button type="button" class="btn btn-secondary" onclick="closeModal()" style="width: 100%;">Fechar</button>
        </div>
      </div>
    `;
  } else if (type === 'whatsapp') {
    const integrationConfigs = dataCache.integrationConfigs || {};
    const whatsappConfig = integrationConfigs.whatsapp || {};
    const hasConfig = !!whatsappConfig.number;
    
    return `
      <div id="whatsappConfigContainer">
        ${hasConfig ? `
          <!-- Status: Configurado e Ativo (ESTILO UNIFICADO) -->
          <div style="text-align: center; padding: 2rem 1rem;">
            <div style="width: 80px; height: 80px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
              <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
            </div>
            <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark);">WhatsApp Cadastrado</h3>
            <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">Sua conta está ativa e funcionando</p>
            
            <div style="background: var(--bg-light); border: 1px solid var(--border-color); border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="color: var(--text-light); font-size: 0.85rem;">Status:</span>
                <span class="platform-status active" style="display: inline-block; padding: 4px 12px; font-size: 0.75rem;">Ativo</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="color: var(--text-light); font-size: 0.85rem;">Número:</span>
                <span style="color: var(--text-dark); font-size: 0.85rem; font-weight: 500;">${whatsappConfig.number || 'N/A'}</span>
              </div>
            </div>
            
            <div style="display: flex; gap: 0.75rem; justify-content: center;">
              <button type="button" class="btn btn-outline" onclick="removeWhatsAppConfig()" style="flex: 1;">
                <i class="fas fa-trash"></i> Remover
              </button>
              <button type="button" class="btn btn-primary" onclick="showWhatsAppConfigInput()" style="flex: 1;">
                <i class="fas fa-edit"></i> Trocar Número
              </button>
            </div>
          </div>
        ` : `
          <!-- Formulário: Adicionar (ESTILO UNIFICADO) -->
          <form id="notificationConfigForm">
            <!-- Status Message -->
            <div id="whatsappStatusMessage" style="display: none; margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: var(--bg-white); border: 1px solid var(--border-color);"></div>
            
            <div class="form-group">
              <label style="margin-bottom: 0.5rem; display: block; color: var(--text-dark); font-weight: 500;">Número do WhatsApp</label>
              <input 
                type="text" 
                id="whatsappNumber" 
                value="${whatsappConfig.number || ''}"
                placeholder="+5511999999999" 
                style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-white); color: var(--text-dark); font-size: 0.9rem;"
                autocomplete="off"
                required
              >
              <small style="color: var(--text-light); font-size: 0.8rem; display: block; margin-top: 0.5rem;">
                Formato: +código do país + DDD + número (ex: +5511999999999)
              </small>
            </div>
            
            <div class="form-actions" style="margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="closeModal()" style="width: 100%; margin-bottom: 0.75rem;">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="saveWhatsAppBtn" style="width: 100%;">
                <i class="fas fa-plus"></i> Cadastrar
              </button>
            </div>
          </form>
        `}
      </div>
    `;
  }
}

// Fechar modal
function closeModal() {
  const modal = document.getElementById('platformModal');
  if (modal) {
    modal.classList.remove('active');
    // Limpar conteúdo do modal para garantir que recarregue na próxima abertura
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
      modalBody.innerHTML = '';
    }
  }
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

async function handlePlatformConfig(platformId, e) {
  e.preventDefault();
  
  if (!currentUser || !currentUser.uid) {
    alert('Usuário não autenticado. Faça login para salvar dados.');
    return;
  }
  
  const enabled = document.getElementById('platformEnabled').value === 'true';
  const interval = document.getElementById('checkInterval').value;
  const minDiscount = document.getElementById('minDiscount').value;
  const keywords = document.getElementById('keywords').value;

  const config = {
    enabled,
    interval: parseInt(interval),
    minDiscount: parseInt(minDiscount),
    keywords: keywords.split(',').map(k => k.trim())
  };

  try {
    await saveIntegrationConfigToFirebase(platformId, config);
    alert('Configuração salva com sucesso!');
    closeModal();
    loadPlatforms();
  } catch (error) {
    alert('Erro ao salvar configuração: ' + error.message);
  }
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

// Função genérica para toggle de visibilidade de senha
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  
  if (!input || !icon) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

// Funções específicas (compatibilidade)
function toggleApiKeyVisibility() {
  togglePasswordVisibility('deepseekApiKey', 'apiKeyToggleIcon');
}

function toggleBotTokenVisibility() {
  togglePasswordVisibility('botfatherBotToken', 'botTokenToggleIcon');
}

// Cadastrar DeepSeek (com tela de verificação)
async function cadastrarDeepSeek() {
  const apiKeyInput = document.getElementById('deepseekApiKey');
  const modalBody = document.getElementById('modalBody');
  
  if (!apiKeyInput || !modalBody) return;
  
  const apiKey = apiKeyInput.value.trim();
  
  // Validação básica
  if (!apiKey) {
    const statusDiv = document.getElementById('apiKeyStatus');
    if (statusDiv) {
      statusDiv.innerHTML = '<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-exclamation-circle"></i> Por favor, insira uma API Key</div>';
      statusDiv.style.display = 'block';
    }
    return;
  }
  
  // Salvar o valor da API Key para manter após erro
  window.deepseekApiKeyTemp = apiKey;
  
  // Mostrar tela de "Verificando..."
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem;">
      <div style="width: 80px; height: 80px; margin: 0 auto 2rem; position: relative;">
        <!-- Spinner animado -->
        <div style="width: 80px; height: 80px; border: 4px solid rgba(99, 102, 241, 0.1); border-top: 4px solid #6366f1; border-right: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; position: absolute; top: 0; left: 0;"></div>
        <!-- Ícone central -->
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
          <i class="fas fa-brain" style="font-size: 2rem; color: #6366f1;"></i>
        </div>
      </div>
      <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">Verificando...</h3>
      <p style="color: var(--text-light); margin: 0; font-size: 0.9rem;">Validando sua API Key</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  
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
      signal: createTimeoutSignal(20000),
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
      // API Key válida - Salvar no Firebase (já atualiza cache automaticamente via write-through)
      await saveIntegrationConfigToFirebase('deepseek', { apiKey });
      
      // Mostrar sucesso
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">✅ Cadastrado com sucesso!</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">Sua API Key foi verificada e salva</p>
        </div>
        <style>
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `;
      
      // Atualizar dashboard e modal após 1.5 segundos
      setTimeout(() => {
        loadPlatforms();
        modalBody.innerHTML = getDeepSeekConfigHTML();
      }, 1500);
      
    } else {
      // API Key inválida
      throw new Error(data.message || 'API Key inválida ou expirada');
    }
  } catch (error) {
    // Mostrar tela de erro com botão Voltar
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
    
    modalBody.innerHTML = `
      <div style="text-align: center; padding: 3rem 2rem;">
        <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
          <i class="fas fa-times" style="font-size: 2rem; color: white;"></i>
        </div>
        <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">❌ Erro na verificação</h3>
        <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem; line-height: 1.6;">${errorMessage}</p>
        <button type="button" class="btn btn-primary" onclick="voltarFormularioDeepSeek()" style="width: 100%;">
          <i class="fas fa-arrow-left"></i> Voltar
        </button>
      </div>
    `;
  }
}

// Voltar ao formulário mantendo os dados
function voltarFormularioDeepSeek() {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  
  // Recarregar formulário com dados mantidos
  modalBody.innerHTML = getDeepSeekConfigHTML();
  
  // Restaurar valor da API Key se existir
  if (window.deepseekApiKeyTemp) {
    const apiKeyInput = document.getElementById('deepseekApiKey');
    if (apiKeyInput) {
      apiKeyInput.value = window.deepseekApiKeyTemp;
    }
  }
}

// Função genérica para modal de confirmação de remoção
function showRemoveConfirmationModal(message, onCancel, onConfirm) {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 2.5rem 1.5rem;">
      <div style="width: 100px; height: 100px; margin: 0 auto 1.5rem; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 24px rgba(245, 158, 11, 0.25); position: relative; animation: scaleIn 0.5s ease-out;">
        <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: white;"></i>
      </div>
      <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.5rem; font-weight: 600;">Confirmar Remoção</h3>
      <p style="color: var(--text-light); margin: 0 0 2.5rem 0; font-size: 0.95rem; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 0.75rem; justify-content: center;">
        <button type="button" class="btn btn-secondary" onclick="${onCancel}" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500;">
          <i class="fas fa-times" style="margin-right: 0.5rem;"></i> Cancelar
        </button>
        <button type="button" class="btn btn-primary" onclick="${onConfirm}" style="flex: 1; padding: 0.875rem 1.25rem; font-weight: 500; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
          <i class="fas fa-trash-alt" style="margin-right: 0.5rem;"></i> Confirmar Remoção
        </button>
      </div>
    </div>
    <style>
      @keyframes scaleIn {
        from { transform: scale(0.8); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    </style>
  `;
}

// Abrir modal de confirmação para remover DeepSeek
function abrirConfirmacaoRemoverDeepSeek() {
  showRemoveConfirmationModal(
    'Tem certeza que deseja remover a API Key do DeepSeek?<br>Esta ação desativará a integração e não pode ser desfeita.',
    'voltarDeepSeekConfig()',
    'confirmarRemoverDeepSeek()'
  );
}

// Função genérica para mostrar loading animado (otimizada para performance)
function showLoadingAnimation(message = 'Processando...', color = '#6366f1') {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem;">
      <div style="width: 80px; height: 80px; margin: 0 auto 2rem; position: relative;">
        <div style="width: 80px; height: 80px; border: 4px solid rgba(${r}, ${g}, ${b}, 0.1); border-top: 4px solid ${color}; border-right: 4px solid ${color}; border-radius: 50%; animation: spin 1s linear infinite; position: absolute; top: 0; left: 0;"></div>
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: pulse 2s ease-in-out infinite;">
          <i class="fas fa-spinner" style="font-size: 2rem; color: ${color};"></i>
        </div>
      </div>
      <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem; animation: fadeInUp 0.5s ease-out;">${message}</h3>
      <p style="color: var(--text-light); margin: 0; font-size: 0.9rem; animation: fadeInUp 0.5s ease-out 0.1s both;">Aguarde um momento...</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        50% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.95); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    </style>
  `;
}

// Função genérica para voltar à configuração
function voltarParaConfig(getConfigHTML) {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  loadAllConfigsFromFirebase(true).then(() => {
    modalBody.innerHTML = getConfigHTML();
  });
}

// Funções específicas (compatibilidade)
function voltarDeepSeekConfig() {
  voltarParaConfig(getDeepSeekConfigHTML);
}

// Confirmar remoção da API Key do DeepSeek
async function confirmarRemoverDeepSeek() {
  if (!currentUser || !currentUser.uid) {
    alert('Usuário não autenticado.');
    return;
  }
  
  if (!window.firebaseDb) {
    alert('Firestore não está disponível.');
    return;
  }
  
  // Mostrar loading imediatamente
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    showLoadingAnimation('Removendo API Key...', '#6366f1');
  }
  
  try {
    // Carregar dados do cache primeiro (mais rápido)
    let integrationConfigs = dataCache.integrationConfigs || {};
    if (!integrationConfigs) {
      const userData = await loadUserDataFromFirebase() || {};
      integrationConfigs = userData.integrationConfigs || {};
    }
    
    // Remover configuração do objeto
    delete integrationConfigs.deepseek;
    
    // Salvar no Firebase (garantir que está realmente removido)
    // Usar set com merge para garantir que o campo seja removido
    const docRef = window.firebaseDb.collection('users').doc(currentUser.uid);
    const userData = await loadUserDataFromFirebase() || {};
    userData.integrationConfigs = integrationConfigs;
    userData.updatedAt = new Date().toISOString();
    await docRef.set(userData, { merge: true });
    
    // Invalidar cache completamente para forçar recarregamento
    dataCache.integrationConfigs = null;
    dataCache.userData = null;
    // Atualizar cache com dados limpos
    dataCache.integrationConfigs = integrationConfigs;
    
    // Atualizar plataformas (com debounce para evitar múltiplas chamadas)
    loadPlatformsDebounced();
    
    // Mostrar mensagem de sucesso
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">✅ Removido com sucesso!</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">A API Key foi removida</p>
          <button type="button" class="btn btn-primary" onclick="closeModal(); loadPlatformsDebounced();" style="padding: 0.75rem 2rem;">
            Fechar
          </button>
        </div>
        <style>
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `;
    }
  } catch (error) {
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
            <i class="fas fa-times" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">❌ Erro ao remover</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">${error.message}</p>
          <button type="button" class="btn btn-primary" onclick="voltarDeepSeekConfig()" style="padding: 0.75rem 2rem;">
            Voltar
          </button>
        </div>
      `;
    }
  }
}

// Mostrar formulário para trocar API Key
async function showDeepSeekApiKeyInput() {
  const modal = document.getElementById('platformModal');
  const modalBody = document.getElementById('modalBody');
  
  if (!modal || !modalBody) {
    return;
  }
  
  // Garantir que o modal está aberto
  if (!modal.classList.contains('active')) {
    modal.classList.add('active');
  }
  
  try {
    // Carregar dados ATUAIS do Firebase (não do cache antigo) para verificar se realmente existe
    const userData = await loadUserDataFromFirebase() || {};
    const integrationConfigs = userData.integrationConfigs || {};
    const deepseekConfig = integrationConfigs.deepseek || {};
    
    // Atualizar cache com dados atuais
    dataCache.integrationConfigs = integrationConfigs;
    
    // Forçar mostrar formulário mesmo se tiver configuração
    // Passar true para forceForm para sempre mostrar o formulário
    modalBody.innerHTML = getDeepSeekConfigHTML(true);
    
    // Limpar campo completamente (não mostrar dados antigos)
    setTimeout(() => {
      const apiKeyInput = document.getElementById('deepseekApiKey');
      if (apiKeyInput) {
        // SEMPRE limpar campo - não mostrar dados antigos
        apiKeyInput.value = '';
        apiKeyInput.placeholder = 'Digite a API Key do DeepSeek';
        // Focar no campo
        apiKeyInput.focus();
      }
    }, 100);
  } catch (error) {
    console.error('Erro ao mostrar formulário DeepSeek:', error);
    alert('Erro ao abrir formulário. Tente novamente.');
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
  
  // Mostrar loading animado no modal
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    showLoadingAnimation('Verificando configuração...', '#0088cc');
  }
  
  // Desabilitar botão
  if (addBtn) {
    addBtn.disabled = true;
  }
  
  try {
    // Verificar configuração na API (com timeout otimizado)
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
      // Configuração válida - Salvar (OTIMIZADO - apenas campos essenciais)
      await saveIntegrationConfigToFirebase('botfather', {
        botToken: botToken,
        channel: channel,
        group: group
      });
      
      // Cache já atualizado automaticamente pelo saveIntegrationConfigToFirebase (write-through)
      
      // Atualizar o conteúdo do modal para mostrar a tela de "configurado"
      if (modalBody) {
        modalBody.innerHTML = getBotFatherConfigHTML();
      }
      
      // Atualizar plataformas (sem bloquear UI)
      setTimeout(() => loadPlatforms(), 100);
      
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
    
    // Voltar para o formulário com erro
    if (modalBody) {
      modalBody.innerHTML = getBotFatherConfigHTML();
      // Mostrar erro após recarregar
      setTimeout(() => {
        const statusDiv = document.getElementById('botfatherStatus');
        if (statusDiv) {
          statusDiv.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 0.75rem; color: var(--accent-color);"><i class="fas fa-times-circle"></i> ${errorHTML}</div>`;
          statusDiv.style.display = 'block';
        }
        // Restaurar valores nos campos
        const botTokenInput = document.getElementById('botfatherBotToken');
        const channelInput = document.getElementById('botfatherChannel');
        const groupInput = document.getElementById('botfatherGroup');
        if (botTokenInput) botTokenInput.value = botToken;
        if (channelInput) channelInput.value = channel;
        if (groupInput) groupInput.value = group;
      }, 100);
    }
  }
}

// Abrir modal de confirmação para remover BotFather
function abrirConfirmacaoRemoverBotFather() {
  showRemoveConfirmationModal(
    'Tem certeza que deseja remover a configuração do Bot Father?<br>Esta ação desativará a integração e não pode ser desfeita.',
    'voltarBotFatherConfig()',
    'confirmarRemoverBotFather()'
  );
}

function voltarBotFatherConfig() {
  voltarParaConfig(getBotFatherConfigHTML);
}

// Confirmar remoção da configuração do BotFather
async function confirmarRemoverBotFather() {
  if (!currentUser || !currentUser.uid) {
    alert('Usuário não autenticado.');
    return;
  }
  
  if (!window.firebaseDb) {
    alert('Firestore não está disponível.');
    return;
  }
  
  // Mostrar loading imediatamente
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    showLoadingAnimation('Removendo configuração...', '#0088cc');
  }
  
  try {
    // Carregar dados do cache primeiro (mais rápido)
    let integrationConfigs = dataCache.integrationConfigs || {};
    if (!integrationConfigs) {
      const userData = await loadUserDataFromFirebase() || {};
      integrationConfigs = userData.integrationConfigs || {};
    }
    
    // Remover configuração
    delete integrationConfigs.botfather;
    
    // Salvar no Firebase
    await saveUserDataToFirebase({
      integrationConfigs: integrationConfigs
    });
    
    // Atualizar cache imediatamente (sem esperar)
    dataCache.integrationConfigs = integrationConfigs;
    dataCache.integrationConfigs = null;
    
    // Mostrar mensagem de sucesso
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">✅ Removido com sucesso!</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">A configuração do Bot Father foi removida</p>
          <button type="button" class="btn btn-primary" onclick="closeModal(); loadPlatformsDebounced();" style="padding: 0.75rem 2rem;">
            Fechar
          </button>
        </div>
        <style>
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `;
    }
    
    // Atualizar plataformas (com debounce para evitar múltiplas chamadas)
    loadPlatformsDebounced();
  } catch (error) {
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
            <i class="fas fa-times" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">❌ Erro ao remover</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">${error.message}</p>
          <button type="button" class="btn btn-primary" onclick="voltarBotFatherConfig()" style="padding: 0.75rem 2rem;">
            Voltar
          </button>
        </div>
      `;
    }
  }
}

// Mostrar input para trocar configuração do Bot Father
function showBotFatherConfigInput() {
  const modal = document.getElementById('platformModal');
  const modalBody = document.getElementById('modalBody');
  
  if (!modal || !modalBody) {
    return;
  }
  
  // Garantir que o modal está aberto
  if (!modal.classList.contains('active')) {
    modal.classList.add('active');
  }
  
  try {
    // Forçar mostrar formulário mesmo se tiver configuração
    // Passar true para forceForm para sempre mostrar o formulário
    modalBody.innerHTML = getBotFatherConfigHTML(true);
    
    // Restaurar valores atuais nos campos como placeholder (se existirem)
    setTimeout(() => {
      const integrationConfigs = dataCache.integrationConfigs || {};
      const botfatherConfig = integrationConfigs.botfather || {};
      const botTokenInput = document.getElementById('botfatherBotToken');
      const channelInput = document.getElementById('botfatherChannel');
      const groupInput = document.getElementById('botfatherGroup');
      
      // Limpar campos e adicionar placeholders informativos
      if (botTokenInput) {
        botTokenInput.value = '';
        botTokenInput.placeholder = botfatherConfig.botToken ? 
          `Atual: ${botfatherConfig.botToken.substring(0, 8)}...` : 
          '1234567890:ABCdefGHIjklMNOpqrsTUVwxyz';
        // Focar no primeiro campo
        botTokenInput.focus();
      }
      if (channelInput) {
        channelInput.value = '';
        channelInput.placeholder = botfatherConfig.channel ? 
          `Atual: ${botfatherConfig.channel}` : 
          '@meucanal ou -1001234567890';
      }
      if (groupInput) {
        groupInput.value = '';
        groupInput.placeholder = botfatherConfig.group ? 
          `Atual: ${botfatherConfig.group}` : 
          '@meugrupo ou -1001234567890';
      }
    }, 100);
  } catch (error) {
    console.error('Erro ao mostrar formulário BotFather:', error);
    alert('Erro ao abrir formulário. Tente novamente.');
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
    const apiUrl = (urlInput && urlInput.value.trim()) || DEEPSEEK_API_URL || 'http://localhost:3002';
    
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
    // Salvar no Firebase (OTIMIZADO - apenas apiKey)
    const deepseekConfig = { 
      apiKey
    };
    
    await saveIntegrationConfigToFirebase('deepseek', deepseekConfig);
    // Cache já atualizado automaticamente pelo saveIntegrationConfigToFirebase (write-through)

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
async function handleNotificationConfig(type, e) {
  if (type === 'telegram') {
    const token = document.getElementById('telegramToken').value;
    const chatId = document.getElementById('telegramChatId').value;

    if (!token || !chatId) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      await saveNotificationConfigToFirebase('telegram', { token, chatId });
      document.getElementById('telegramStatus').textContent = 'Configurado';
      document.getElementById('telegramStatus').className = 'platform-status active';
      alert('Telegram configurado com sucesso!');
    } catch (error) {
      alert('Erro ao salvar: ' + error.message);
    }
  } else if (type === 'whatsapp') {
    if (e) e.preventDefault();
    
    const number = document.getElementById('whatsappNumber')?.value.trim();
    const statusMessage = document.getElementById('whatsappStatusMessage');
    const saveBtn = document.getElementById('saveWhatsAppBtn');

    if (!number) {
      if (statusMessage) {
        statusMessage.style.display = 'block';
        statusMessage.style.background = '#fee2e2';
        statusMessage.style.borderColor = '#ef4444';
        statusMessage.innerHTML = '<span style="color: #991b1b;"><i class="fas fa-exclamation-circle"></i> Preencha o número do WhatsApp</span>';
      } else {
        alert('Preencha o número do WhatsApp');
      }
      return;
    }

    // Desabilitar botão durante cadastro
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
    }

    try {
      // Salvar no Firebase (OTIMIZADO - apenas em integrationConfigs, sem duplicação)
      await saveIntegrationConfigToFirebase('whatsapp', { number });
      // Cache já atualizado automaticamente pelo saveIntegrationConfigToFirebase (write-through)

      // Mostrar mensagem de sucesso
      if (statusMessage) {
        statusMessage.style.display = 'block';
        statusMessage.style.background = '#d1fae5';
        statusMessage.style.borderColor = '#10b981';
        statusMessage.innerHTML = '<span style="color: #065f46;"><i class="fas fa-check-circle"></i> WhatsApp cadastrado com sucesso!</span>';
      }

      // Recarregar modal após 1 segundo
      setTimeout(() => {
        const modalBody = document.getElementById('modalBody');
        if (modalBody) {
          modalBody.innerHTML = getNotificationConfigHTML('whatsapp');
          loadPlatforms();
        }
      }, 1000);
    } catch (error) {
      if (statusMessage) {
        statusMessage.style.display = 'block';
        statusMessage.style.background = '#fee2e2';
        statusMessage.style.borderColor = '#ef4444';
        statusMessage.innerHTML = '<span style="color: #991b1b;"><i class="fas fa-exclamation-circle"></i> Erro ao cadastrar: ' + error.message + '</span>';
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-plus"></i> Cadastrar';
      }
    }
    
    return;
  }

  closeModal();
}

// Remover configuração do WhatsApp
async function removeWhatsAppConfig() {
  if (!confirm('Tem certeza que deseja remover a configuração do WhatsApp?')) {
    return;
  }
  
  try {
    const userData = await loadUserDataFromFirebase() || {};
    const integrationConfigs = userData.integrationConfigs || {};
    delete integrationConfigs.whatsapp;
    
    await saveUserDataToFirebase({
      integrationConfigs: integrationConfigs
    });
    
    // Atualizar cache (já atualizado automaticamente pelo saveUserDataToFirebase via write-through)
    // Mas garantir que está sincronizado
    dataCache.integrationConfigs = integrationConfigs;
    
    // Recarregar modal
    const modalBody = document.getElementById('modalBody');
    if (modalBody) {
      modalBody.innerHTML = getNotificationConfigHTML('whatsapp');
      setTimeout(() => {
        const form = document.getElementById('notificationConfigForm');
        if (form) {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleNotificationConfig('whatsapp', e);
          });
        }
      }, 100);
    }
    
    loadPlatforms();
  } catch (error) {
    alert('Erro ao remover configuração: ' + error.message);
  }
}

// Mostrar formulário para editar configuração
function showWhatsAppConfigInput() {
  // Limpar cache local (não remover do Firebase, apenas mostrar formulário)
  const integrationConfigs = CacheManager.get('integrationConfigs') || {};
  if (integrationConfigs.whatsapp) {
    delete integrationConfigs.whatsapp;
    dataCache.integrationConfigs = integrationConfigs;
  }
  
  // Recarregar modal
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    modalBody.innerHTML = getNotificationConfigHTML('whatsapp');
    setTimeout(() => {
      const form = document.getElementById('notificationConfigForm');
      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          handleNotificationConfig('whatsapp', e);
        });
      }
    }, 100);
  }
}

// Resetar formulários
function resetProfileForm() {
  document.getElementById('profileName').value = currentUser.displayName;
}

function resetPasswordForm() {
  document.getElementById('passwordForm').reset();
}

// Toggle User Menu
function toggleUserMenu() {
  const menu = document.getElementById('userMenuDropdown');
  const btn = document.getElementById('userMenuBtn');
  if (menu && btn) {
    const isActive = menu.classList.contains('active');
    if (isActive) {
      closeUserMenu();
    } else {
      // Calcular posição do dropdown baseado no botão
      const btnRect = btn.getBoundingClientRect();
      menu.style.top = `${btnRect.bottom + 8}px`;
      menu.style.right = `${window.innerWidth - btnRect.right}px`;
      
      menu.classList.add('active');
      btn.classList.add('active');
    }
  }
}

function closeUserMenu() {
  const menu = document.getElementById('userMenuDropdown');
  const btn = document.getElementById('userMenuBtn');
  if (menu) menu.classList.remove('active');
  if (btn) btn.classList.remove('active');
}

// Fechar menu ao clicar fora
document.addEventListener('click', (e) => {
  const menu = document.getElementById('userMenuDropdown');
  const btn = document.getElementById('userMenuBtn');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    closeUserMenu();
  }
});

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
          const notificationConfigs = dataCache.notificationConfigs || {};
          
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

async function initTheme() {
  // Carregar do localStorage primeiro (rápido)
  let savedTheme = localStorage.getItem('theme') || 'light';
  
  // Sincronizar com Firebase em background (atualiza se houver diferença)
  if (currentUser && currentUser.uid) {
    try {
      const userData = await loadUserDataFromFirebase();
      if (userData && userData.theme) {
        // Se Firebase tem tema diferente, usar o do Firebase (é a fonte da verdade)
        if (userData.theme !== savedTheme) {
          savedTheme = userData.theme;
          localStorage.setItem('theme', savedTheme);
        }
      }
    } catch (error) {
      // Ignorar erros silenciosamente, usar localStorage
    }
  }
  
  // Aplicar tema (já está no localStorage, então próxima carga será instantânea)
  setTheme(savedTheme);
}

async function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  
  // Salvar no localStorage imediatamente (para próxima carga ser instantânea)
  localStorage.setItem('theme', theme);
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (theme === 'dark') {
      themeIcon.className = 'fas fa-sun';
    } else {
      themeIcon.className = 'fas fa-moon';
    }
  }
  
  // Salvar no Firebase em background (não bloquear UI)
  if (currentUser && currentUser.uid) {
    saveUserDataToFirebase({ theme }).catch(() => {
      // Ignorar erros silenciosamente
    });
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

// Fechar sidebar ao clicar em um item do menu (mobile)
document.addEventListener('DOMContentLoaded', function() {
  const menuItems = document.querySelectorAll('.menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', function() {
      // Fechar sidebar no mobile após seleção
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          const sidebar = document.querySelector('.sidebar');
          const overlay = document.querySelector('.sidebar-overlay');
          const mobileToggle = document.getElementById('mobileMenuToggle');
          const body = document.body;
          
          if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            if (body) body.style.overflow = '';
            
            if (mobileToggle) {
              mobileToggle.classList.remove('active');
              const icon = mobileToggle.querySelector('i');
              if (icon) icon.className = 'fas fa-bars';
            }
          }
        }, 300);
      }
    });
  });

  // Fechar sidebar ao redimensionar para desktop
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const mobileToggle = document.getElementById('mobileMenuToggle');
        const body = document.body;
        
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (body) body.style.overflow = '';
        
        if (mobileToggle) {
          mobileToggle.classList.remove('active');
          const icon = mobileToggle.querySelector('i');
          if (icon) icon.className = 'fas fa-bars';
        }
      }
    }, 250);
  });
});

// ==================== TELEGRAM MANAGEMENT ====================

// Helper para criar timeout (compatibilidade com navegadores antigos)
function createTimeoutSignal(ms) {
  const controller = new AbortController();
  if (AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// Configuração das APIs
const API_CONFIG = {
  telegram: {
    url: TELEGRAM_API_URL,
    name: 'Telegram',
    folder: 'telegram',
    port: '3003',
    endpoints: ['/health', '/']
  },
  botfather: {
    url: BOTFATHER_API_URL,
    name: 'BotFather',
    folder: 'botfather',
    port: '3001',
    endpoints: ['/health', '/']
  },
  deepseek: {
    url: DEEPSEEK_API_URL,
    name: 'DeepSeek',
    folder: 'deepseek',
    port: '3002',
    endpoints: ['/']
  }
};

// Cache para evitar múltiplas tentativas quando API não está disponível
const apiCache = {};
const API_CHECK_INTERVAL = 30000; // Verificar novamente após 30 segundos

// Função genérica para verificar status de qualquer API
async function checkApiStatus(apiKey) {
  const config = API_CONFIG[apiKey];
  if (!config) return false;
  
  const now = Date.now();
  const cacheKey = `${apiKey}Unavailable`;
  const lastCheckKey = `last${apiKey}Check`;
  
  // Se já sabemos que a API não está disponível e foi verificado recentemente, não tentar novamente
  if (apiCache[cacheKey] && (now - (apiCache[lastCheckKey] || 0)) < API_CHECK_INTERVAL) {
    return false;
  }
  
  // Tentar cada endpoint configurado
  for (const endpoint of config.endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const response = await fetch(`${config.url}${endpoint}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
        cache: 'no-cache'
      }).catch(() => {
        clearTimeout(timeoutId);
        return null;
      });
      
      clearTimeout(timeoutId);
      
      if (response && response.ok) {
        const data = await response.json().catch(() => ({}));
        // Verificar se a resposta indica sucesso
        if (data.status === 'ok' || data.success === true || response.status === 200) {
          apiCache[cacheKey] = false;
          apiCache[lastCheckKey] = now;
          return true;
        }
      }
    } catch (error) {
      // Erro silencioso - tentar próximo endpoint
      continue;
    }
  }
  
  // Marcar como indisponível
  apiCache[cacheKey] = true;
  apiCache[lastCheckKey] = now;
  return false;
}

// Funções específicas para compatibilidade
// Funções de compatibilidade (mantidas para não quebrar código existente)
async function checkTelegramApiStatus() { return checkApiStatus('telegram'); }
async function checkBotFatherApiStatus() { return checkApiStatus('botfather'); }
async function checkDeepSeekApiStatus() { return checkApiStatus('deepseek'); }

// Cores dos gradientes para cada API
const API_GRADIENTS = {
  telegram: 'linear-gradient(135deg, #0088cc 0%, #229ED9 100%)',
  botfather: 'linear-gradient(135deg, #0088cc 0%, #0066aa 100%)',
  deepseek: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
};

// Função genérica para mostrar loading
function showApiLoadingModal(modalBody, apiKey) {
  const gradient = API_GRADIENTS[apiKey] || API_GRADIENTS.telegram;
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem;">
      <div style="width: 60px; height: 60px; margin: 0 auto 1.5rem; background: ${gradient}; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
        <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: white;"></i>
      </div>
      <p style="color: var(--text-light); font-size: 0.9rem; margin: 0;">Carregando configurações...</p>
    </div>
  `;
}

// Função para tentar novamente com loading
async function retryApiCheck(apiKey) {
  const modal = document.getElementById('platformModal');
  const modalBody = document.getElementById('modalBody');
  if (!modal || !modalBody) return;
  
  // Mostrar loading
  showApiLoadingModal(modalBody, apiKey);
  
  // Limpar cache da API para forçar nova verificação
  const cacheKey = `${apiKey}Unavailable`;
  const lastCheckKey = `last${apiKey}Check`;
  apiCache[cacheKey] = false;
  apiCache[lastCheckKey] = 0;
  
  // Aguardar um pouco antes de verificar (para dar tempo do servidor iniciar)
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Verificar novamente
  await openPlatformConfig(apiKey);
}

// Exportar para uso no HTML
window.retryApiCheck = retryApiCheck;

// Função genérica para mostrar modal de erro de API (simplificado)
function showApiUnavailableModal(modalBody, apiKey) {
  const config = API_CONFIG[apiKey];
  if (!config) return;
  
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 3rem 2rem;">
      <div style="color: var(--accent-color); font-size: 3rem; margin-bottom: 1.5rem;">⚠️</div>
      <h3 style="color: var(--text-dark); margin-bottom: 2rem; font-size: 1.25rem;">API ${config.name} não está disponível</h3>
      <div style="display: flex; gap: 0.75rem; justify-content: center;">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">Fechar</button>
        <button type="button" class="btn btn-primary" onclick="retryApiCheck('${apiKey}')">Tentar Novamente</button>
      </div>
    </div>
  `;
}


// Variável global para armazenar sessionId durante verificação
let pendingTelegramSessionId = null;
let pendingTelegramPhone = null;

// Mostrar modal de código do Telegram
function showTelegramCodeModal(sessionId, phone, isWaiting = false) {
  pendingTelegramSessionId = sessionId;
  pendingTelegramPhone = phone;
  
  const modal = document.getElementById('telegramCodeModal');
  const codeInput = document.getElementById('telegramVerificationCode');
  const modalBody = modal?.querySelector('.modal-body');
  
  if (modal) {
    modal.classList.add('active');
    // Fechar modal de configuração principal
    document.getElementById('platformModal')?.classList.remove('active');
    
    // Atualizar mensagem no modal
    const messageElement = document.getElementById('telegramCodeMessage');
    if (messageElement) {
      if (isWaiting) {
        // Mostrar mensagem de aguardando SMS
        messageElement.innerHTML = `
          <strong style="color: var(--text-dark);">Aguardando SMS...</strong><br>
          <span style="color: var(--text-light); font-size: 0.9rem;">Enviando código SMS para ${phone}. Aguarde alguns segundos...</span>
        `;
        // Desabilitar input enquanto aguarda
        if (codeInput) {
          codeInput.disabled = true;
          codeInput.placeholder = 'Aguardando SMS...';
        }
      } else {
        // Mostrar mensagem normal quando SMS já foi enviado
        messageElement.innerHTML = `
          <strong style="color: var(--text-dark);">Código enviado para ${phone}</strong><br>
          <span style="color: var(--text-light); font-size: 0.9rem;">Verifique as mensagens do Telegram no seu celular e digite o código abaixo:</span>
        `;
        // Habilitar input
        if (codeInput) {
          codeInput.disabled = false;
          codeInput.placeholder = '12345';
        }
      }
    }
    
    // Focar no input após animação (apenas se não estiver aguardando)
    if (!isWaiting) {
      setTimeout(() => {
        if (codeInput) {
          codeInput.focus();
          codeInput.value = '';
        }
      }, 300);
    }
  }
}

// Fechar modal de código
function closeTelegramCodeModal() {
  const modal = document.getElementById('telegramCodeModal');
  if (modal) {
    modal.classList.remove('active');
  }
  pendingTelegramSessionId = null;
  pendingTelegramPhone = null;
}

// Verificar código do Telegram
async function handleVerifyTelegramCode(e) {
  e.preventDefault();
  
  if (!pendingTelegramSessionId) {
    alert('Erro: Sessão não encontrada. Tente adicionar a conta novamente.');
    return;
  }
  
  const code = document.getElementById('telegramVerificationCode').value.trim();
  if (!code) {
    alert('Digite o código de verificação');
    return;
  }
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
  
  try {
    // Verificar código
    const verifyResponse = await fetch(`${TELEGRAM_API_URL}/api/sessions/${pendingTelegramSessionId}/verify`, {
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
      // Conta verificada com sucesso - salvar no Firebase
      // Buscar dados da conta do cache ou Firebase
      const telegramConfig = dataCache.telegramAccount || {};
      if (telegramConfig.phone && telegramConfig.apiId && telegramConfig.apiHash) {
        // Preparar dados da conta verificada (OTIMIZADO - apenas campos essenciais)
        const verifiedAccountData = {
          phone: telegramConfig.phone,
          apiId: telegramConfig.apiId,
          apiHash: telegramConfig.apiHash,
          sessionId: telegramConfig.sessionId,
          sessionString: verifyData.sessionString
        };
        
        // Salvar no Firebase
        await saveTelegramAccountToFirebase(verifiedAccountData);
        
        // Cache já foi atualizado automaticamente pelo saveTelegramAccountToFirebase (write-through)
        // Invalidar cache de sincronização para forçar refresh
        syncCache = null;
        syncCacheTime = 0;
        invalidateCache('telegramAccount');
      }
      
      // Mostrar animação de sucesso no modal
      const modal = document.getElementById('telegramCodeModal');
      const modalBody = modal?.querySelector('.modal-body');
      if (modalBody) {
        modalBody.innerHTML = `
          <div style="text-align: center; padding: 3rem 2rem;">
            <div style="width: 100px; height: 100px; margin: 0 auto 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4); animation: scaleIn 0.5s ease-out, pulse 2s infinite 0.5s;">
              <i class="fas fa-check" style="font-size: 3rem; color: white; animation: checkmark 0.6s ease-out 0.3s both;"></i>
            </div>
            <h2 style="color: var(--text-dark); margin: 0 0 1rem 0; font-size: 1.75rem; font-weight: 700; animation: fadeInUp 0.6s ease-out 0.2s both;">
              ✅ Conta Verificada!
            </h2>
            <p style="color: var(--text-light); font-size: 1rem; margin: 0 0 2rem 0; animation: fadeInUp 0.6s ease-out 0.4s both;">
              Sua conta do Telegram foi adicionada e verificada com sucesso!
            </p>
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: var(--text-light); font-size: 0.9rem; animation: fadeInUp 0.6s ease-out 0.6s both;">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Atualizando...</span>
            </div>
          </div>
          <style>
            @keyframes scaleIn {
              from {
                transform: scale(0);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.05);
              }
            }
            @keyframes checkmark {
              0% {
                transform: scale(0) rotate(45deg);
                opacity: 0;
              }
              50% {
                transform: scale(1.2) rotate(45deg);
              }
              100% {
                transform: scale(1) rotate(0deg);
                opacity: 1;
              }
            }
            @keyframes fadeInUp {
              from {
                transform: translateY(20px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          </style>
        `;
      }
      
      // Aguardar 1.5 segundos para mostrar animação, depois atualizar tudo IMEDIATAMENTE
      setTimeout(async () => {
        closeTelegramCodeModal();
        
        // FORÇAR REFRESH - recarregar dados do Firebase (ignorando cache)
        await loadTelegramAccountFromFirebase(true); // true = forceRefresh
        
        // Atualizar status no dashboard IMEDIATAMENTE (antes de reabrir modal)
        await checkTelegramAccountSync(true); // true = forceRefresh
        
        // Recarregar plataformas para atualizar status no dashboard
        await loadPlatforms();
        
        // Reabrir modal de configuração do Telegram (já com dados atualizados)
        openPlatformConfig('telegram');
      }, 1500);
    } else {
      throw new Error(verifyData.error || 'Código inválido');
    }
  } catch (error) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalText;
    
    if (error.name === 'AbortError') {
      alert('⏱️ Tempo esgotado. Tente novamente.');
    } else {
      alert('❌ Erro ao verificar código: ' + error.message);
      // Limpar input para tentar novamente
      document.getElementById('telegramVerificationCode').value = '';
      document.getElementById('telegramVerificationCode').focus();
    }
  }
}

// Cache para sincronização
let syncCache = null;
let syncCacheTime = 0;
const SYNC_CACHE_TTL = 10000; // 10 segundos

// Verificar se tem conta no Firebase (OTIMIZADO - usa apenas Firebase para status)
async function checkTelegramAccountSync(forceRefresh = false) {
  // Verificar cache
  const now = Date.now();
  if (!forceRefresh && syncCache && (now - syncCacheTime) < SYNC_CACHE_TTL) {
    return syncCache;
  }
  
  let hasFirebaseAccount = false;
  let firebaseAccount = null;
  
  // Verificar apenas Firebase
  if (currentUser && currentUser.uid && window.firebaseDb) {
    try {
      const cachedAccount = dataCache.telegramAccount;
      if (!forceRefresh && cachedAccount && Object.keys(cachedAccount).length > 0) {
        firebaseAccount = cachedAccount;
        hasFirebaseAccount = !!(firebaseAccount.phone && firebaseAccount.apiId && firebaseAccount.sessionString);
      } else {
        const accountData = await loadUserDataFromFirebase().then(data => data?.telegramAccount || null);
        if (accountData) {
          dataCache.telegramAccount = accountData;
          firebaseAccount = accountData;
          hasFirebaseAccount = !!(firebaseAccount.phone && firebaseAccount.apiId && firebaseAccount.sessionString);
        }
      }
    } catch (error) {
      // Ignorar erros
      console.error('Erro ao verificar conta do Telegram:', error);
    }
  }
  
  const result = {
    isActive: hasFirebaseAccount, // Ativo se tiver no Firebase com sessionString (conta verificada)
    hasFirebaseAccount,
    firebaseAccount
  };
  
  // Atualizar cache
  syncCache = result;
  syncCacheTime = now;
  
  return result;
}

// Alias para compatibilidade - verifica apenas Firebase
async function checkTelegramAccountFromFirebase(forceRefresh = false) {
  const result = await checkTelegramAccountSync(forceRefresh);
  return {
    hasAccount: result.hasFirebaseAccount,
    firebaseAccount: result.firebaseAccount
  };
}

// Carregar conta do Telegram do Firebase
async function loadTelegramAccountFromFirebase(forceRefresh = false) {
  if (!currentUser || !currentUser.uid) {
    return;
  }
  
  const cachedAccount = dataCache.telegramAccount;
  if (!forceRefresh && cachedAccount && Object.keys(cachedAccount).length > 0) {
    // Usar cache - apenas atualizar HTML se necessário
    const container = document.getElementById('telegramConfigContainer');
    if (container) {
      container.innerHTML = getTelegramConfigHTML().match(/<div id="telegramConfigContainer">([\s\S]*)<\/div>/)?.[1] || '';
    }
    return;
  }
  
  try {
    // Verificar apenas Firebase (muito mais leve) - forçar refresh se necessário
    const accountStatus = await checkTelegramAccountFromFirebase(forceRefresh);
    
    if (accountStatus.hasAccount && accountStatus.firebaseAccount) {
      dataCache.telegramAccount = accountStatus.firebaseAccount;
    } else {
      // Limpar cache se não tiver conta
      dataCache.telegramAccount = {};
    }
    
    // Recarregar o HTML do modal
    const container = document.getElementById('telegramConfigContainer');
    if (container) {
      container.innerHTML = getTelegramConfigHTML().match(/<div id="telegramConfigContainer">([\s\S]*)<\/div>/)?.[1] || '';
    }
  } catch (error) {
    // Se der erro, limpar cache e mostrar formulário vazio
    dataCache.telegramAccount = {};
    const container = document.getElementById('telegramConfigContainer');
    if (container) {
      container.innerHTML = getTelegramConfigHTML().match(/<div id="telegramConfigContainer">([\s\S]*)<\/div>/)?.[1] || '';
    }
  }
}

// ===== FUNÇÕES DE FIREBASE FIRESTORE =====

// Salvar dados do usuário no Firestore (OTIMIZADO para alta concorrência)
async function saveUserDataToFirebase(data) {
  if (!currentUser || !currentUser.uid) {
    throw new Error('Usuário não autenticado. Faça login para salvar dados.');
  }
  
  if (!window.firebaseDb) {
    throw new Error('Firestore não está disponível. Verifique sua conexão.');
  }
  
  try {
    const docRef = window.firebaseDb.collection('users').doc(currentUser.uid);
    // Usar set com merge para operação atômica e mais rápida
    // Não incluir updatedAt se não for necessário (reduz tamanho da operação)
    const updateData = { ...data };
    if (!updateData.updatedAt) {
      updateData.updatedAt = new Date().toISOString();
    }
    await docRef.set(updateData, { merge: true });
  } catch (error) {
    if (error.code === 'not-found' || error.message.includes('does not exist')) {
      throw new Error('Firestore não está configurado. Configure o banco de dados no Firebase Console.');
    }
    // Retry automático para erros temporários (importante para alta concorrência)
    if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
      // Tentar novamente uma vez após 500ms
      await new Promise(resolve => setTimeout(resolve, 500));
      const docRef = window.firebaseDb.collection('users').doc(currentUser.uid);
      await docRef.set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return;
    }
    throw error;
  }
}

// Carregar dados do usuário do Firestore (OTIMIZADO com timeout)
async function loadUserDataFromFirebase() {
  if (!currentUser || !currentUser.uid) {
    return null;
  }
  
  if (!window.firebaseDb) {
    return null;
  }
  
  try {
    const docRef = window.firebaseDb.collection('users').doc(currentUser.uid);
    // Usar getSource para melhor performance (não recarrega se já estiver em cache)
    const doc = await Promise.race([
      docRef.get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
    ]);
    if (doc.exists) {
      return doc.data();
    }
    return null;
  } catch (error) {
    // Em caso de erro, retornar null silenciosamente (cache será usado)
    // Ignorar erros silenciosamente
    return null;
  }
}

// Salvar conta do Telegram no Firebase (com write-through cache)
async function saveTelegramAccountToFirebase(accountData) {
  await saveUserDataToFirebase({
    telegramAccount: accountData
  });
  dataCache.telegramAccount = accountData;
  // Invalidar cache de sincronização
  syncCache = null;
  syncCacheTime = 0;
}

// Salvar configuração de integração (DeepSeek, WhatsApp, etc.) - com write-through cache
async function saveIntegrationConfigToFirebase(integrationId, config) {
  let integrationConfigs = dataCache.integrationConfigs || {};
  if (!integrationConfigs || Object.keys(integrationConfigs).length === 0) {
    const userData = await loadUserDataFromFirebase() || {};
    integrationConfigs = userData.integrationConfigs || {};
  }
  
  integrationConfigs[integrationId] = config;
  await saveUserDataToFirebase({ integrationConfigs });
  dataCache.integrationConfigs = integrationConfigs;
}

// Carregar configuração de integração
async function loadIntegrationConfigFromFirebase(integrationId) {
  const userData = await loadUserDataFromFirebase();
  if (userData && userData.integrationConfigs) {
    return userData.integrationConfigs[integrationId] || null;
  }
  return null;
}

// Carregar todas as configurações de integrações
async function loadAllIntegrationConfigsFromFirebase() {
  const userData = await loadUserDataFromFirebase();
  if (userData && userData.integrationConfigs) {
    return userData.integrationConfigs;
  }
  return {};
}

// Salvar configuração de notificação - com write-through cache
async function saveNotificationConfigToFirebase(type, config) {
  let notificationConfigs = dataCache.notificationConfigs || {};
  if (!notificationConfigs || Object.keys(notificationConfigs).length === 0) {
    const userData = await loadUserDataFromFirebase() || {};
    notificationConfigs = userData.notificationConfigs || {};
  }
  
  notificationConfigs[type] = config;
  await saveUserDataToFirebase({ notificationConfigs });
  dataCache.notificationConfigs = notificationConfigs;
}

// Carregar configuração de notificação
async function loadNotificationConfigFromFirebase(type) {
  const userData = await loadUserDataFromFirebase();
  if (userData && userData.notificationConfigs) {
    return userData.notificationConfigs[type] || null;
  }
  return null;
}

// Carregar todas as configurações de notificações
async function loadAllNotificationConfigsFromFirebase() {
  const userData = await loadUserDataFromFirebase();
  if (userData && userData.notificationConfigs) {
    return userData.notificationConfigs;
  }
  return {};
}

// Abrir modal de confirmação para remover Telegram
function abrirConfirmacaoRemoverTelegram() {
  showRemoveConfirmationModal(
    'Tem certeza que deseja remover a conta do Telegram?<br>Esta ação desativará a integração e não pode ser desfeita.',
    'voltarTelegramConfig()',
    'confirmarRemoverTelegramAccount()'
  );
}

function voltarTelegramConfig() {
  const modalBody = document.getElementById('modalBody');
  if (!modalBody) return;
  loadTelegramAccountFromFirebase(true).then(() => {
    modalBody.innerHTML = getTelegramConfigHTML();
  });
}

// Confirmar remoção da conta do Telegram
async function confirmarRemoverTelegramAccount() {
  if (!currentUser || !currentUser.uid) {
    alert('Usuário não autenticado.');
    return;
  }
  
  if (!window.firebaseDb) {
    alert('Firestore não está disponível.');
    return;
  }
  
  // Mostrar loading imediatamente
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    showLoadingAnimation('Removendo conta...', '#0088cc');
  }
  
  try {
    // Executar operações em paralelo para maior velocidade
    const [apiResult] = await Promise.allSettled([
      // Remover sessões deste cliente específico da API (usando userId/email como ID único)
      fetch(`${TELEGRAM_API_URL}/api/sessions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.uid,
          email: currentUser?.email
        }),
        signal: createTimeoutSignal(5000)
      }).catch(() => {}) // Ignorar erros se a sessão já não existir
    ]);
    
    // Remover do Firebase (operação mais rápida possível)
    const docRef = window.firebaseDb.collection('users').doc(currentUser.uid);
    await docRef.update({
      telegramAccount: null,
      updatedAt: new Date().toISOString()
    });
    
    // Limpar cache imediatamente (sem esperar)
    dataCache.telegramAccount = {};
    
    // Mostrar mensagem de sucesso
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); animation: scaleIn 0.5s ease-out;">
            <i class="fas fa-check" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">✅ Removido com sucesso!</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">A conta do Telegram foi removida</p>
          <button type="button" class="btn btn-primary" onclick="closeModal(); loadPlatformsDebounced();" style="padding: 0.75rem 2rem;">
            Fechar
          </button>
        </div>
        <style>
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `;
    }
    
    // Atualizar plataformas (com debounce para evitar múltiplas chamadas)
    loadPlatformsDebounced();
  } catch (error) {
    if (modalBody) {
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 3rem 2rem;">
          <div style="width: 80px; height: 80px; margin: 0 auto 2rem; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);">
            <i class="fas fa-times" style="font-size: 2rem; color: white;"></i>
          </div>
          <h3 style="margin: 0 0 0.5rem 0; color: var(--text-dark); font-size: 1.25rem;">❌ Erro ao remover</h3>
          <p style="color: var(--text-light); margin: 0 0 2rem 0; font-size: 0.9rem;">${error.message}</p>
          <button type="button" class="btn btn-primary" onclick="voltarTelegramConfig()" style="padding: 0.75rem 2rem;">
            Voltar
          </button>
        </div>
      `;
    }
  }
}

// Mostrar formulário para trocar conta
function showTelegramAccountInput() {
  // Não limpar cache aqui - manter dados para possível reuso
  // Cache será atualizado quando nova conta for salva
  
  // Recarregar o modal
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    modalBody.innerHTML = getTelegramConfigHTML();
    setTimeout(() => {
      const form = document.getElementById('telegramConfigForm');
      if (form) {
        // Não precisa de listener, já está usando onclick
      }
    }, 100);
  }
}

// Função auxiliar para validar formato de telefone
function validatePhoneNumber(phone) {
  if (!phone) return { valid: false, error: 'Telefone é obrigatório' };
  // Remove espaços e caracteres especiais
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Deve começar com + e ter pelo menos 10 dígitos
  if (!cleaned.startsWith('+')) {
    return { valid: false, error: 'Telefone deve começar com + (ex: +5511999999999)' };
  }
  // Deve ter entre 10 e 15 dígitos após o +
  const digits = cleaned.substring(1);
  if (digits.length < 10 || digits.length > 15 || !/^\d+$/.test(digits)) {
    return { valid: false, error: 'Telefone inválido. Use o formato: +5511999999999' };
  }
  return { valid: true };
}

// Função auxiliar para validar credenciais
function validateCredentials(apiId, apiHash) {
  // Validar API_ID
  const apiIdNum = parseInt(apiId);
  if (isNaN(apiIdNum) || apiIdNum <= 0) {
    return { valid: false, error: 'API_ID deve ser um número válido maior que zero' };
  }
  
  // Validar API_HASH (deve ter pelo menos 20 caracteres)
  if (!apiHash || typeof apiHash !== 'string' || apiHash.length < 20) {
    return { valid: false, error: 'API_HASH inválido. Deve ter pelo menos 20 caracteres' };
  }
  
  return { valid: true };
}

// Adicionar conta do Telegram (nova versão)
async function addTelegramAccount() {
  // Usar email do usuário como identificador único
  const name = currentUser?.email || currentUser?.displayName || 'Usuario';
  const phone = document.getElementById('telegramPhone')?.value.trim();
  const apiId = document.getElementById('telegramApiId')?.value.trim();
  const apiHash = document.getElementById('telegramApiHash')?.value.trim();
  const submitBtn = document.getElementById('addTelegramAccountBtn');
  const statusMessage = document.getElementById('telegramStatusMessage');
  
  if (!phone || !apiId || !apiHash) {
    showTelegramStatusMessage('Preencha todos os campos obrigatórios', 'error');
    return;
  }
  
  // Validar formato do telefone ANTES de chamar a API
  const phoneValidation = validatePhoneNumber(phone);
  if (!phoneValidation.valid) {
    showTelegramStatusMessage(phoneValidation.error, 'error');
    return;
  }
  
  // Validar credenciais ANTES de chamar a API
  const credentialsValidation = validateCredentials(apiId, apiHash);
  if (!credentialsValidation.valid) {
    showTelegramStatusMessage(credentialsValidation.error, 'error');
    return;
  }
  
  // Fechar modal de configuração e abrir modal de código IMEDIATAMENTE
  document.getElementById('platformModal')?.classList.remove('active');
  
  // Abrir modal de código com mensagem "Aguardando SMS..."
  showTelegramCodeModal(null, phone, true); // true = aguardando SMS
  
  // Desabilitar botão (se ainda estiver visível)
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando código SMS...';
  }
  hideTelegramStatusMessage();
  
  try {
    // Verificar se a API está disponível
    const isApiAvailable = await checkTelegramApiStatus();
    if (!isApiAvailable) {
      // Fechar modal de código e mostrar erro
      closeTelegramCodeModal();
      showTelegramStatusMessage('⚠️ API do Telegram não está disponível! A API precisa estar rodando em: ' + TELEGRAM_API_URL, 'error');
      // Reabrir modal de configuração
      document.getElementById('platformModal')?.classList.add('active');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Conta';
      }
      return;
    }

    // Verificar se já existe conta no Firebase e remover antes de adicionar nova
    const existingAccount = await checkTelegramAccountFromFirebase();
    if (existingAccount.hasAccount) {
      // Remover do Firebase
      if (currentUser && currentUser.uid && window.firebaseDb) {
        try {
          const docRef = window.firebaseDb.collection('users').doc(currentUser.uid);
          await docRef.update({
            telegramAccount: null,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          // Ignorar
        }
      }
      dataCache.telegramAccount = {};
      
      // Remover da API também (só quando for adicionar nova conta) - deletar apenas deste cliente
      try {
        await fetch(`${TELEGRAM_API_URL}/api/sessions`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: currentUser?.uid,
            email: currentUser?.email
          }),
          signal: createTimeoutSignal(5000)
        }).catch(() => {});
      } catch (e) {
        // Ignorar
      }
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
      const errorMessage = errorData.error || `Erro HTTP ${response.status}`;
      
      // Verificar se é erro de conta já existente
      if (errorMessage.includes('Já existe uma conta')) {
        showTelegramStatusMessage('⚠️ ' + errorMessage, 'warning');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Conta';
        }
        return;
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Preparar dados da conta (OTIMIZADO - apenas campos essenciais)
      const accountData = {
        phone,
        apiId,
        apiHash,
        sessionId: data.sessionId
      };
      
      // Salvar no cache primeiro (para uso durante verificação)
      dataCache.telegramAccount = accountData;
      
      // Salvar dados no Firebase (sem sessionString ainda, será salvo após verificação)
      // Usar email como identificador único
      await saveTelegramAccountToFirebase(accountData);
      
      // Atualizar modal de código para mostrar que SMS foi enviado
      showTelegramCodeModal(data.sessionId, phone, false); // false = SMS já enviado
      
      // Resetar botão (se ainda estiver visível)
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Conta';
      }
      hideTelegramStatusMessage();
    } else {
      showTelegramStatusMessage('❌ Erro ao criar sessão: ' + (data.error || 'Erro desconhecido'), 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Conta';
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      showTelegramStatusMessage('⏱️ Timeout ao conectar com a API do Telegram. Verifique se a API está rodando e tente novamente.', 'error');
    } else if (error.message.includes('Failed to fetch')) {
      showTelegramStatusMessage('❌ Não foi possível conectar com a API do Telegram. Verifique se a API está rodando em: ' + TELEGRAM_API_URL, 'error');
    } else {
      showTelegramStatusMessage('❌ Erro ao adicionar conta: ' + error.message, 'error');
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Conta';
    }
  }
}


// Mostrar mensagem de status do Telegram
function showTelegramStatusMessage(message, type = 'info') {
  const statusMessage = document.getElementById('telegramStatusMessage');
  if (!statusMessage) return;
  
  statusMessage.style.display = 'block';
  
  const colors = {
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46', icon: 'fa-check-circle' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', icon: 'fa-exclamation-circle' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', icon: 'fa-exclamation-triangle' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', icon: 'fa-info-circle' }
  };
  
  const style = colors[type] || colors.info;
  
  statusMessage.style.background = style.bg;
  statusMessage.style.borderColor = style.border;
  statusMessage.style.color = style.text;
  statusMessage.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <i class="fas ${style.icon}" style="font-size: 1.1rem;"></i>
      <span style="flex: 1; font-size: 0.9rem; line-height: 1.5;">${message}</span>
    </div>
  `;
}

// Esconder mensagem de status do Telegram
function hideTelegramStatusMessage() {
  const statusMessage = document.getElementById('telegramStatusMessage');
  if (statusMessage) {
    statusMessage.style.display = 'none';
  }
}

// Exportar funções globalmente (apenas as necessárias)
window.toggleApiKeyVisibility = toggleApiKeyVisibility;
window.cadastrarDeepSeek = cadastrarDeepSeek;
window.voltarFormularioDeepSeek = voltarFormularioDeepSeek;
window.abrirConfirmacaoRemoverDeepSeek = abrirConfirmacaoRemoverDeepSeek;
window.voltarDeepSeekConfig = voltarDeepSeekConfig;
window.confirmarRemoverDeepSeek = confirmarRemoverDeepSeek;
window.showDeepSeekApiKeyInput = showDeepSeekApiKeyInput;
window.showBotFatherConfigInput = showBotFatherConfigInput;
window.showTelegramAccountInput = showTelegramAccountInput;
window.abrirConfirmacaoRemoverBotFather = abrirConfirmacaoRemoverBotFather;
window.voltarBotFatherConfig = voltarBotFatherConfig;
window.confirmarRemoverBotFather = confirmarRemoverBotFather;
window.abrirConfirmacaoRemoverTelegram = abrirConfirmacaoRemoverTelegram;
window.voltarTelegramConfig = voltarTelegramConfig;
window.confirmarRemoverTelegramAccount = confirmarRemoverTelegramAccount;

