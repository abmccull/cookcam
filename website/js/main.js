// CookCam AI Website JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    initMobileMenu();
    
    // Smooth scrolling for anchor links
    initSmoothScrolling();
    
    // Navbar scroll effects
    initNavbarEffects();
    
    // Animate elements on scroll
    initScrollAnimations();
    
    // Form handling
    initFormHandling();
    
    // Analytics tracking
    initAnalytics();
    
    // Revenue calculator
    initRevenueCalculator();
});

// Mobile Menu
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            mobileMenuBtn.classList.toggle('active');
            
            // Animate hamburger menu
            const spans = mobileMenuBtn.querySelectorAll('span');
            spans.forEach(span => span.classList.toggle('active'));
        });
        
        // Close menu when clicking on links
        const navLinksItems = navLinks.querySelectorAll('a');
        navLinksItems.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                mobileMenuBtn.classList.remove('active');
            }
        });
    }
}

// Smooth Scrolling
function initSmoothScrolling() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                const headerOffset = 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Navbar Effects
function initNavbarEffects() {
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    if (navbar) {
        window.addEventListener('scroll', function() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            
            // Add/remove scrolled class
            if (scrollTop > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            
            // Hide/show navbar on scroll
            if (scrollTop > lastScrollTop && scrollTop > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
            
            lastScrollTop = scrollTop;
        });
    }
}

// Scroll Animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                // Add staggered animation for cards
                if (entry.target.classList.contains('feature-card') || 
                    entry.target.classList.contains('persona-card') ||
                    entry.target.classList.contains('revenue-card') ||
                    entry.target.classList.contains('story-card')) {
                    
                    const cards = entry.target.parentElement.children;
                    Array.from(cards).forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate-in');
                        }, index * 100);
                    });
                }
            }
        });
    }, observerOptions);
    
    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .persona-card, .revenue-card, .story-card, .tool-card, .scenario, .hero-stats, .download-features');
    animateElements.forEach(el => observer.observe(el));
}

// Form Handling
function initFormHandling() {
    // Creator program application
    const creatorButtons = document.querySelectorAll('a[href*="creator"]');
    creatorButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.textContent.includes('Apply')) {
                e.preventDefault();
                showCreatorApplicationModal();
            }
        });
    });
    
    // Download tracking
    const downloadButtons = document.querySelectorAll('.download-btn');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const platform = this.href.includes('apple') ? 'iOS' : 'Android';
            trackEvent('download_click', { platform: platform });
        });
    });
}

// Creator Application Modal
function showCreatorApplicationModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Join the CookCam AI Creator Program</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Ready to start earning with CookCam AI? Our creator program offers:</p>
                <ul>
                    <li>✅ 30% lifetime revenue share from referrals</li>
                    <li>✅ 100% of tips from your content</li>
                    <li>✅ 70% of collection sales</li>
                    <li>✅ No subscriber minimums to start</li>
                </ul>
                <p><strong>Next Steps:</strong></p>
                <ol>
                    <li>Download the CookCam AI app</li>
                    <li>Create your account</li>
                    <li>Upgrade to Creator tier ($9.99/month)</li>
                    <li>Start creating and sharing content</li>
                    <li>Earn money immediately!</li>
                </ol>
                <div class="modal-actions">
                    <a href="https://apps.apple.com/app/cookcam-ai" class="btn btn-primary" onclick="trackEvent('creator_signup_ios')">Download for iOS</a>
                    <a href="https://play.google.com/store/apps/details?id=com.cookcam.app" class="btn btn-primary" onclick="trackEvent('creator_signup_android')">Download for Android</a>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Close modal handlers
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    function closeModal() {
        document.body.removeChild(modal);
        document.body.style.overflow = '';
    }
    
    // Escape key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// Analytics
function initAnalytics() {
    // Track page view
    trackEvent('page_view', {
        page: window.location.pathname,
        referrer: document.referrer
    });
    
    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', function() {
        const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
            
            // Track milestones
            if ([25, 50, 75, 90].includes(scrollPercent)) {
                trackEvent('scroll_depth', { percent: scrollPercent });
            }
        }
    });
    
    // Track time on page
    const startTime = Date.now();
    window.addEventListener('beforeunload', function() {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        trackEvent('time_on_page', { seconds: timeSpent });
    });
}

// Event tracking function
function trackEvent(eventName, properties = {}) {
    // In a real implementation, this would send to your analytics service
    // For now, just log to console
    console.log('Event:', eventName, properties);
    
    // Example: Send to Google Analytics, Mixpanel, etc.
    // if (window.gtag) {
    //     gtag('event', eventName, properties);
    // }
}

// Utility Functions
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

function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Performance optimizations
const debouncedResize = debounce(function() {
    // Handle window resize
    const mobileBreakpoint = 768;
    const isMobile = window.innerWidth < mobileBreakpoint;
    
    document.body.classList.toggle('mobile', isMobile);
}, 250);

window.addEventListener('resize', debouncedResize);

