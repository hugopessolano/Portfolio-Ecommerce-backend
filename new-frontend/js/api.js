import { getToken, showContentError } from './utils.js';
import * as config from './config.js';
import { setAvailableStores, availableStores } from './state.js'; // Import state setter/getter if needed

// --- Core Fetch Utility ---
export const fetchData = async (url, options = {}) => {
    console.log(`[fetchData] Attempting to fetch: ${url}`);
    const token = getToken();
    if (!token && !url.endsWith('/auth/login')) { // Don't redirect if it's the login call itself
        console.log("[fetchData] No token found, redirecting to login.");
        window.location.href = 'index.html'; // Assuming index.html is the login page
        return { error: 'No token', response: null, data: null };
    }

    const defaultHeaders = { 'Content-Type': 'application/json' };
    if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Special handling for login form data
    let body = options.body;
    if (url.endsWith('/auth/login')) {
        defaultHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        // Body should be URLSearchParams instance for login
    } else if (body && typeof body !== 'string' && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
        // Automatically stringify body if it's an object and not FormData/URLSearchParams
        body = JSON.stringify(body);
    }


    try {
        const response = await fetch(url, {
            ...options,
            headers: { ...defaultHeaders, ...options.headers }, // Merge headers, allowing overrides
            body: body // Use potentially modified body
        });
        console.log(`[fetchData] Fetch executed for ${url}. Status: ${response.status}`);

        if (response.status === 401 && !url.endsWith('/auth/login')) {
            console.log("[fetchData] Unauthorized (401). Redirecting to login.");
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('authToken');
            window.location.href = 'index.html';
            return { error: 'Unauthorized', response: null, data: null };
        }

        let data = null;
        const contentType = response.headers.get("content-type");

        if (!response.ok) {
            let detailMessage = `Error ${response.status}: ${response.statusText}`;
            try {
                const errorText = await response.text();
                console.error(`[fetchData] Error body for ${url}:`, errorText);
                // Try parsing as JSON only if content type suggests it
                if (contentType && contentType.includes("application/json")) {
                    const jsonError = JSON.parse(errorText);
                    if (jsonError && jsonError.detail) {
                        // Handle potential array of details from validation errors
                        if (Array.isArray(jsonError.detail)) {
                            detailMessage = jsonError.detail.map(err => `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`).join('; ');
                        } else {
                            detailMessage = jsonError.detail;
                        }
                    }
                } else {
                    // Use the raw text if not JSON
                    detailMessage = errorText || detailMessage;
                }
            } catch (e) {
                console.warn("[fetchData] Could not parse error body or extract detail.");
            }
            console.error(`[fetchData] Fetch failed for ${url}:`, detailMessage);
            return { error: detailMessage, response: response, data: null };
        }

        // Process successful response
        if (contentType && contentType.includes("application/json") && response.status !== 204) { // 204 No Content
            try {
                data = await response.json();
                console.log(`[fetchData] JSON data parsed successfully for ${url}.`);
            } catch (e) {
                console.error(`[fetchData] Failed to parse JSON for ${url}:`, e);
                return { error: 'Failed to parse JSON response', response: response, data: null };
            }
        } else if (response.status === 204) {
            console.log(`[fetchData] Success (204 No Content) for ${url}.`);
        } else {
            console.log(`[fetchData] Success (Non-JSON or empty) for ${url}. Content-Type: ${contentType}`);
        }
        console.log(`[fetchData] Success processing for ${url}.`);
        // Explicitly return response for header access etc.
        return { error: null, response: response, data: data };

    } catch (error) {
        console.error(`[fetchData] Network or other error fetching ${url}:`, error);
        // Provide a more user-friendly network error message
        const networkErrorMsg = 'Error de red o no se pudo conectar al servidor. Por favor, comprueba tu conexión e inténtalo de nuevo.';
        return { error: networkErrorMsg, response: null, data: null };
    }
};


// --- Specific API Call Functions ---

// Authentication
export const loginUser = async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return await fetchData(config.LOGIN_ENDPOINT, {
        method: 'POST',
        body: formData // fetchData handles the content type
    });
};

