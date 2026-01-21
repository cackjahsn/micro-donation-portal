// theme-manager.js - Fixed with better text contrast
class ThemeManager {
    constructor() {
        this.themeKey = 'communitygive-theme';
        this.init();
    }
    
    init() {
        // Create toggle button on all pages
        this.createThemeToggleButton();
        
        // Load saved theme
        this.loadTheme();
        
        // Listen for system theme changes
        this.listenForSystemThemeChanges();
    }
    
    createThemeToggleButton() {
        // Check if button already exists
        if (document.querySelector('.theme-toggle')) {
            return;
        }
        
        const themeToggleBtn = document.createElement('button');
        themeToggleBtn.className = 'theme-toggle-btn';
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i><i class="fas fa-sun"></i>';
        themeToggleBtn.setAttribute('aria-label', 'Toggle dark mode');
        themeToggleBtn.setAttribute('title', 'Toggle dark/light mode');
        themeToggleBtn.id = 'globalThemeToggle';
        
        const themeToggleContainer = document.createElement('div');
        themeToggleContainer.className = 'theme-toggle';
        themeToggleContainer.appendChild(themeToggleBtn);
        
        // Add to page
        document.body.appendChild(themeToggleContainer);
        
        // Add click event
        themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        
        // Add styles if not already present
        this.addThemeToggleStyles();
    }
    
