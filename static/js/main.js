// ============================================================
//  CourseMate AI — main.js
//  Global UI interactions: mobile sidebar + file drag-and-drop
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------------
    // Mobile Sidebar Toggle
    // ----------------------------------------------------------
    const toggleBtn  = document.getElementById('mobile-sidebar-toggle');
    const sidebar    = document.getElementById('sidebar');
    const backdrop   = document.getElementById('sidebar-backdrop');

    function openSidebar() {
        sidebar.classList.add('active');
        backdrop.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        backdrop.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (toggleBtn)  toggleBtn.addEventListener('click', openSidebar);
    if (backdrop)   backdrop.addEventListener('click', closeSidebar);

    // Close sidebar on nav link click (mobile)
    sidebar?.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth <= 1024) closeSidebar();
        });
    });

    // ----------------------------------------------------------
    // File Upload Drag-and-Drop highlighting (notes page)
    // ----------------------------------------------------------
    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
        ['dragenter', 'dragover'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, e => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
        });

        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const fileInput = document.getElementById('note-file');
                if (fileInput) {
                    // Assign dropped file to the hidden input
                    const dt = new DataTransfer();
                    dt.items.add(files[0]);
                    fileInput.files = dt.files;
                    // Trigger change event so the filename display updates
                    fileInput.dispatchEvent(new Event('change'));
                }
            }
        });
    }

    // ----------------------------------------------------------
    // Staggered card entry animation (dashboard action cards)
    // ----------------------------------------------------------
    document.querySelectorAll('.action-card').forEach((card, i) => {
        card.style.animationDelay = `${0.05 * (i + 1)}s`;
        card.style.animationFillMode = 'both';
    });

    document.querySelectorAll('.stat-card').forEach((card, i) => {
        card.style.animationDelay = `${0.04 * i}s`;
        card.style.animationFillMode = 'both';
        card.style.animation = `pageEntry 0.4s cubic-bezier(0.22,1,0.36,1) ${0.04 * i}s both`;
    });

});