// Add CSS classes for animations
const style = document.createElement('style');
style.textContent = `
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }
    
    .modal-content {
        background: white;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 2rem 2rem 1rem;
        border-bottom: 1px solid #E5E5E7;
    }
    
    .modal-header h3 {
        margin: 0;
        color: #2D1B69;
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 2rem;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
    }
    
    .modal-close:hover {
        background: #f0f0f0;
        color: #333;
    }
    
    .modal-body {
        padding: 1rem 2rem 2rem;
    }
    
    .modal-body ul, .modal-body ol {
        margin: 1rem 0;
        padding-left: 1.5rem;
    }
    
    .modal-body li {
        margin-bottom: 0.5rem;
    }
    
    .modal-actions {
        display: flex;
        gap: 1rem;
        margin-top: 2rem;
        flex-wrap: wrap;
    }
    
    .modal-actions .btn {
        flex: 1;
        min-width: 200px;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from { 
            opacity: 0;
            transform: translateY(30px);
        }
        to { 
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .nav-links.active {
        display: flex !important;
        position: fixed;
        top: 80px;
        left: 0;
        right: 0;
        background: white;
        flex-direction: column;
        padding: 2rem;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        z-index: 999;
    }
    
    .navbar.scrolled {
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
    }
    
    @media (max-width: 768px) {
        .modal-content {
            margin: 2rem;
            width: calc(100% - 4rem);
        }
        
        .modal-actions {
            flex-direction: column;
        }
        
        .modal-actions .btn {
            min-width: auto;
        }
    }
`;

document.head.appendChild(style);

// Initialize everything when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('CookCam AI website loaded successfully! 🍳');
}

// Revenue Calculator
function initRevenueCalculator() {
    const viewsSlider = document.getElementById('calcViews');
    const sponsorshipSlider = document.getElementById('calcSponsorship');
    
    if (viewsSlider && sponsorshipSlider) {
        // Initial calculation
        updateCalculator();
        
        // Event listeners
        viewsSlider.addEventListener('input', updateCalculator);
        sponsorshipSlider.addEventListener('input', updateCalculator);
    }
}

function updateCalculator() {
    const views = parseInt(document.getElementById('calcViews').value);
    const sponsorship = parseInt(document.getElementById('calcSponsorship').value);
    
    // Update display values
    document.getElementById('calcViewsDisplay').textContent = formatViews(views);
    document.getElementById('calcSponsorshipDisplay').textContent = sponsorship.toLocaleString();
    
    // Calculate CookCam revenue
    const clickRate = 1.2; // 1.2% CTR
    const conversionRate = 10; // 10% conversion
    const churnRate = 6; // 6% monthly churn
    const premiumMix = 25; // 25% premium subscriptions
    const revenueShare = 30; // 30% revenue share
    
    const clicks = Math.round(views * (clickRate / 100));
    const conversions = Math.round(clicks * (conversionRate / 100));
    
    // Calculate subscription mix
    const premiumSubs = Math.round(conversions * (premiumMix / 100));
    const basicSubs = conversions - premiumSubs;
    
    // Calculate 12-month revenue with churn
    let totalRevenue = 0;
    let currentBasicSubs = basicSubs;
    let currentPremiumSubs = premiumSubs;
    
    for (let month = 1; month <= 12; month++) {
        const monthlyBasicRevenue = currentBasicSubs * 3.99;
        const monthlyPremiumRevenue = currentPremiumSubs * 9.99;
        const monthlyGrossRevenue = monthlyBasicRevenue + monthlyPremiumRevenue;
        const monthlyCreatorRevenue = monthlyGrossRevenue * (revenueShare / 100);
        
        totalRevenue += monthlyCreatorRevenue;
        
        // Apply churn for next month
        if (month < 12) {
            currentBasicSubs = Math.round(currentBasicSubs * (1 - churnRate / 100));
            currentPremiumSubs = Math.round(currentPremiumSubs * (1 - churnRate / 100));
        }
    }
    
    const finalSubs = currentBasicSubs + currentPremiumSubs;
    const finalMonthlyRevenue = (currentBasicSubs * 3.99 + currentPremiumSubs * 9.99) * (revenueShare / 100);
    const multiplier = totalRevenue / sponsorship;
    
    // Update displays
    document.getElementById('traditionalAmount').textContent = sponsorship.toLocaleString();
    document.getElementById('cookcamAmount').textContent = Math.round(totalRevenue).toLocaleString();
    document.getElementById('revenueMultiplier').textContent = multiplier.toFixed(1);
    document.getElementById('totalReferrals').textContent = conversions.toLocaleString();
    document.getElementById('activeSubs').textContent = finalSubs.toLocaleString();
    document.getElementById('monthlyRecurring').textContent = Math.round(finalMonthlyRevenue).toLocaleString();
}

function formatViews(views) {
    if (views >= 1000000) {
        return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
        return (views / 1000).toFixed(0) + 'K';
    }
    return views.toString();
}

function setCalcValue(sliderId, value) {
    const slider = document.getElementById(sliderId);
    if (slider) {
        slider.value = value;
        updateCalculator();
    }
} 