    loadTheme() {
        const savedTheme = localStorage.getItem(this.themeKey);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) {
            this.setTheme(savedTheme);
        } else if (systemPrefersDark) {
            this.setTheme('dark');
        } else {
            this.setTheme('light');
        }
    }
    
    setTheme(theme) {
        const htmlElement = document.documentElement;
        
        if (theme === 'dark') {
            htmlElement.classList.add('dark-mode');
            localStorage.setItem(this.themeKey, 'dark');
            
            // Apply dark mode to all elements
            this.applyDarkMode();
        } else {
            htmlElement.classList.remove('dark-mode');
            localStorage.setItem(this.themeKey, 'light');
            
            // Remove dark mode
            this.removeDarkMode();
        }
        
        // Update button appearance
        this.updateToggleButton(theme);
        
        // Dispatch custom event
        const event = new CustomEvent('themeChanged', { 
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
    }
    
    applyDarkMode() {
        // 1. Change body background ONLY (soft dark)
        document.body.style.backgroundColor = '#1a1d28';
        document.body.style.backgroundImage = 'none';
        document.body.style.color = '#f8f9fa';
        
        // 2. Change navbar background ONLY
        const navbars = document.querySelectorAll('.navbar');
        navbars.forEach(nav => {
            nav.style.backgroundColor = '#252836';
            nav.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
        });
        
        // 3. Update navbar links color
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link, .navbar-brand');
        navLinks.forEach(link => {
            link.style.color = '#f8f9fa';
            link.classList.add('text-light');
        });
        
        // 4. Update footer background
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.backgroundColor = '#151722';
        }
        
        // 5. Fix text contrast on ALL PAGES - CRITICAL FIX
        this.fixTextContrast();
    }
    
    fixTextContrast() {
        // Fix trust badges text - make sure text is visible
        const trustBadges = document.querySelectorAll('.trust-badge, .feature-card, .stats-card');
        trustBadges.forEach(badge => {
            // Make sure text inside these cards is dark enough to read
            const headings = badge.querySelectorAll('h4, h5, h6, .stat-label, .feature-title');
            headings.forEach(heading => {
                heading.style.color = '#2c3e50';
                heading.classList.add('text-dark');
            });
            
            const paragraphs = badge.querySelectorAll('p, .feature-description, .stat-value, .tier-benefits');
            paragraphs.forEach(p => {
                p.style.color = '#495057';
            });
        });
        
        // Fix card text contrast
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const cardText = card.querySelectorAll('.card-text, .card-title, .campaign-stats');
            cardText.forEach(text => {
                text.style.color = '#2c3e50';
            });
        });
        
        // Fix all headings and paragraphs on about, transparency, contact pages
        const contentContainers = document.querySelectorAll('.container, .row, .col, section');
        contentContainers.forEach(container => {
            // Don't affect cards, only general content
            if (!container.closest('.card')) {
                const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
                headings.forEach(heading => {
                    heading.style.color = '#f8f9fa';
                    heading.classList.add('text-light');
                });
                
                const paragraphs = container.querySelectorAll('p, li, span:not(.badge)');
                paragraphs.forEach(p => {
                    if (!p.closest('.card') && !p.closest('.btn')) {
                        p.style.color = '#dee2e6';
                    }
                });
            }
        });
    }
    
    removeDarkMode() {
        // Reset body styles
        document.body.style.backgroundColor = '';
        document.body.style.backgroundImage = '';
        document.body.style.color = '';
        
        // Reset navbar
        const navbars = document.querySelectorAll('.navbar');
        navbars.forEach(nav => {
            nav.style.backgroundColor = '';
            nav.style.borderBottom = '';
        });
        
        // Reset navbar links
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link, .navbar-brand');
        navLinks.forEach(link => {
            link.style.color = '';
            link.classList.remove('text-light');
        });
        
        // Reset footer
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.backgroundColor = '';
        }
        
        // Reset text colors
        this.resetTextColors();
    }
    
    resetTextColors() {
        // Remove all inline color styles we added
        const elements = document.querySelectorAll('[style*="color"]');
        elements.forEach(el => {
            if (el.style.color && el.style.color.includes('#2c3e50') || 
                el.style.color && el.style.color.includes('#495057') ||
                el.style.color && el.style.color.includes('#f8f9fa') ||
                el.style.color && el.style.color.includes('#dee2e6')) {
                el.style.color = '';
            }
        });
        
        // Remove text-dark/text-light classes
        const darkText = document.querySelectorAll('.text-dark');
        darkText.forEach(el => el.classList.remove('text-dark'));
        const lightText = document.querySelectorAll('.text-light');
        lightText.forEach(el => el.classList.remove('text-light'));
    }
    
    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark-mode');
        this.setTheme(isDark ? 'light' : 'dark');
        
        // Add animation class
        const btn = document.querySelector('.theme-toggle-btn');
        if (btn) {
            btn.classList.add('theme-switching');
            setTimeout(() => {
                btn.classList.remove('theme-switching');
            }, 500);
        }
    }
    
    listenForSystemThemeChanges() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem(this.themeKey)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }
    
    updateToggleButton(theme) {
        const btn = document.querySelector('.theme-toggle-btn');
        if (!btn) return;
        
        const moonIcon = btn.querySelector('.fa-moon');
        const sunIcon = btn.querySelector('.fa-sun');
        
        if (theme === 'dark') {
            if (moonIcon) moonIcon.style.opacity = '0';
            if (sunIcon) sunIcon.style.opacity = '1';
        } else {
            if (moonIcon) moonIcon.style.opacity = '1';
            if (sunIcon) sunIcon.style.opacity = '0';
        }
    }
    
    addThemeToggleStyles() {
        if (!document.getElementById('theme-toggle-styles')) {
            const style = document.createElement('style');
            style.id = 'theme-toggle-styles';
            style.textContent = `
                .theme-toggle {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    z-index: 1000;
                }
                
                .theme-toggle-btn {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    border: none;
                    color: white;
                    font-size: 1.5rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                }
                
                .dark-mode .theme-toggle-btn {
                    background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
                    box-shadow: 0 5px 20px rgba(168, 85, 247, 0.3);
                }
                
                .theme-toggle-btn:hover {
                    transform: scale(1.1) rotate(15deg);
                    box-shadow: 0 8px 25px rgba(106, 17, 203, 0.4);
                }
                
                .dark-mode .theme-toggle-btn:hover {
                    box-shadow: 0 8px 25px rgba(168, 85, 247, 0.5);
                }
                
                .theme-toggle-btn i {
                    transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                    position: absolute;
                }
                
                .theme-toggle-btn .fa-sun {
                    opacity: 0;
                    transform: scale(0) rotate(180deg);
                }
                
                .theme-toggle-btn .fa-moon {
                    opacity: 1;
                    transform: scale(1) rotate(0);
                }
                
                .dark-mode .theme-toggle-btn .fa-sun {
                    opacity: 1;
                    transform: scale(1) rotate(0);
                }
                
                .dark-mode .theme-toggle-btn .fa-moon {
                    opacity: 0;
                    transform: scale(0) rotate(-180deg);
                }
                
                .theme-toggle-btn.theme-switching {
                    animation: themeSwitch 0.5s ease;
                }
                
                @keyframes themeSwitch {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.2) rotate(90deg); }
                    100% { transform: scale(1) rotate(0); }
                }
                
                @media (max-width: 768px) {
                    .theme-toggle {
                        bottom: 20px;
                        right: 20px;
                    }
                    
                    .theme-toggle-btn {
                        width: 50px;
                        height: 50px;
                        font-size: 1.25rem;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Global functions
window.toggleTheme = function() {
    if (window.themeManager) {
        window.themeManager.toggleTheme();
    }
};

window.getCurrentTheme = function() {
    if (window.themeManager) {
        return window.themeManager.getCurrentTheme();
    }
    return 'light';
};