 // --- SCROLL FIX: Forces page to top on refresh ---
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);
        // -------------------------------------------------

        const themeToggle = document.getElementById('theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const brandLogo = document.getElementById('brand-logo');
        const heroImgDesktop = document.getElementById('hero-img-desktop');
        const heroImgMobile = document.getElementById('hero-img-mobile');

        const applyTheme = (theme) => {
            if (theme === 'dark') {
                document.body.classList.add('dark-mode');
                themeIcon.className = 'ri-sun-line';
                brandLogo.src = 'white.svg';
                if(heroImgDesktop) heroImgDesktop.src = 'dex-dark.png';
                if(heroImgMobile) heroImgMobile.src = 'm-dark.png';
                localStorage.setItem('box_theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                themeIcon.className = 'ri-moon-line';
                brandLogo.src = 'dark.svg';
                if(heroImgDesktop) heroImgDesktop.src = 'dex-light.png';
                if(heroImgMobile) heroImgMobile.src = 'm-white.png';
                localStorage.setItem('box_theme', 'light');
            }
        };

        themeToggle.addEventListener('click', () => {
            const currentTheme = localStorage.getItem('box_theme') || 'light';
            applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        });

        document.addEventListener('DOMContentLoaded', () => {
            const savedTheme = localStorage.getItem('box_theme') || 'light';
            applyTheme(savedTheme);
            
            const heroCtaBtn = document.getElementById('hero-cta-btn');
            const dashboardBtn = document.getElementById('dashboard-btn');
            const isAuthenticated = localStorage.getItem('box_auth');

            if (isAuthenticated) {
                if (heroCtaBtn) heroCtaBtn.classList.add('hidden');
                if (dashboardBtn) dashboardBtn.classList.remove('hidden');
            } else {
                if (heroCtaBtn) heroCtaBtn.classList.remove('hidden');
                if (dashboardBtn) dashboardBtn.classList.add('hidden');
            }

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    }
                });
            }, { threshold: 0.1 });

            const elementsToAnimate = document.querySelectorAll('.fade-in');
            elementsToAnimate.forEach(el => observer.observe(el));
        });