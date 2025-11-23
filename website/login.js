// Sistema de Login com Firebase Authentication - PromoBOT
// Autenticação real com Firebase (Email/Senha e Google OAuth)

class FirebaseAuthSystem {
  constructor() {
    this.auth = window.firebaseAuth;
    this.provider = null;
    this.currentStep = 'login';
    this.init();
  }

  init() {
    // Aguardar Firebase estar pronto antes de inicializar
    this.waitForFirebase().then(() => {
      this.setupGoogleProvider();
      this.setupEventListeners();
      this.checkAuthState();
      this.setupPasswordStrength();
      this.setupCodeInputs();
      // Verificar se há resultado de redirect (após login com Google)
      this.handleRedirectResult();
    });
  }

  async handleRedirectResult() {
    // Verificar se há resultado de redirect do Google
    if (this.auth && this.auth.getRedirectResult) {
      try {
        const result = await this.auth.getRedirectResult();
        if (result.user) {
          // Login bem-sucedido via redirect
          const user = result.user;
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified,
            photoURL: user.photoURL,
            provider: 'google'
          };
          localStorage.setItem('userData', JSON.stringify(userData));
          // Redirecionar para dashboard
          window.location.href = 'dashboard.html';
        }
      } catch (error) {
        // Ignorar erros de redirect (usuário pode não ter vindo de um redirect)
        if (error.code !== 'auth/operation-not-allowed' && 
            !error.message.includes('no pending')) {
          console.warn('Erro ao verificar redirect result:', error);
        }
      }
    }
  }

  async waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = setInterval(() => {
        if (window.firebaseAuth || (typeof firebase !== 'undefined' && firebase.auth)) {
          if (!this.auth && window.firebaseAuth) {
            this.auth = window.firebaseAuth;
          }
          clearInterval(checkFirebase);
          resolve();
        }
      }, 100);

      // Timeout após 5 segundos
      setTimeout(() => {
        clearInterval(checkFirebase);
        resolve();
      }, 5000);
    });
  }

  setupGoogleProvider() {
    // Configurar Google Provider se Firebase estiver disponível
    if (typeof firebase !== 'undefined' && firebase.auth) {
      try {
        this.provider = new firebase.auth.GoogleAuthProvider();
        this.provider.addScope('profile');
        this.provider.addScope('email');
        this.provider.setCustomParameters({
          prompt: 'select_account'
        });
        console.log('✅ Google Provider configurado');
      } catch (error) {
        console.error('Erro ao configurar Google Provider:', error);
      }
    } else {
      // Tentar novamente após um delay
      setTimeout(() => this.setupGoogleProvider(), 500);
    }
  }

  setupEventListeners() {
    // Botões de navegação
    document.getElementById('showRegister')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showStep('register');
    });
    
    document.getElementById('showLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showStep('login');
    });
    
    document.getElementById('showForgotPassword')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showStep('forgot-password');
    });
    
    document.getElementById('backToLogin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showStep('login');
    });
    
    document.getElementById('backToLoginFromVerification')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showStep('login');
    });

    // Formulários
    document.getElementById('emailLoginForm')?.addEventListener('submit', (e) => this.handleEmailLogin(e));
    document.getElementById('emailRegisterForm')?.addEventListener('submit', (e) => this.handleEmailRegister(e));
    document.getElementById('resetPasswordForm')?.addEventListener('submit', (e) => this.handlePasswordReset(e));
    document.getElementById('emailVerificationForm')?.addEventListener('submit', (e) => this.handleEmailVerification(e));

    // Google OAuth
    document.getElementById('googleLogin')?.addEventListener('click', () => this.handleGoogleLogin());
    document.getElementById('googleRegister')?.addEventListener('click', () => this.handleGoogleRegister());

    // Toggle de visibilidade da senha
    document.querySelectorAll('.password-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => this.togglePasswordVisibility(e));
    });

    // Reenvio de código
    document.getElementById('resendCode')?.addEventListener('click', () => this.resendVerificationCode());
  }

  checkAuthState() {
    if (!this.auth || !this.auth.onAuthStateChanged) {
      return;
    }

    this.auth.onAuthStateChanged((user) => {
      if (user) {
        // Usuário já está logado, redirecionar
        if (window.location.pathname.includes('login.html')) {
          window.location.href = 'dashboard.html';
        }
      } else {
        // Usuário não está logado
        const sessionData = localStorage.getItem('userData');
        if (sessionData && window.location.pathname.includes('dashboard.html')) {
          // Sessão expirada, redirecionar para login
          localStorage.removeItem('userData');
          window.location.href = 'login.html';
        }
      }
    });
  }

  showStep(step) {
    // Esconder todos os formulários
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('verificationForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';

    // Remover instruções de reset se existirem
    const resetForm = document.getElementById('forgotPasswordForm');
    if (resetForm) {
      const instructions = resetForm.querySelector('.reset-instructions');
      if (instructions) {
        instructions.remove();
      }
    }

    // Mostrar formulário atual
    switch(step) {
      case 'login':
        document.getElementById('loginForm').style.display = 'block';
        // Verificar se há parâmetros na URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reset') === 'success') {
          this.showSuccess('Senha redefinida com sucesso! Faça login com sua nova senha.');
          // Limpar parâmetro da URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('verified') === 'success') {
          this.showSuccess('Email verificado com sucesso! Faça login para continuar.');
          // Limpar parâmetro da URL
          window.history.replaceState({}, document.title, window.location.pathname);
          // Limpar dados de verificação pendente
          localStorage.removeItem('pendingVerification');
          localStorage.removeItem('pendingVerificationEmail');
        }
        break;
      case 'register':
        document.getElementById('registerForm').style.display = 'block';
        break;
      case 'verification':
        document.getElementById('verificationForm').style.display = 'block';
        break;
      case 'forgot-password':
        document.getElementById('forgotPasswordForm').style.display = 'block';
        // Focar no campo de email
        setTimeout(() => {
          const resetEmail = document.getElementById('resetEmail');
          if (resetEmail) {
            resetEmail.focus();
          }
        }, 100);
        break;
    }

    this.currentStep = step;
    this.resetForms();
  }

  resetForms() {
    document.querySelectorAll('form').forEach(form => {
      form.reset();
    });
    this.clearCodeInputs();
    this.clearErrors();
  }

  clearErrors() {
    document.querySelectorAll('.error-message').forEach(error => {
      error.remove();
    });
  }

  async handleEmailLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    if (!this.validateEmail(email)) {
      this.showError('Por favor, insira um email válido');
      return;
    }

    if (!password || password.length < 6) {
      this.showError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    this.showLoading('Entrando...');

    try {
      if (!this.auth || !this.auth.signInWithEmailAndPassword) {
        console.error('Firebase Auth não disponível:', this.auth);
        throw new Error('Firebase não configurado. Configure suas credenciais em firebase-config.js');
      }

      console.log('Tentando fazer login com:', email);
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log('Login bem-sucedido! Usuário:', user.uid);

      // Recarregar dados do usuário para garantir que temos a versão mais recente
      await user.reload();
      const reloadedUser = this.auth.currentUser;

      // Salvar dados do usuário
      const userData = {
        uid: reloadedUser.uid,
        email: reloadedUser.email,
        displayName: reloadedUser.displayName || email.split('@')[0],
        emailVerified: reloadedUser.emailVerified,
        photoURL: reloadedUser.photoURL || null
      };

      localStorage.setItem('userData', JSON.stringify(userData));
      
      if (rememberMe) {
        localStorage.setItem('rememberedUser', JSON.stringify({ email, rememberMe: true }));
      }

      // Avisar se email não está verificado, mas permitir login
      if (!reloadedUser.emailVerified) {
        this.showSuccess('Login realizado! Mas seu email ainda não foi verificado.');
        // Oferecer reenviar email de verificação
        setTimeout(async () => {
          try {
            await reloadedUser.sendEmailVerification();
            this.showNotification('Email de verificação reenviado! Verifique sua caixa de entrada.', 'info');
          } catch (error) {
            console.error('Erro ao reenviar email:', error);
          }
        }, 2000);
      } else {
        this.showSuccess('Login realizado com sucesso!');
      }
      
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);

    } catch (error) {
      this.hideLoading();
      let errorMessage = 'Erro ao fazer login. Tente novamente.';
      
      switch(error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado. Verifique o email ou crie uma conta.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta. Verifique sua senha e tente novamente.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Verifique o formato do email.';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciais inválidas. Verifique seu email e senha. Se você esqueceu sua senha, use a opção "Esqueci minha senha".';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta conta foi desabilitada. Entre em contato com o suporte.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas falharam. Aguarde alguns minutos e tente novamente.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Método de login não permitido. Entre em contato com o suporte.';
          break;
        default:
          // Traduzir mensagens comuns do Firebase
          if (error.message && error.message.includes('invalid-credential')) {
            errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
          } else if (error.message && error.message.includes('wrong-password')) {
            errorMessage = 'Senha incorreta. Tente novamente ou use "Esqueci minha senha".';
          } else {
            errorMessage = error.message || 'Erro ao fazer login. Verifique suas credenciais e tente novamente.';
          }
      }
      
      this.showError(errorMessage);
    }
  }

  async handleEmailRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const acceptTerms = document.getElementById('acceptTerms')?.checked;

    // Validações
    if (!name || name.length < 2) {
      this.showError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('Por favor, insira um email válido');
      return;
    }

    if (password !== confirmPassword) {
      this.showError('As senhas não coincidem');
      return;
    }

    if (password.length < 8) {
      this.showError('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    if (!acceptTerms) {
      this.showError('Você deve aceitar os termos de uso');
      return;
    }

    this.showLoading('Criando conta...');

    try {
      if (!this.auth || !this.auth.createUserWithEmailAndPassword) {
        throw new Error('Firebase não configurado. Configure suas credenciais em firebase-config.js');
      }

      const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      // Atualizar perfil do usuário
      await user.updateProfile({
        displayName: name
      });

      // Configurar URL de redirecionamento para após verificação
      const currentUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      const actionCodeSettings = {
        url: currentUrl + 'login.html?verified=success',
        handleCodeInApp: false,
      };

      console.log('📧 Enviando email de verificação para:', email);
      
      // Enviar email de verificação
      try {
        await user.sendEmailVerification(actionCodeSettings);
        console.log('✅ Email de verificação enviado!');
      } catch (emailError) {
        // Se falhar com actionCodeSettings, tentar sem ele
        if (emailError.code === 'auth/invalid-continue-uri' || emailError.code === 'auth/missing-continue-uri') {
          console.warn('⚠️ Erro com URL de redirecionamento, tentando sem ela...');
          await user.sendEmailVerification();
        } else {
          throw emailError;
        }
      }

      this.hideLoading();
      this.showSuccess('Conta criada com sucesso!');
      
      // Salvar dados temporários
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: name,
        emailVerified: false
      };
      
      localStorage.setItem('userData', JSON.stringify(userData));
      localStorage.setItem('pendingVerification', 'true');
      localStorage.setItem('pendingVerificationEmail', email);

      // Mostrar instruções detalhadas
      setTimeout(() => {
        this.showStep('verification');
        document.getElementById('verificationEmail').textContent = email;
        
        // Adicionar instruções melhoradas
        const verificationForm = document.getElementById('verificationForm');
        if (verificationForm) {
          const instructionsDiv = document.createElement('div');
          instructionsDiv.className = 'verification-instructions';
          instructionsDiv.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: #e3f2fd;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
          `;
          instructionsDiv.innerHTML = `
            <p style="margin: 0; color: #1976d2; font-size: 0.9rem;">
              <i class="fas fa-info-circle"></i> 
              <strong>Instruções:</strong><br>
              1. Verifique sua <strong>caixa de entrada</strong> e <strong>pasta de spam</strong><br>
              2. Procure por um email do <strong>Firebase</strong> ou <strong>noreply@firebaseapp.com</strong><br>
              3. No Gmail, verifique também as abas: <strong>Promoções</strong> e <strong>Social</strong><br>
              4. Clique no <strong>link de verificação</strong> no email<br>
              5. Após clicar, você será redirecionado e poderá fazer login<br><br>
              <strong>⚠️ Importante:</strong> O link expira em algumas horas. Se não receber, use o botão "Reenviar" abaixo.
            </p>
          `;
          
          // Remover instruções antigas se existirem
          const oldInstructions = verificationForm.querySelector('.verification-instructions');
          if (oldInstructions) {
            oldInstructions.remove();
          }
          
          // Inserir antes do formulário
          const form = verificationForm.querySelector('form');
          if (form && form.parentNode) {
            form.parentNode.insertBefore(instructionsDiv, form);
          }
        }
      }, 1500);

    } catch (error) {
      this.hideLoading();
      let errorMessage = 'Erro ao criar conta. Tente novamente.';
      
      switch(error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email já está cadastrado. Faça login ou use "Esqueci minha senha" se você não lembra da senha.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Verifique o formato do email.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Senha muito fraca. Use pelo menos 8 caracteres com letras, números e símbolos.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Registro não permitido. Entre em contato com o suporte.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        default:
          errorMessage = error.message || 'Erro ao criar conta. Verifique os dados e tente novamente.';
      }
      
      this.showError(errorMessage);
    }
  }

  async handleGoogleLogin() {
    // Aguardar provider estar pronto
    if (!this.provider) {
      this.setupGoogleProvider();
      if (!this.provider) {
        this.showError('Google Auth não disponível. Aguarde um momento e tente novamente.');
        return;
      }
    }

    this.showLoading('Conectando com Google...');

    try {
      if (!this.auth || !this.auth.signInWithPopup) {
        // Aguardar Firebase carregar
        await new Promise(resolve => {
          const checkAuth = setInterval(() => {
            if (window.firebaseAuth && window.firebaseAuth.signInWithPopup) {
              this.auth = window.firebaseAuth;
              clearInterval(checkAuth);
              resolve();
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkAuth);
            resolve();
          }, 5000);
        });

        if (!this.auth || !this.auth.signInWithPopup) {
          throw new Error('Firebase não configurado. Verifique sua conexão e tente novamente.');
        }
      }

      // Tentar popup primeiro, se falhar usar redirect
      let result;
      let user;
      
      try {
        // Tentar popup (mais rápido, mas pode falhar com COOP)
        result = await this.auth.signInWithPopup(this.provider);
        user = result.user;
      } catch (popupError) {
        // Se popup falhar (ex: COOP policy), usar redirect
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.message.includes('Cross-Origin-Opener-Policy') ||
            popupError.message.includes('COOP')) {
          console.log('Popup bloqueado, usando redirect...');
          this.showLoading('Redirecionando para Google...');
          
          // Usar redirect como fallback
          await this.auth.signInWithRedirect(this.provider);
          return; // signInWithRedirect redireciona a página, então não precisa continuar
        }
        throw popupError; // Se for outro erro, relançar
      }

      // Salvar dados do usuário
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        photoURL: user.photoURL,
        provider: 'google'
      };

      localStorage.setItem('userData', JSON.stringify(userData));

      this.showSuccess('Login com Google realizado com sucesso!');
      
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);

    } catch (error) {
      this.hideLoading();
      let errorMessage = 'Erro ao fazer login com Google. Tente novamente.';
      
      switch(error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Login cancelado. Tente novamente quando estiver pronto.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup bloqueado pelo navegador. Permita popups para este site e tente novamente.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Outro popup de login está aberto. Feche-o e tente novamente.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'Este email já está cadastrado com outro método. Use email/senha para fazer login.';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Login com Google não está habilitado. Entre em contato com o suporte.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        default:
          if (error.message && error.message.includes('invalid-credential')) {
            errorMessage = 'Credenciais inválidas. Tente fazer login novamente.';
          } else {
            errorMessage = error.message || 'Erro ao conectar com Google. Tente novamente.';
          }
      }
      
      this.showError(errorMessage);
    }
  }

  async handleGoogleRegister() {
    // Mesmo processo do login Google
    // O Firebase cria automaticamente a conta se não existir
    await this.handleGoogleLogin();
  }

  async handlePasswordReset(e) {
    e.preventDefault();
    
    const email = document.getElementById('resetEmail').value.trim();

    if (!email) {
      this.showError('Por favor, insira seu email');
      return;
    }

    if (!this.validateEmail(email)) {
      this.showError('Por favor, insira um email válido');
      return;
    }

    this.showLoading('Enviando email de recuperação...');

    try {
      if (!this.auth || !this.auth.sendPasswordResetEmail) {
        throw new Error('Firebase não configurado. Configure suas credenciais em firebase-config.js');
      }

      // Configurar URL de redirecionamento para página customizada de reset
      // IMPORTANTE: A URL deve estar autorizada no Firebase Console
      const currentUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
      const redirectUrl = currentUrl + 'reset-password.html';
      
      const actionCodeSettings = {
        url: redirectUrl,
        handleCodeInApp: false,
      };

      console.log('📧 Enviando email de recuperação para:', email);
      console.log('🔗 URL de redirecionamento:', redirectUrl);
      
      // Tentar enviar sem actionCodeSettings primeiro (mais simples)
      try {
        await this.auth.sendPasswordResetEmail(email, actionCodeSettings);
        console.log('✅ Email enviado com sucesso!');
      } catch (urlError) {
        // Se falhar com actionCodeSettings, tentar sem ele
        if (urlError.code === 'auth/invalid-continue-uri' || urlError.code === 'auth/missing-continue-uri') {
          console.warn('⚠️ Erro com URL de redirecionamento, tentando sem ela...');
          await this.auth.sendPasswordResetEmail(email);
          console.log('✅ Email enviado sem URL de redirecionamento!');
        } else {
          throw urlError;
        }
      }

      this.hideLoading();
      this.showSuccess('Email de recuperação enviado com sucesso!');
      
      // Mostrar mensagem mais detalhada
      setTimeout(() => {
        this.showNotification(
          'Verifique sua caixa de entrada e spam. Clique no link no email para redefinir sua senha.',
          'info'
        );
      }, 1500);

      // Mostrar instruções na tela
      const resetForm = document.getElementById('forgotPasswordForm');
      if (resetForm) {
        const instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'reset-instructions';
        instructionsDiv.style.cssText = `
          margin-top: 20px;
          padding: 15px;
          background: #e3f2fd;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        `;
        instructionsDiv.innerHTML = `
          <p style="margin: 0; color: #1976d2; font-size: 0.9rem;">
            <i class="fas fa-info-circle"></i> 
            <strong>Instruções:</strong><br>
            1. Verifique sua <strong>caixa de entrada</strong> e <strong>pasta de spam</strong><br>
            2. Procure por um email do <strong>Firebase</strong> ou <strong>noreply@firebaseapp.com</strong><br>
            3. No Gmail, verifique também as abas: <strong>Promoções</strong> e <strong>Social</strong><br>
            4. Clique no link de redefinição de senha no email<br>
            5. Crie uma nova senha<br>
            6. Faça login com a nova senha<br><br>
            <strong>⚠️ Importante:</strong> O link expira em 1 hora. Se não receber, verifique o spam e tente novamente.
          </p>
        `;
        
        // Remover instruções antigas se existirem
        const oldInstructions = resetForm.querySelector('.reset-instructions');
        if (oldInstructions) {
          oldInstructions.remove();
        }
        
        resetForm.appendChild(instructionsDiv);
      }
      
      // Adicionar botão para reenviar
      const resendButton = document.createElement('button');
      resendButton.type = 'button';
      resendButton.className = 'btn-outline btn-full resend-reset-button';
      resendButton.style.cssText = 'margin-top: 15px;';
      resendButton.innerHTML = '<i class="fas fa-redo"></i> Reenviar Email';
      resendButton.onclick = async () => {
        const resetEmail = document.getElementById('resetEmail');
        if (resetEmail && resetEmail.value !== email) {
          resetEmail.value = email;
        }
        // Criar evento simulado
        const fakeEvent = {
          preventDefault: () => {},
          target: document.getElementById('resetPasswordForm')
        };
        await this.handlePasswordReset(fakeEvent);
      };
      
      const oldResend = resetForm?.querySelector('.resend-reset-button');
      if (oldResend) oldResend.remove();
      
      if (resetForm) {
        resetForm.appendChild(resendButton);
      }
      
      // Voltar para login após 5 segundos
      setTimeout(() => {
        this.showStep('login');
        // Preencher email no campo de login se possível
        const loginEmail = document.getElementById('email');
        if (loginEmail) {
          loginEmail.value = email;
        }
      }, 5000);

    } catch (error) {
      this.hideLoading();
      let errorMessage = 'Erro ao enviar email de recuperação. Tente novamente.';
      
      switch(error.code) {
        case 'auth/user-not-found':
          // Por segurança, não revelamos se o email existe ou não
          errorMessage = 'Se este email estiver cadastrado, você receberá um email com instruções de recuperação.';
          // Mas ainda mostramos sucesso para não revelar informações
          this.showSuccess('Se este email estiver cadastrado, você receberá um email com instruções.');
          setTimeout(() => {
            this.showStep('login');
          }, 3000);
          return;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido. Verifique o formato do email.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
          break;
        case 'auth/missing-continue-uri':
          errorMessage = 'Erro de configuração. Entre em contato com o suporte.';
          break;
        case 'auth/invalid-continue-uri':
          errorMessage = 'Erro de configuração. Entre em contato com o suporte.';
          break;
        default:
          console.error('Erro ao enviar email de recuperação:', error);
          errorMessage = error.message || 'Erro ao enviar email. Verifique o email e tente novamente.';
      }
      
      this.showError(errorMessage);
    }
  }

  async handleEmailVerification(e) {
    e.preventDefault();
    // Firebase usa link de verificação por email, não código
    // Este formulário é apenas para verificar se o email foi verificado
    
    this.showLoading('Verificando status do email...');
    
    try {
      const user = this.auth?.currentUser;
      
      if (!user) {
        // Tentar fazer login com dados salvos
        const savedData = localStorage.getItem('userData');
        const pendingEmail = localStorage.getItem('pendingVerificationEmail');
        
        if (savedData && pendingEmail) {
          const parsed = JSON.parse(savedData);
          this.showNotification('Faça login novamente para verificar seu email. O link de verificação foi enviado para: ' + pendingEmail, 'info');
          setTimeout(() => {
            this.showStep('login');
            const loginEmail = document.getElementById('email');
            if (loginEmail) {
              loginEmail.value = pendingEmail;
            }
            this.hideLoading();
          }, 3000);
          return;
        }
        
        this.hideLoading();
        this.showError('Sessão expirada. Faça login novamente.');
        setTimeout(() => {
          this.showStep('login');
        }, 2000);
        return;
      }
      
      // Recarregar dados do usuário
      await user.reload();
      const reloadedUser = this.auth.currentUser;
      
      if (reloadedUser.emailVerified) {
        const userData = {
          uid: reloadedUser.uid,
          email: reloadedUser.email,
          displayName: reloadedUser.displayName || reloadedUser.email.split('@')[0],
          emailVerified: true
        };
        
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.removeItem('pendingVerification');
        localStorage.removeItem('pendingVerificationEmail');
        
        this.hideLoading();
        this.showSuccess('Email verificado com sucesso! Redirecionando...');
        
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } else {
        this.hideLoading();
        this.showError('Email ainda não verificado. Verifique sua caixa de entrada e clique no link de verificação no email que enviamos.');
        
        // Oferecer reenviar
        setTimeout(() => {
          this.showNotification('Não recebeu o email? Use o botão "Reenviar" abaixo.', 'info');
        }, 2000);
      }
    } catch (error) {
      this.hideLoading();
      console.error('Erro ao verificar email:', error);
      this.showError('Erro ao verificar email. Tente fazer login novamente.');
    }
  }

  async resendVerificationCode() {
    const user = this.auth?.currentUser;
    const pendingEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (!user && !pendingEmail) {
      this.showError('Sessão expirada. Faça login novamente.');
      return;
    }
    
    this.showLoading('Reenviando email de verificação...');
    
    try {
      let emailToVerify = user?.email || pendingEmail;
      
      if (user) {
        // Configurar URL de redirecionamento
        const currentUrl = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        const actionCodeSettings = {
          url: currentUrl + 'login.html?verified=success',
          handleCodeInApp: false,
        };
        
        try {
          await user.sendEmailVerification(actionCodeSettings);
        } catch (urlError) {
          if (urlError.code === 'auth/invalid-continue-uri' || urlError.code === 'auth/missing-continue-uri') {
            await user.sendEmailVerification();
          } else {
            throw urlError;
          }
        }
      } else {
        // Se não há usuário logado, tentar fazer login temporário para reenviar
        this.showError('Faça login primeiro para reenviar o email de verificação.');
        this.hideLoading();
        setTimeout(() => {
          this.showStep('login');
          const loginEmail = document.getElementById('email');
          if (loginEmail && pendingEmail) {
            loginEmail.value = pendingEmail;
          }
        }, 2000);
        return;
      }
      
      this.hideLoading();
      this.showSuccess('Email de verificação reenviado! Verifique sua caixa de entrada e spam.');
      
      // Atualizar contador
      let countdown = 60;
      const countdownEl = document.getElementById('countdown');
      const countdownTimer = document.getElementById('countdownTimer');
      const resendBtn = document.getElementById('resendCode');
      
      if (countdownEl && countdownTimer) {
        countdownEl.style.display = 'block';
        resendBtn.style.pointerEvents = 'none';
        resendBtn.style.opacity = '0.5';
        
        const timer = setInterval(() => {
          countdown--;
          countdownTimer.textContent = countdown;
          
          if (countdown <= 0) {
            clearInterval(timer);
            countdownEl.style.display = 'none';
            resendBtn.style.pointerEvents = 'auto';
            resendBtn.style.opacity = '1';
          }
        }, 1000);
      }
      
    } catch (error) {
      this.hideLoading();
      console.error('Erro ao reenviar email:', error);
      let errorMessage = 'Erro ao reenviar email. Tente novamente.';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
      }
      
      this.showError(errorMessage);
    }
  }

  // Métodos auxiliares
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  setupPasswordStrength() {
    const passwordInput = document.getElementById('registerPassword');
    const strengthIndicator = document.getElementById('passwordStrength');

    if (!passwordInput || !strengthIndicator) return;

    passwordInput.addEventListener('input', (e) => {
      const password = e.target.value;
      const strength = this.calculatePasswordStrength(password);
      this.updatePasswordStrength(strength, strengthIndicator);
    });
  }

  calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  updatePasswordStrength(strength, indicator) {
    const strengthLevels = ['Muito Fraca', 'Fraca', 'Regular', 'Boa', 'Muito Forte'];
    const strengthColors = ['#ff4444', '#ff8800', '#ffbb00', '#88cc00', '#00cc44'];
    
    indicator.textContent = strengthLevels[strength] || 'Muito Fraca';
    indicator.style.color = strengthColors[strength] || '#ff4444';
  }

  setupCodeInputs() {
    const codeInputs = document.querySelectorAll('.code-input');
    
    codeInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length === 1 && /^\d$/.test(value)) {
          if (index < codeInputs.length - 1) {
            codeInputs[index + 1].focus();
          }
        } else if (value.length > 1) {
          e.target.value = value[0];
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          codeInputs[index - 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text');
        if (/^\d{6}$/.test(pastedData)) {
          pastedData.split('').forEach((digit, i) => {
            if (codeInputs[i]) {
              codeInputs[i].value = digit;
            }
          });
          codeInputs[codeInputs.length - 1].focus();
        }
      });
    });
  }

  getEnteredCode() {
    const codeInputs = document.querySelectorAll('.code-input');
    return Array.from(codeInputs).map(input => input.value).join('');
  }

  clearCodeInputs() {
    const codeInputs = document.querySelectorAll('.code-input');
    codeInputs.forEach(input => {
      input.value = '';
    });
    if (codeInputs[0]) {
      codeInputs[0].focus();
    }
  }

  togglePasswordVisibility(e) {
    const button = e.target.closest('.password-toggle');
    if (!button) return;
    
    const input = button.parentElement.querySelector('input[type="password"], input[type="text"]');
    const icon = button.querySelector('i');
    
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fas fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fas fa-eye';
    }
  }

  showLoading(message) {
    // Criar ou atualizar elemento de loading
    let loadingEl = document.getElementById('loading');
    if (!loadingEl) {
      loadingEl = document.createElement('div');
      loadingEl.id = 'loading';
      loadingEl.className = 'loading-overlay';
      loadingEl.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
      document.body.appendChild(loadingEl);
    } else {
      loadingEl.querySelector('p').textContent = message;
    }
    loadingEl.style.display = 'flex';
  }

  hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    // Remover notificações existentes
    const existing = document.querySelector('.notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }, 4000);
  }
}

// Inicializar sistema quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new FirebaseAuthSystem();
});
