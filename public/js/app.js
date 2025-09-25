// IT Ticketing System - Enhanced JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize popovers
    var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    var popoverList = popoverTriggerList.map(function(popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });

    // Enhanced table interactions
    const tables = document.querySelectorAll('.table tbody tr');
    tables.forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.tagName.toLowerCase() !== 'a' && e.target.tagName.toLowerCase() !== 'button') {
                const link = this.querySelector('a[href*="/tickets/"]');
                if (link) {
                    window.location.href = link.href;
                }
            }
        });
    });

    // Loading states for forms
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...';
            }
        });
    });

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('show');
                }
            }
        });
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Confirmation dialogs
    const confirmButtons = document.querySelectorAll('[data-confirm]');
    confirmButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const message = this.getAttribute('data-confirm');
            if (!confirm(message)) {
                e.preventDefault();
            }
        });
    });

    // Auto-update timestamps
    function updateTimestamps() {
        const timestamps = document.querySelectorAll('[data-timestamp]');
        timestamps.forEach(element => {
            const timestamp = parseInt(element.getAttribute('data-timestamp'));
            const date = new Date(timestamp * 1000);
            const now = new Date();
            const diff = now - date;
            
            let timeAgo;
            if (diff < 60000) {
                timeAgo = 'Just now';
            } else if (diff < 3600000) {
                timeAgo = Math.floor(diff / 60000) + ' minutes ago';
            } else if (diff < 86400000) {
                timeAgo = Math.floor(diff / 3600000) + ' hours ago';
            } else {
                timeAgo = Math.floor(diff / 86400000) + ' days ago';
            }
            
            element.textContent = timeAgo;
            element.setAttribute('title', date.toLocaleString());
        });
    }

    // Update timestamps every minute
    updateTimestamps();
    setInterval(updateTimestamps, 60000);

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll('.table tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // Priority and status filters
    const priorityFilter = document.getElementById('priorityFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    function applyFilters() {
        const rows = document.querySelectorAll('.table tbody tr');
        const selectedPriority = priorityFilter ? priorityFilter.value : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';
        
        rows.forEach(row => {
            let showRow = true;
            
            if (selectedPriority && selectedPriority !== 'all') {
                const priorityElement = row.querySelector('[class*="priority-"]');
                if (!priorityElement || !priorityElement.className.includes(selectedPriority)) {
                    showRow = false;
                }
            }
            
            if (selectedStatus && selectedStatus !== 'all') {
                const statusElement = row.querySelector('[class*="status-"]');
                if (!statusElement || !statusElement.className.includes(selectedStatus)) {
                    showRow = false;
                }
            }
            
            row.style.display = showRow ? '' : 'none';
        });
    }
    
    if (priorityFilter) {
        priorityFilter.addEventListener('change', applyFilters);
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K for search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.focus();
            }
        }
        
        // Escape to close modals and dropdowns
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal.show');
            openModals.forEach(modal => {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                }
            });
            
            const openDropdowns = document.querySelectorAll('.dropdown-menu.show');
            openDropdowns.forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }
    });

    // Add animation classes on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.card, .table, .alert');
    animateElements.forEach(element => {
        observer.observe(element);
    });
});

// Utility functions
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    const toast = createToast(message, type);
    toastContainer.appendChild(toast);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    return container;
}

function createToast(message, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'alert');
    
    const iconMap = {
        success: 'check-circle-fill',
        error: 'exclamation-circle-fill',
        warning: 'exclamation-triangle-fill',
        info: 'info-circle-fill'
    };
    
    const colorMap = {
        success: 'text-success',
        error: 'text-danger',
        warning: 'text-warning',
        info: 'text-info'
    };
    
    toast.innerHTML = `
        <div class="toast-header">
            <i class="bi bi-${iconMap[type] || iconMap.info} ${colorMap[type] || colorMap.info} me-2"></i>
            <strong class="me-auto">Notification</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    return toast;
}