// Stores
export const fetchAllStores = async () => {
    console.log('[fetchAllStores] Starting...');
    let fetchedStores = []; // Use a local variable to accumulate
    let page = 1;
    const pageSize = 100; // Fetch large pages to minimize requests
    let hasMorePages = true;
    let safetyCounter = 0; // Prevent infinite loops

    while (hasMorePages && safetyCounter < 50) { // Safety limit
        safetyCounter++;
        const url = `${config.STORES_ENDPOINT}?page=${page}&page_size=${pageSize}`;
        console.log(`[fetchAllStores] Fetching page ${page}`);
        const { error, response, data } = await fetchData(url); // Use the core fetchData

        if (error) {
            console.error(`[fetchAllStores] Error fetching page ${page}:`, error);
            showContentError(`No se pudo cargar la lista completa de tiendas: ${error}`);
            return false; // Indicate failure
        }

        if (data && Array.isArray(data)) {
            fetchedStores = fetchedStores.concat(data);
        }

        // Check for next page using headers (more reliable than guessing)
        const nextPageHeader = response?.headers?.get('x-next-page');
        if (nextPageHeader) {
            // Basic check: if the header exists, assume there's a next page.
            // More robust: parse the URL and check if the page number increases.
            console.log(`[fetchAllStores] Next page header found: ${nextPageHeader}. Continuing.`);
            page++; // Increment page number based on header presence (simplistic)
            // Or parse page number from header if needed: page = getPageNumberFromUrl(nextPageHeader) || page + 1;
        } else {
            console.log('[fetchAllStores] No next page header found. Assuming end of pages.');
            hasMorePages = false;
        }
    }

    if (safetyCounter >= 50) {
        console.warn("[fetchAllStores] Safety limit reached fetching stores.");
    }

    // Sort stores alphabetically by name (or ID if name is missing)
    fetchedStores.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

    setAvailableStores(fetchedStores); // Update the shared state
    console.log(`[fetchAllStores] Finished. Total stores fetched: ${availableStores.length}`);
    return true; // Indicate success
};

export const getStores = async (page = 1, pageSize = 20, sortKey = null, sortDir = 'asc') => {
    let url = `${config.STORES_ENDPOINT}?page=${page}&page_size=${pageSize}`;
    if (sortKey) {
        url += `&order_by=${sortKey}&order_dir=${sortDir}`;
    }
    return await fetchData(url);
};

// Products
export const getProducts = async (page = 1, pageSize = 20, sortKey = null, sortDir = 'asc') => {
    let url = `${config.PRODUCTS_ENDPOINT}?page=${page}&page_size=${pageSize}`;
    if (sortKey) {
        url += `&order_by=${sortKey}&order_dir=${sortDir}`;
    }
    return await fetchData(url);
};

export const getProductsByStore = async (storeId, page = 1, pageSize = 20, sortKey = null, sortDir = 'asc') => {
    let url = `${config.PRODUCTS_ENDPOINT}/store/${storeId}?page=${page}&page_size=${pageSize}`;
    if (sortKey) {
        url += `&order_by=${sortKey}&order_dir=${sortDir}`;
    }
    return await fetchData(url);
};

export const createProduct = async (productData) => {
    return await fetchData(config.PRODUCTS_ENDPOINT, {
        method: 'POST',
        body: productData // fetchData will stringify
    });
};

export const updateProduct = async (productId, productData) => {
    return await fetchData(`${config.PRODUCTS_ENDPOINT}/${productId}`, {
        method: 'PUT',
        body: productData // fetchData will stringify
    });
};

export const deleteProduct = async (productId) => {
    return await fetchData(`${config.PRODUCTS_ENDPOINT}/${productId}`, {
        method: 'DELETE'
    });
};

// Customers
export const getCustomers = async (page = 1, pageSize = 20, sortKey = null, sortDir = 'asc') => {
    let url = `${config.CUSTOMERS_ENDPOINT}?page=${page}&page_size=${pageSize}`;
    if (sortKey) {
        url += `&order_by=${sortKey}&order_dir=${sortDir}`;
    }
    return await fetchData(url);
};

export const getCustomersByStore = async (storeId, page = 1, pageSize = 20, sortKey = null, sortDir = 'asc') => {
    let url = `${config.CUSTOMERS_ENDPOINT}/store/${storeId}?page=${page}&page_size=${pageSize}`;
    if (sortKey) {
        url += `&order_by=${sortKey}&order_dir=${sortDir}`;
    }
    return await fetchData(url);
};

export const createCustomer = async (customerData) => {
    return await fetchData(config.CUSTOMERS_ENDPOINT, {
        method: 'POST',
        body: customerData // fetchData will stringify
    });
};

export const updateCustomer = async (customerId, customerData) => {
    // Note: Backend schema might only allow updating certain fields (name, email, phone)
    return await fetchData(`${config.CUSTOMERS_ENDPOINT}/${customerId}`, {
        method: 'PUT',
        body: customerData // fetchData will stringify
    });
};

export const deleteCustomer = async (customerId) => {
    return await fetchData(`${config.CUSTOMERS_ENDPOINT}/${customerId}`, {
        method: 'DELETE'
    });
};

// Orders
export const getOrders = async (page = 1, pageSize = 20, sortKey = null, sortDir = 'asc') => {
    let url = `${config.ORDERS_ENDPOINT}?page=${page}&page_size=${pageSize}`;
    if (sortKey) {
        url += `&order_by=${sortKey}&order_dir=${sortDir}`;
    }
    return await fetchData(url);
};

export const getOrderById = async (orderId) => {
    const url = `${config.ORDERS_ENDPOINT}/${orderId}`;
    return await fetchData(url);
};

// Add other order-related API calls if needed (createOrder, etc.)
