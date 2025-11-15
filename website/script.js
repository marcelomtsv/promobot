// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 100) {
    navbar.style.background = 'rgba(255, 255, 255, 0.98)';
    navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
  } else {
    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    navbar.style.boxShadow = 'none';
  }
});

// FAQ Accordion functionality
document.querySelectorAll('.faq-question').forEach(question => {
  question.addEventListener('click', () => {
    const faqItem = question.parentElement;
    const isActive = faqItem.classList.contains('active');
    
    // Close all FAQ items
    document.querySelectorAll('.faq-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Open clicked item if it wasn't active
    if (!isActive) {
      faqItem.classList.add('active');
    }
  });
});

// Contact form handling
const contactForm = document.querySelector('.contact-form form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(contactForm);
    const name = contactForm.querySelector('input[type="text"]').value;
    const email = contactForm.querySelector('input[type="email"]').value;
    const phone = contactForm.querySelector('input[type="tel"]').value;
    const message = contactForm.querySelector('textarea').value;
    
    // Simple validation
    if (!name || !email || !phone || !message) {
      showNotification('Por favor, preencha todos os campos.', 'error');
      return;
    }
    
    // Simulate form submission
    showNotification('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
    contactForm.reset();
  });
}

// Função para configurar botões de login e compra
function setupAuthButtons() {
  // Função auxiliar para redirecionar para login
  const redirectToLogin = (e) => {
    if (e) e.preventDefault();
    window.location.href = 'login.html';
  };

  // Função auxiliar para comprar créditos
  const handleBuyCredits = (e) => {
    if (e) e.preventDefault();
    const userData = localStorage.getItem('userData');
    if (userData) {
      showNotification('Redirecionando para compra de créditos...', 'info');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      showNotification('Faça login para comprar créditos', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    }
  };

  // Configurar botões de login
  const loginBtn = document.getElementById('login-btn');
  const loginBtnNav = document.getElementById('login-btn-nav');
  
  if (loginBtn) {
    loginBtn.removeEventListener('click', redirectToLogin); // Remove listener antigo se existir
    loginBtn.addEventListener('click', redirectToLogin);
  }
  
  if (loginBtnNav) {
    loginBtnNav.removeEventListener('click', redirectToLogin);
    loginBtnNav.addEventListener('click', redirectToLogin);
  }

  // Configurar botões de compra
  const buyBtn = document.getElementById('buy-btn');
  const buyBtnNav = document.getElementById('buy-btn-nav');
  
  if (buyBtn) {
    buyBtn.removeEventListener('click', handleBuyCredits);
    buyBtn.addEventListener('click', handleBuyCredits);
  }
  
  if (buyBtnNav) {
    buyBtnNav.removeEventListener('click', handleBuyCredits);
    buyBtnNav.addEventListener('click', handleBuyCredits);
  }
}

// Configurar botões quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAuthButtons);
} else {
  setupAuthButtons();
}

// Reconfigurar após um pequeno delay para garantir que tudo foi carregado
setTimeout(setupAuthButtons, 100);

// Notification system
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    max-width: 400px;
    animation: slideIn 0.3s ease;
  `;
  
  // Add animation keyframes
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        margin-left: auto;
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
  
  // Close button functionality
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.remove();
  });
}

// Enhanced Intersection Observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      
      // Add staggered animation for multiple elements
      const siblings = entry.target.parentElement.children;
      Array.from(siblings).forEach((sibling, index) => {
        if (sibling === entry.target) {
          setTimeout(() => {
            sibling.style.animationDelay = `${index * 0.1}s`;
          }, 100);
        }
      });
    }
  });
}, observerOptions);

// Enhanced scroll reveal animations
document.querySelectorAll('.feature, .store, .testimonial, .pricing-card, .action-card, .step, .credit-card, .contact-item').forEach(el => {
  el.classList.add('scroll-reveal');
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
  observer.observe(el);
});

// Enhanced navbar scroll effect with smooth transitions
let lastScrollY = window.scrollY;
let ticking = false;

function updateNavbar() {
  const navbar = document.querySelector('.navbar');
  const scrolled = window.scrollY;
  
  if (scrolled > 100) {
    navbar.style.background = 'rgba(255, 255, 255, 0.98)';
    navbar.style.backdropFilter = 'blur(20px)';
    navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    navbar.style.borderBottom = '1px solid rgba(0, 82, 212, 0.1)';
  } else {
    navbar.style.background = 'rgba(255, 255, 255, 0.95)';
    navbar.style.backdropFilter = 'blur(10px)';
    navbar.style.boxShadow = 'none';
    navbar.style.borderBottom = '1px solid rgba(0, 0, 0, 0.1)';
  }
  
  // Hide/show navbar on scroll
  if (scrolled > lastScrollY && scrolled > 200) {
    navbar.style.transform = 'translateY(-100%)';
  } else {
    navbar.style.transform = 'translateY(0)';
  }
  
  lastScrollY = scrolled;
  ticking = false;
}

function requestTick() {
  if (!ticking) {
    requestAnimationFrame(updateNavbar);
    ticking = true;
  }
}

window.addEventListener('scroll', requestTick);

// Enhanced button click animations
document.querySelectorAll('.btn-primary, .btn-outline').forEach(button => {
  button.addEventListener('click', function(e) {
    // Create ripple effect
    const ripple = document.createElement('span');
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');
    
    this.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  });
});

// Add ripple effect styles
const rippleStyles = document.createElement('style');
rippleStyles.textContent = `
  .btn-primary, .btn-outline {
    position: relative;
    overflow: hidden;
  }
  
  .ripple {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.6);
    transform: scale(0);
    animation: ripple-animation 0.6s linear;
    pointer-events: none;
  }
  
  @keyframes ripple-animation {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyles);

