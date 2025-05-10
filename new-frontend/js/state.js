// --- State Variables ---
// Using 'let' for variables that will be reassigned.
// Consider wrapping these in an object or using getter/setter functions
// if state management becomes more complex.

export let currentPage = 1;
export let currentPageSize = 20;
export let availableStores = []; // Holds ALL stores {id, name}
export let filterMode = 'all'; // 'all' or 'single'
export let selectedSingleStoreId = null; // ID of the store selected in single mode
export let originalRowData = null; // Store data of the row being edited (product or customer)
export let editingProductId = null; // Track which product is currently being edited
export let isCreatingProduct = false; // Track if the product create row is active
export let editingCustomerId = null; // Track which customer is currently being edited
export let isCreatingCustomer = false; // Track if the customer create row is active

export let currentSortKey = null; // 'name', 'price', 'stock', 'created_at', 'email', 'phone' etc.
export let currentSortDirection = 'asc'; // 'asc', 'desc'

// Functions to update state might be preferable to direct export/import of 'let' variables
// For example:
export function setCurrentPage(page) {
    currentPage = page;
}
export function setPageSize(size) {
    currentPageSize = size;
}
export function setAvailableStores(stores) {
    availableStores = stores;
}
export function setFilterMode(mode) {
    filterMode = mode;
}
export function setSelectedStoreId(storeId) {
    selectedSingleStoreId = storeId;
}
export function setOriginalRowData(data) {
    originalRowData = data;
}
export function setEditingProductId(productId) {
    editingProductId = productId;
}
export function setIsCreatingProduct(isCreating) {
    isCreatingProduct = isCreating;
}
export function setEditingCustomerId(customerId) {
    editingCustomerId = customerId;
}
export function setIsCreatingCustomer(isCreating) {
    isCreatingCustomer = isCreating;
}
export function setSort(key, direction) {
    currentSortKey = key;
    currentSortDirection = direction;
}

// Function to reset state, useful when changing views
export function resetViewState() {
    console.log("[State] Resetting view-specific state.");
    currentPage = 1;
    // currentPageSize = 20; // Keep page size preference? Or reset? Resetting for now.
    // availableStores = []; // Keep stores loaded? Or reload? Keeping loaded for now.
    filterMode = 'all';
    selectedSingleStoreId = null;
    originalRowData = null;
    editingProductId = null;
    isCreatingProduct = false;
    editingCustomerId = null;
    isCreatingCustomer = false;
    currentSortKey = null; // Reset sort
    currentSortDirection = 'asc';
}

export function resetFullState() {
    console.log("[State] Resetting full application state.");
    resetViewState();
    availableStores = []; // Clear stores on full reset
    currentPageSize = 20; // Reset page size on full reset
}
