document.addEventListener('DOMContentLoaded', () => {
    console.log('CourseMate AI Initialized');
    
    // Smooth scroll for anchors
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Sidebar mobility for smaller screens
    const toggleBtn = document.getElementById('mobile-sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (toggleBtn && sidebar && backdrop) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            backdrop.classList.toggle('hidden');
        });

        backdrop.addEventListener('click', () => {
            sidebar.classList.remove('active');
            backdrop.classList.add('hidden');
        });

        // Close sidebar on link click
        sidebar.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                sidebar.classList.remove('active');
                backdrop.classList.add('hidden');
            });
        });
    }
});
