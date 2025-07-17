// Vercel Analytics for static websites
(function() {
    // Load Vercel Analytics script for static websites
    const script = document.createElement('script');
    script.src = 'https://va.vercel-scripts.com/v1/script.js';
    script.defer = true;
    
    // Add the script to the head
    document.head.appendChild(script);
    
    // Initialize analytics when script loads
    script.onload = function() {
        if (window.va) {
            window.va('pageview');
            if (process.env.NODE_ENV === 'development') {
                console.log('Vercel Analytics initialized');
            }
        }
    };
    
    script.onerror = function() {
        console.warn('Failed to load Vercel Analytics');
    };
    
    // Track custom events
    window.trackEvent = function(eventName, properties = {}) {
        if (window.va) {
            window.va('event', { name: eventName, data: properties });
        }
    };
    
    // Track download clicks
    function trackDownloads() {
        const downloadLinks = document.querySelectorAll('a[href*="app-store"], a[href*="play.google"], .download-btn, .cta-button');
        downloadLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const platform = this.href.includes('app-store') ? 'iOS' : 
                               this.href.includes('play.google') ? 'Android' : 'Unknown';
                window.trackEvent('download_click', { platform: platform });
            });
        });
    }
    
    // Track creator program interest
    function trackCreatorInterest() {
        const creatorButtons = document.querySelectorAll('.creator-cta, [href="#creators"]');
        creatorButtons.forEach(button => {
            button.addEventListener('click', function() {
                window.trackEvent('creator_interest', { section: 'hero' });
            });
        });
    }
    
    // Initialize tracking when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            trackDownloads();
            trackCreatorInterest();
        });
    } else {
        trackDownloads();
        trackCreatorInterest();
    }
})(); 