// Enhanced card hover effects
document.querySelectorAll('.store, .feature, .testimonial, .pricing-card, .action-card').forEach(card => {
  card.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-8px) scale(1.02)';
    this.style.boxShadow = '0 20px 40px rgba(0, 82, 212, 0.2)';
  });
  
  card.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(0) scale(1)';
    this.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
  });
});

// Enhanced form interactions
document.querySelectorAll('input, textarea').forEach(input => {
  input.addEventListener('focus', function() {
    this.style.transform = 'scale(1.02)';
    this.style.boxShadow = '0 0 0 3px rgba(0, 82, 212, 0.1)';
  });
  
  input.addEventListener('blur', function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 0 0 0 rgba(0, 82, 212, 0.1)';
  });
});

// Enhanced icon animations on hover
document.querySelectorAll('.store-icon, .card-icon').forEach(icon => {
  icon.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.15) rotate(5deg)';
    this.style.boxShadow = '0 20px 40px rgba(0, 82, 212, 0.3)';
  });
  
  icon.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1) rotate(0deg)';
    this.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.1)';
  });
});

// Enhanced scroll to top functionality
const scrollToTop = document.createElement('button');
scrollToTop.innerHTML = '<i class="fas fa-arrow-up"></i>';
scrollToTop.className = 'scroll-to-top';
scrollToTop.style.cssText = `
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 50px;
  height: 50px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transform: translateY(100px);
  transition: all 0.3s ease;
  z-index: 1000;
  box-shadow: 0 4px 15px rgba(0, 82, 212, 0.3);
`;

document.body.appendChild(scrollToTop);

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    scrollToTop.style.opacity = '1';
    scrollToTop.style.transform = 'translateY(0)';
  } else {
    scrollToTop.style.opacity = '0';
    scrollToTop.style.transform = 'translateY(100px)';
  }
});

scrollToTop.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// Enhanced loading states
function showLoadingState(element) {
  element.classList.add('loading-shimmer');
  element.style.pointerEvents = 'none';
}

function hideLoadingState(element) {
  element.classList.remove('loading-shimmer');
  element.style.pointerEvents = 'auto';
}

// Enhanced notification system with better animations
function showNotification(message, type = 'info') {
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    </div>
  `;
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    max-width: 400px;
    transform: translateX(100%);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto remove
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 400);
  }, 5000);
  
  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      notification.remove();
    }, 400);
  });
}

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start);
    }
  }, 16);
}

// Animate counters when they come into view
const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const counter = entry.target.querySelector('.stat-number');
      if (counter && !counter.dataset.animated) {
        const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
        counter.dataset.animated = 'true';
        animateCounter(counter, target);
      }
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat, .stat-item').forEach(el => {
  counterObserver.observe(el);
});

// Mobile menu toggle (if needed)
function toggleMobileMenu() {
  const navLinks = document.querySelector('.nav-links');
  navLinks.classList.toggle('mobile-open');
}

// Add mobile menu styles if needed
const mobileStyles = document.createElement('style');
mobileStyles.textContent = `
  @media (max-width: 768px) {
    .nav-links {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
      flex-direction: column;
      padding: 1rem;
    }
    .nav-links.mobile-open {
      display: flex;
    }
  }
`;
document.head.appendChild(mobileStyles);
