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
        // Garantir que Firestore também esteja inicializado
        if (!window.firebaseDb) {
          try {
            window.firebaseDb = firebase.firestore();
            console.log('✅ Firestore inicializado');
          } catch (error) {
            console.warn('⚠️ Firestore não disponível:', error.message);
          }
        }
        return;
      }

      // Inicializar Firebase
      firebase.initializeApp(firebaseConfig);
      
      // Inicializar Auth
      const auth = firebase.auth();
      
      // Inicializar Firestore (com tratamento de erro melhorado)
      let db = null;
      try {
        db = firebase.firestore();
        
        // Verificar se Firestore está realmente disponível fazendo uma operação de teste
        // (sem realmente fazer uma requisição)
        // Apenas verificar se o objeto foi criado corretamente
        
        // Configurar para usar modo online (não offline)
        // Isso garante que erros sejam detectados rapidamente
        db.settings({
          cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        
        console.log('✅ Firestore inicializado e configurado');
      } catch (error) {
        // Se Firestore não estiver disponível, continuar sem ele
        console.warn('⚠️ Firestore não disponível:', error.message);
        console.warn('⚠️ Usando apenas localStorage para armazenamento');
        console.warn('💡 Dica: Verifique se o Firestore está habilitado no Firebase Console');
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
        
        // Testar conexão com Firestore (sem fazer requisição real)
        // Apenas verificar se o objeto está disponível
        try {
          // Verificar se podemos acessar métodos do Firestore
          if (typeof db.collection === 'function') {
            console.log('✅ Firestore métodos disponíveis');
          }
        } catch (testError) {
          console.warn('⚠️ Aviso ao testar Firestore:', testError.message);
        }
      } else {
        console.log('ℹ️ Usando localStorage para armazenamento');
        console.log('💡 Para usar Firestore, verifique:');
        console.log('   1. Se o Firestore está habilitado no Firebase Console');
        console.log('   2. Se as regras de segurança estão configuradas');
        console.log('   3. Se há conexão com a internet');
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
      
      // Garantir que firebaseDb seja null em caso de erro
      window.firebaseDb = null;
    }
  }

  // Inicializar quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFirebase);
  } else {
    initializeFirebase();
  }
})();

