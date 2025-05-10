// --- Date Formatting Utility ---
export const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return 'Invalid Date'; // Check for invalid date object
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
        console.error("Error formatting date:", isoString, e);
        return 'Invalid Date';
    }
};

// --- Authentication Utility ---
export const getToken = () => {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
};

// --- Error Message Utilities ---
export const showLoginErrorMessage = (message) => {
    const errorMessageDiv = document.getElementById('error-message'); // Assumes this ID exists on the login page
    if (errorMessageDiv) {
        errorMessageDiv.textContent = message;
        errorMessageDiv.classList.add('show');
    } else {
        console.warn("Login error message div ('error-message') not found.");
    }
};

export const hideLoginErrorMessage = () => {
    const errorMessageDiv = document.getElementById('error-message');
    if (errorMessageDiv) {
        errorMessageDiv.classList.remove('show');
    }
};

// Helper to display errors within the main content area
export const showContentError = (message) => {
    const contentArea = document.querySelector('.content-area'); // Assumes this class exists in dashboard.html
    if (contentArea) {
        contentArea.innerHTML = `<p class="error-message show" style="margin: 20px;">${message}</p>`;
    } else {
        console.error("Content area element ('.content-area') not found. Cannot display error:", message);
    }
    console.error(message); // Log regardless
};

// Helper to clear the content area and show generic loading
export const clearContentArea = () => {
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.innerHTML = '<h1 class="loading-placeholder">Cargando...</h1>';
    } else {
        console.warn("Content area element ('.content-area') not found. Cannot clear.");
    }
};

// --- Pagination Utilities ---

// Helper function to extract page number from URL parameter
export const getPageNumberFromUrl = (url) => {
    if (!url) return null;
    try {
        // Use a dummy base URL if the provided URL is relative (e.g., just a path and query string)
        const fullUrl = url.startsWith('http') ? url : `http://dummybase.com${url}`;
        const urlObj = new URL(fullUrl);
        const pageParam = urlObj.searchParams.get('page');
        const pageNum = pageParam ? parseInt(pageParam) : null;
        return !isNaN(pageNum) ? pageNum : null;
    } catch (e) {
        console.error("[getPageNumberFromUrl] Error parsing URL:", url, e);
        return null;
    }
};

// --- UI Utilities ---

// Utility to toggle button states (used during edit/create)
export const toggleActionButtonsDisabled = (disabled, viewType) => {
    // Disable general action buttons (copy, edit, delete)
    document.querySelectorAll('.action-icon-btn:not(.save-btn):not(.cancel-btn):not(.save-new-btn):not(.cancel-create-btn)')
        .forEach(btn => btn.disabled = disabled);

    // Disable the specific "Create" button for the current view
    let createButtonId;
    switch (viewType) {
        case 'products':
            createButtonId = 'create-product-button';
            break;
        case 'customers':
            createButtonId = 'create-customer-button';
            break;
        // Add cases for orders, stores if they get create buttons
        default:
            console.warn(`[toggleActionButtonsDisabled] Unknown viewType: ${viewType}. Cannot target create button.`);
            return;
    }

    const createBtn = document.getElementById(createButtonId);
    if (createBtn) {
        createBtn.disabled = disabled;
    } else {
        console.warn(`[toggleActionButtonsDisabled] Create button with ID '${createButtonId}' not found.`);
    }
};
