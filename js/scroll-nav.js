document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.section-nav a[href^="#"]');
    const subLinks = document.querySelectorAll('.sub-items a[href^="#"]');
    const scrollNav = document.querySelector('.scroll-nav');
    const navToggle = document.querySelector('.nav-toggle');
    
    // Toggle navigation
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            scrollNav.classList.toggle('active');
            navToggle.classList.toggle('active');
            
            // Update icon
            const icon = navToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
    
    // Close navigation when clicking outside
    document.addEventListener('click', (e) => {
        if (!scrollNav.contains(e.target) && !navToggle.contains(e.target) && window.innerWidth <= 1400) {
            scrollNav.classList.remove('active');
            navToggle.classList.remove('active');
            const icon = navToggle.querySelector('i');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }
    });

    // Function to scroll to element with offset
    const scrollToElement = (element) => {
        const headerOffset = 80; // Height of the fixed header
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    };

    // Add smooth scrolling to all navigation links
    [...navLinks, ...subLinks].forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                // Remove active class from all links
                [...navLinks, ...subLinks].forEach(l => l.classList.remove('active'));
                
                // Add active class to clicked link
                link.classList.add('active');
                
                // If it's a sub-link, also activate its parent
                if (link.closest('.sub-items')) {
                    const parentLink = link.closest('li').querySelector('a');
                    if (parentLink) {
                        parentLink.classList.add('active');
                    }
                }
                
                // Close navigation on mobile after clicking
                if (window.innerWidth <= 1400) {
                    scrollNav.classList.remove('active');
                    navToggle.classList.remove('active');
                    const icon = navToggle.querySelector('i');
                    if (icon) {
                        icon.classList.add('fa-bars');
                        icon.classList.remove('fa-times');
                    }
                }
                
                // Scroll to the target element
                scrollToElement(targetElement);
            }
        });
    });

    // Update active section on scroll
    const updateActiveSection = () => {
        const scrollPosition = window.scrollY + 100; // Offset for better UX

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100; // Adjust for header
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all links
                navLinks.forEach(link => link.classList.remove('active'));
                
                // Add active class to current section link
                const activeLink = document.querySelector(`.section-nav a[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }

                // Check for sub-sections
                const subSections = section.querySelectorAll('[id]');
                subSections.forEach(subSection => {
                    const subSectionTop = subSection.offsetTop - 100; // Adjust for header
                    const subSectionHeight = subSection.offsetHeight;
                    const subSectionId = subSection.getAttribute('id');

                    if (scrollPosition >= subSectionTop && scrollPosition < subSectionTop + subSectionHeight) {
                        // Remove active class from all sub-links
                        subLinks.forEach(link => link.classList.remove('active'));
                        
                        // Add active class to current sub-section link
                        const activeSubLink = document.querySelector(`.sub-items a[href="#${subSectionId}"]`);
                        if (activeSubLink) {
                            activeSubLink.classList.add('active');
                        }
                    }
                });
            }
        });
    };

    // Update active section on scroll
    window.addEventListener('scroll', () => {
        requestAnimationFrame(updateActiveSection);
    });
    
    // Initial update
    updateActiveSection();
});
