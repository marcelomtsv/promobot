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
      
      // Inicializar Firestore
      const db = firebase.firestore();
      
      // Configurar idioma para português
      auth.languageCode = 'pt';
      
      // Exportar para uso global
      window.firebaseAuth = auth;
      window.firebaseDb = db;
      
      console.log('✅ Firebase inicializado com sucesso!');
      console.log('✅ Authentication pronto para uso');
      console.log('✅ Firestore pronto para uso');
      
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

