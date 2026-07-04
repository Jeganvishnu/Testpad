/**
 * Theme Manager for CKCET testVault Admin Page
 * Based on the design-system.toml specifications
 * Provides smooth transitions and persistent theme switching
 */

class ThemeManager {
  constructor() {
    this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
    this.transitionDuration = 700; // From design system
    this.transitionOverlay = null;
    this.init();
  }

  /**
   * Initialize the theme manager
   */
  init() {
    this.applyTheme(this.currentTheme, false);
    this.setupSystemThemeListener();
    this.setupTransitionOverlay();
  }

  /**
   * Get theme from localStorage or fallback to system preference
   */
  getStoredTheme() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('ckcet-admin-theme');
  }

  /**
   * Get system theme preference
   */
  getSystemTheme() {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Store theme preference
   */
  storeTheme(theme) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ckcet-admin-theme', theme);
    }
  }

  /**
   * Setup system theme change listener
   */
  setupSystemThemeListener() {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // Only auto-switch if user hasn't set a manual preference
      if (!this.getStoredTheme()) {
        this.setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  /**
   * Setup transition overlay for smooth theme changes
   */
  setupTransitionOverlay() {
    if (typeof window === 'undefined') return;

    this.transitionOverlay = document.createElement('div');
    this.transitionOverlay.className = 'theme-transition-overlay';
    this.transitionOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 999999;
      pointer-events: none;
      opacity: 0;
      background: radial-gradient(
        ellipse at center,
        var(--bg-primary) 0%,
        var(--bg-secondary) 25%,
        var(--bg-tertiary) 50%,
        var(--bg-secondary) 75%,
        var(--bg-primary) 100%
      );
      transition: opacity 0.5s cubic-bezier(0.23, 1, 0.32, 1);
    `;
    document.body.appendChild(this.transitionOverlay);
  }

  /**
   * Apply theme with smooth transition
   */
  async setTheme(theme, withTransition = true) {
    if (theme === this.currentTheme) return;

    if (withTransition) {
      await this.performTransitionChange(theme);
    } else {
      this.applyTheme(theme, false);
    }
  }

  /**
   * Perform smooth theme transition
   */
  async performTransitionChange(theme) {
    return new Promise((resolve) => {
      // Add transition classes
      document.body.classList.add('theme-transitioning');
      
      // Show overlay
      if (this.transitionOverlay) {
        this.transitionOverlay.style.opacity = '0.95';
      }

      // Apply theme after overlay is shown
      setTimeout(() => {
        this.applyTheme(theme, false);
        
        // Hide overlay
        if (this.transitionOverlay) {
          this.transitionOverlay.style.opacity = '0';
        }

        // Remove transition classes
        setTimeout(() => {
          document.body.classList.remove('theme-transitioning');
          resolve();
        }, 500);
      }, 250);
    });
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme, storePreference = true) {
    const root = document.documentElement;
    const body = document.body;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    root.removeAttribute('data-theme');

    // Apply new theme
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);

    // Apply theme-specific styles
    if (theme === 'dark') {
      this.applyDarkTheme(root, body);
    } else {
      this.applyLightTheme(root, body);
    }

    // Update current theme
    this.currentTheme = theme;

    // Store preference
    if (storePreference) {
      this.storeTheme(theme);
    }

    // Trigger custom event
    this.dispatchThemeChangeEvent(theme);

    // Add grid background for dark theme
    this.updateBackgroundGrid(theme);
  }

  /**
   * Apply light theme styles
   */
  applyLightTheme(root, body) {
    // Set CSS custom properties for light theme
    const lightThemeProps = {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f8fafc',
      '--bg-tertiary': '#f1f5f9',
      '--bg-quaternary': '#e2e8f0',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#64748b',
      '--text-accent': '#1e40af',
      '--border-primary': '#e2e8f0',
      '--border-secondary': '#cbd5e1',
      '--border-accent': '#3b82f6',
      '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '--accent-primary': '#3b82f6',
      '--accent-secondary': '#8b5cf6',
      '--accent-tertiary': '#06b6d4',
      '--accent-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      '--accent-gradient-hover': 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
      '--success': '#10b981',
      '--success-light': '#d1fae5',
      '--error': '#ef4444',
      '--error-light': '#fee2e2',
      '--warning': '#f59e0b',
      '--warning-light': '#fef3c7',
      '--info': '#3b82f6',
      '--info-light': '#dbeafe'
    };

    Object.entries(lightThemeProps).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });

    body.style.backgroundColor = '#ffffff';
    body.style.color = '#0f172a';
  }

  /**
   * Apply dark theme styles
   */
  applyDarkTheme(root, body) {
    // Set CSS custom properties for dark theme
    const darkThemeProps = {
      '--bg-primary': '#0A0A0A',
      '--bg-secondary': '#121212',
      '--bg-tertiary': '#1e1e1e',
      '--bg-quaternary': '#2a2a2a',
      '--text-primary': '#ffffff',
      '--text-secondary': '#b8b8b8',
      '--text-muted': '#909090',
      '--text-accent': '#00d9ff',
      '--border-primary': 'rgba(255, 255, 255, 0.12)',
      '--border-secondary': 'rgba(255, 255, 255, 0.08)',
      '--border-accent': '#00d9ff',
      '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.6)',
      '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.6), 0 2px 4px -2px rgb(0 0 0 / 0.6)',
      '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.7), 0 4px 6px -4px rgb(0 0 0 / 0.7)',
      '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.8), 0 8px 10px -6px rgb(0 0 0 / 0.8)',
      '--accent-primary': '#00d9ff',
      '--accent-secondary': '#ff6b35',
      '--accent-tertiary': '#00ff88',
      '--accent-gradient': 'linear-gradient(135deg, #00d9ff 0%, #ff6b35 100%)',
      '--accent-gradient-hover': 'linear-gradient(135deg, #00c4e6 0%, #e55a2b 100%)',
      '--success': '#00ff88',
      '--success-light': 'rgba(0, 255, 136, 0.15)',
      '--error': '#ff5f57',
      '--error-light': 'rgba(255, 95, 87, 0.15)',
      '--warning': '#ffbd2e',
      '--warning-light': 'rgba(255, 189, 46, 0.15)',
      '--info': '#00d9ff',
      '--info-light': 'rgba(0, 217, 255, 0.15)'
    };

    Object.entries(darkThemeProps).forEach(([prop, value]) => {
      root.style.setProperty(prop, value);
    });

    // Enhanced background gradient for dark mode
    body.style.background = `
      radial-gradient(ellipse at 25% 45%, rgba(0, 217, 255, 0.03) 0%, transparent 60%),
      radial-gradient(ellipse at 75% 25%, rgba(255, 107, 53, 0.025) 0%, transparent 55%),
      radial-gradient(ellipse at 45% 85%, rgba(0, 255, 136, 0.015) 0%, transparent 65%),
      radial-gradient(ellipse at 15% 85%, rgba(139, 92, 246, 0.02) 0%, transparent 50%),
      #0A0A0A
    `;
    body.style.color = '#ffffff';
  }

  /**
   * Update background grid for dark theme
   */
  updateBackgroundGrid(theme) {
    let gridElement = document.querySelector('.bg-grid-dark');
    
    if (theme === 'dark') {
      if (!gridElement) {
        gridElement = document.createElement('div');
        gridElement.className = 'bg-grid-dark';
        gridElement.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.025;
          z-index: -1;
          background-image: 
            linear-gradient(rgba(0, 217, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.08) 1px, transparent 1px),
            linear-gradient(45deg, rgba(255, 107, 53, 0.02) 1px, transparent 1px);
          background-size: 60px 60px, 60px 60px, 120px 120px;
          animation: gridFloat 25s ease-in-out infinite;
        `;
        document.body.appendChild(gridElement);
      }
    } else {
      if (gridElement) {
        gridElement.remove();
      }
    }
  }

  /**
   * Toggle between light and dark themes
   */
  async toggleTheme() {
    const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    await this.setTheme(newTheme);
    return newTheme;
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Check if dark theme is active
   */
  isDarkMode() {
    return this.currentTheme === 'dark';
  }

  /**
   * Dispatch theme change event
   */
  dispatchThemeChangeEvent(theme) {
    if (typeof window === 'undefined') return;
    
    const event = new CustomEvent('themeChange', {
      detail: { theme, isDark: theme === 'dark' }
    });
    window.dispatchEvent(event);
  }

  /**
   * Add CSS animations and keyframes if not already present
   */
  addThemeStyles() {
    if (typeof window === 'undefined') return;
    
    const styleId = 'ckcet-theme-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Grid animation keyframes */
      @keyframes gridFloat {
        0%, 100% { transform: translateX(0) translateY(0) rotate(0deg); }
        25% { transform: translateX(1px) translateY(-1px) rotate(0.5deg); }
        50% { transform: translateX(-0.5px) translateY(0.5px) rotate(0deg); }
        75% { transform: translateX(0.5px) translateY(-0.5px) rotate(-0.5deg); }
      }

      /* Theme transition styles */
      .theme-transitioning {
        transition: background-color 0.7s cubic-bezier(0.23, 1, 0.32, 1),
                    color 0.7s cubic-bezier(0.23, 1, 0.32, 1);
      }

      .theme-transitioning * {
        transition: background-color 0.7s cubic-bezier(0.23, 1, 0.32, 1) !important,
                    color 0.7s cubic-bezier(0.23, 1, 0.32, 1) !important,
                    border-color 0.7s cubic-bezier(0.23, 1, 0.32, 1) !important,
                    box-shadow 0.7s cubic-bezier(0.23, 1, 0.32, 1) !important;
      }

      /* Global smooth transitions */
      * {
        transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                    color 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                    border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                    box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Cleanup method
   */
  destroy() {
    if (this.transitionOverlay) {
      this.transitionOverlay.remove();
    }
    
    const styleElement = document.getElementById('ckcet-theme-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }
}

// Export for use in admin page
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
}

export default ThemeManager;