/**
 * TradingSystem Documentation - Interactive Features
 * Gemini CLI Style
 */

// ============================================
// THEME TOGGLE
// ============================================

const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;

// Load saved theme or use dark by default
const savedTheme = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// ============================================
// SIDEBAR NAVIGATION
// ============================================

// Category toggle
const categoryHeaders = document.querySelectorAll('.category-header');

categoryHeaders.forEach(header => {
    header.addEventListener('click', () => {
        const category = header.closest('.sidebar-category');
        const items = category.querySelector('.category-items');
        
        header.classList.toggle('collapsed');
        items.classList.toggle('collapsed');
    });
});

// Active link highlight
const sidebarLinks = document.querySelectorAll('.sidebar-link');

sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Remove active from all links
        sidebarLinks.forEach(l => l.classList.remove('active'));
        // Add active to clicked link
        link.classList.add('active');
    });
});

// ============================================
// TABLE OF CONTENTS
// ============================================

const tocLinks = document.querySelectorAll('.toc-link');
const headings = document.querySelectorAll('.article-content h2, .article-content h3');

// Intersection Observer for TOC
const observerOptions = {
    rootMargin: '-80px 0px -80% 0px',
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            
            // Remove active from all TOC links
            tocLinks.forEach(link => link.classList.remove('active'));
            
            // Add active to corresponding TOC link
            const activeLink = document.querySelector(`.toc-link[href="#${id}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    });
}, observerOptions);

// Observe all headings
headings.forEach(heading => {
    if (heading.id) {
        observer.observe(heading);
    }
});

// ============================================
// SEARCH MODAL
// ============================================

const searchBtn = document.getElementById('searchBtn');
const searchModal = document.getElementById('searchModal');
const searchBackdrop = document.getElementById('searchBackdrop');
const searchInput = document.getElementById('searchInput');

// Open search modal
function openSearch() {
    searchModal.classList.add('active');
    searchInput.focus();
}

// Close search modal
function closeSearch() {
    searchModal.classList.remove('active');
    searchInput.value = '';
}

// Event listeners
searchBtn.addEventListener('click', openSearch);
searchBackdrop.addEventListener('click', closeSearch);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+K or Cmd+K to open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
    }
    
    // Escape to close search
    if (e.key === 'Escape' && searchModal.classList.contains('active')) {
        closeSearch();
    }
});

// Search functionality (mock)
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-empty">
                <p>Start typing to search...</p>
            </div>
        `;
        return;
    }
    
    // Mock search results
    const mockResults = [
        { title: 'Introduction to TradingSystem', url: '#introduction' },
        { title: 'Architecture Overview', url: '#architecture' },
        { title: 'Installation Guide', url: '#installation' },
        { title: 'API Reference', url: '#api-reference' },
        { title: 'Quick Start', url: '#quick-start' }
    ].filter(result => result.title.toLowerCase().includes(query));
    
    if (mockResults.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-empty">
                <p>No results found for "${query}"</p>
            </div>
        `;
        return;
    }
    
    resultsContainer.innerHTML = mockResults.map(result => `
        <a href="${result.url}" class="search-result">
            <div class="search-result-title">${result.title}</div>
        </a>
    `).join('');
});

// ============================================
// CODE BLOCK COPY BUTTON
// ============================================

const copyButtons = document.querySelectorAll('.copy-button');

copyButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const codeId = button.getAttribute('data-copy');
        const codeElement = document.getElementById(codeId);
        
        if (!codeElement) return;
        
        const text = codeElement.textContent;
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied!
            `;
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });
});

// ============================================
// SMOOTH SCROLL
// ============================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Ignore # only links
        if (href === '#') return;
        
        e.preventDefault();
        
        const target = document.querySelector(href);
        if (target) {
            const navbarHeight = 60;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight - 20;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Close search if open
            if (searchModal.classList.contains('active')) {
                closeSearch();
            }
        }
    });
});

// ============================================
// MOBILE MENU (for future implementation)
// ============================================

// Add mobile menu toggle button
const createMobileMenu = () => {
    const navbar = document.querySelector('.navbar-container');
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-toggle';
    menuButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
    `;
    
    menuButton.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('active');
    });
    
    // Insert after navbar brand
    const navbarBrand = document.querySelector('.navbar-brand');
    navbarBrand.after(menuButton);
};

// Initialize mobile menu on small screens
if (window.innerWidth <= 996) {
    createMobileMenu();
}

// ============================================
// ANALYTICS (placeholder)
// ============================================

// Track page views
const trackPageView = () => {
    console.log('Page view:', window.location.pathname);
    // Add your analytics code here (Google Analytics, Plausible, etc.)
};

// Track link clicks
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        console.log('Link clicked:', link.href);
        // Add your analytics code here
    });
});

// Initial page view
trackPageView();

// ============================================
// PERFORMANCE MONITORING
// ============================================

// Log performance metrics
window.addEventListener('load', () => {
    if (window.performance) {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        console.log('Page load time:', pageLoadTime + 'ms');
    }
});

// ============================================
// EASTER EGG (Gemini CLI Style)
// ============================================

let konamiCode = [];
const konamiPattern = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65]; // ↑↑↓↓←→←→BA

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.keyCode);
    
    if (konamiCode.length > konamiPattern.length) {
        konamiCode.shift();
    }
    
    if (JSON.stringify(konamiCode) === JSON.stringify(konamiPattern)) {
        console.log('🎉 Konami Code activated! Welcome to TradingSystem!');
        document.body.style.animation = 'rainbow 2s linear infinite';
        
        setTimeout(() => {
            document.body.style.animation = '';
        }, 5000);
    }
});

// ============================================
// ACCESSIBILITY ENHANCEMENTS
// ============================================

// Skip to content link
const createSkipLink = () => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to content';
    skipLink.style.cssText = `
        position: absolute;
        top: -40px;
        left: 0;
        background: var(--color-primary);
        color: white;
        padding: 0.5rem 1rem;
        text-decoration: none;
        z-index: 10000;
    `;
    
    skipLink.addEventListener('focus', () => {
        skipLink.style.top = '0';
    });
    
    skipLink.addEventListener('blur', () => {
        skipLink.style.top = '-40px';
    });
    
    document.body.prepend(skipLink);
};

createSkipLink();

// Focus visible only for keyboard navigation
let isUsingKeyboard = false;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        isUsingKeyboard = true;
        document.body.classList.add('keyboard-nav');
    }
});

document.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('keyboard-nav');
});

console.log('✅ TradingSystem Documentation loaded successfully!');
console.log('🎨 Theme: Gemini CLI');
console.log('📚 Press Ctrl+K to search');
