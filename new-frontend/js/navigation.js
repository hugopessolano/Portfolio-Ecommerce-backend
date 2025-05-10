import { getToken, clearContentArea } from './utils.js';
import { resetViewState } from './state.js';
// Import view loading functions (they will be defined later)
import { loadProductsView } from './productView.js';
import { loadCustomersView } from './customerView.js';
import { loadOrdersView } from './orderView.js';
import { loadStoresView } from './storeView.js';
import { loadOrderDetailView } from './orderDetailView.js'; // Import the order detail view

const contentArea = document.querySelector('.content-area');

// Handles navigation when a sidebar link is clicked
export const handleNavigation = (targetId) => {
    console.log(`[Navigation] Navigating to: ${targetId}`);
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a'); // Ensure this selector matches dashboard.html
    if (!sidebarLinks.length) {
        console.warn("[Navigation] Sidebar links not found.");
        // Attempt to proceed anyway, but UI update might fail
    }

    sidebarLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-nav a[href="#${targetId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    } else {
        console.warn(`[Navigation] Active link for #${targetId} not found.`);
    }

    // Reset view-specific state before loading new view
    resetViewState();
    clearContentArea(); // Show loading message

    // Load the appropriate view based on the target ID
    // Check for specific view patterns first (like order details)
    if (targetId.startsWith('order/')) {
        const orderId = targetId.substring('order/'.length);
        if (orderId) {
            loadOrderDetailView(orderId);
        } else {
            console.warn(`[Navigation] Order detail target missing ID: ${targetId}`);
            if (contentArea) {
                 contentArea.innerHTML = '<h2>Error de Navegación</h2><p>ID de orden no especificado.</p>';
            }
        }
        return; // Stop processing if it's an order detail view
    }


    switch (targetId) {
        case 'products':
            loadProductsView();
            break;
        case 'customers':
            loadCustomersView();
            break;
        case 'orders':
            loadOrdersView();
            break;
        case 'stores':
            loadStoresView();
            break;
        // Add cases for other potential views like 'dashboard', 'settings', etc.
        case 'dashboard': // Example for a default/dashboard view
             if (contentArea) {
                 contentArea.innerHTML = '<h1>Panel Principal</h1><p>Selecciona una opción del menú lateral.</p>';
             }
             break;
        default:
            console.warn(`[Navigation] Unknown navigation target: ${targetId}`);
            if (contentArea) {
                const title = activeLink ? activeLink.textContent.replace('[Icon] ','') : 'Panel Principal';
                contentArea.innerHTML = `<h1>${title}</h1><p>Contenido no implementado para esta sección.</p>`;
            }
            break;
    }
};

// Sets up the event listeners for the sidebar navigation links
export function setupNavigation() {
    const sidebar = document.querySelector('.sidebar-nav'); // Target the container
    if (sidebar) {
        sidebar.addEventListener('click', (event) => {
            // Find the clicked link, even if the click was on an icon inside the link
            const link = event.target.closest('a');
            if (link && link.getAttribute('href')?.startsWith('#')) {
                event.preventDefault(); // Prevent default anchor link behavior
                const targetId = link.getAttribute('href').substring(1);
                if (targetId) {
                    // Update URL hash for bookmarking/history
                    window.location.hash = targetId;
                    // handleNavigation is now called by the hashchange listener
                }
            }
        });
        console.log('[Navigation] Sidebar navigation listeners setup complete.');
    } else {
        console.warn('[Navigation] Sidebar navigation container (.sidebar-nav) not found.');
    }
}


// Checks token and initial hash to load the correct view on page load
export const loadInitialView = () => {
    console.log('[Navigation] Initial load check...');
    const token = getToken();
    const path = window.location.pathname;
    const hash = window.location.hash.substring(1); // Get hash without the '#'

    // If on the dashboard page
    if (path.includes('dashboard.html')) {
        if (!token) {
            console.log("[Navigation] No token found on dashboard page, redirecting to login.");
            window.location.href = 'index.html'; // Redirect to login if no token
            return; // Stop further execution
        }

    // If there's a hash in the URL, navigate to that section
    if (hash) {
        console.log(`[Navigation] Initial hash detected: #${hash}. Navigating...`);
        // Use setTimeout to ensure the rest of the DOM is ready before navigating
        // This can sometimes help if view loading relies on elements created dynamically
        setTimeout(() => handleNavigation(hash), 0);
    } else {
        // No hash, load a default view (e.g., a welcome message or the first item)
        console.log("[Navigation] No initial hash, showing default dashboard panel.");
         // Optionally navigate to a default view like 'dashboard' or 'products'
         handleNavigation('dashboard'); // Default to dashboard view
     }
}
// If on the login page (index.html or root)
else if (path.includes('index.html') || path === '/' || path.endsWith('/ecommerce-backend-api/new-frontend/')) { // Adjust root path check as needed
    if (token) {
        console.log("[Navigation] Token found on login page, redirecting to dashboard.");
        window.location.href = 'dashboard.html'; // Redirect to dashboard if already logged in
    }
    // Otherwise, stay on the login page (auth.js handles login form setup)
}
console.log('[Navigation] Initial load check complete.');
};

// Add hashchange listener to handle navigation when the URL hash changes
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        handleNavigation(hash);
    } else {
        // Handle case where hash is cleared (e.g., user manually removes it)
        handleNavigation('dashboard'); // Navigate to default view
    }
});
console.log('[Navigation] Hashchange listener added.');
