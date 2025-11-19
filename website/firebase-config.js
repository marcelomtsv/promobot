// Configuração do Firebase
// Firebase configurado e pronto para uso!

const firebaseConfig = {
  apiKey: "AIzaSyBOxY9dwE0Ll4QnvGi2TxeUzJLfBlh91Rw",
  authDomain: "promobot-bbb55.firebaseapp.com",
  projectId: "promobot-bbb55",
  storageBucket: "promobot-bbb55.firebasestorage.app",
  messagingSenderId: "1042214743093",
  appId: "1:1042214743093:web:766e864eb68c6fbff0d57c"
};

// Aguardar Firebase SDK carregar antes de inicializar
(function() {
  function initializeFirebase() {
    try {
      // Verificar se Firebase está disponível
      if (typeof firebase === 'undefined' || !firebase.apps) {
        console.warn('Firebase SDK ainda não carregou. Aguardando...');
        setTimeout(initializeFirebase, 100);
        return;
      }

      // Verificar se já foi inicializado
      if (firebase.apps.length > 0) {
        console.log('✅ Firebase já inicializado');
        window.firebaseAuth = firebase.auth();
        return;
      }

      // Inicializar Firebase
      firebase.initializeApp(firebaseConfig);
      
      // Inicializar Auth
      const auth = firebase.auth();
      
      // Inicializar Firestore (com tratamento de erro)
      let db = null;
      try {
        db = firebase.firestore();
        // Configurar apenas se ainda não foi configurado
        // O aviso de "overriding" aparece se settings() for chamado após inicialização automática
        // Verificar se já foi configurado antes de chamar settings()
        if (!db._settings || !db._settings.ignoreUndefinedProperties) {
          try {
            db.settings({
              ignoreUndefinedProperties: true
            });
          } catch (settingsError) {
            // Ignorar erro se já foi configurado
          }
        }
      } catch (error) {
        // Se Firestore não estiver disponível, continuar sem ele
        console.warn('⚠️ Firestore não disponível, usando apenas localStorage');
      }
      
      // Configurar idioma para português
      auth.languageCode = 'pt';
      
      // Exportar para uso global
      window.firebaseAuth = auth;
      window.firebaseDb = db; // Pode ser null se Firestore não estiver disponível
      
      console.log('✅ Firebase inicializado com sucesso!');
      console.log('✅ Authentication pronto para uso');
      if (db) {
        console.log('✅ Firestore pronto para uso');
      } else {
        console.log('ℹ️ Usando localStorage para armazenamento');
      }
      
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
      
      // Criar objeto mock em caso de erro
      window.firebaseAuth = {
        signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase não inicializado')),
        createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase não inicializado')),
        signInWithPopup: () => Promise.reject(new Error('Firebase não inicializado')),
        signOut: () => Promise.resolve(),
        onAuthStateChanged: (callback) => {
          callback(null);
          return () => {};
        },
        sendPasswordResetEmail: () => Promise.reject(new Error('Firebase não inicializado')),
        currentUser: null
      };
    }
  }

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
  } else {
    initializeFirebase();
  }
})();

