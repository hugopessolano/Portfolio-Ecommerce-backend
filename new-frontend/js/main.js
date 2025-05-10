import { setupLoginForm, setupLogoutButton } from './auth.js';
import { setupNavigation, loadInitialView } from './navigation.js';
import { resetFullState } from './state.js';

// This function runs when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('[main.js] DOM fully loaded. Initializing application.');

    // Reset application state on full page load (useful for development, might adjust for production)
    resetFullState();

    // Setup authentication listeners (login form on index.html, logout button on dashboard.html)
    setupLoginForm();
    setupLogoutButton();

    // Setup navigation listeners (sidebar links on dashboard.html)
    setupNavigation();

    // Load the initial view based on URL and token
    loadInitialView();

    console.log('[main.js] Initialization complete.');
});

// Note: Individual view modules (productView.js, customerView.js, etc.)
// are imported and called by navigation.js when needed.
// UI component setup (pagination, filters, sorting) is handled within each view module
// after the view's HTML structure is loaded into the DOM.
