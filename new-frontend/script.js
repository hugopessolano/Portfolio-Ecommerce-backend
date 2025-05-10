document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors (get them once) ---
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const errorMessageDiv = document.getElementById('error-message'); // For login page
    const contentArea = document.querySelector('.content-area');
    const sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    const logoutButton = document.getElementById('logout-button'); // Assumes logout button is persistent or re-added

    // --- Configuration ---
    const API_BASE_URL = 'http://127.0.0.1:8000'; // Confirm this is correct
    const LOGIN_ENDPOINT = `${API_BASE_URL}/auth/login`;
    const PRODUCTS_ENDPOINT = `${API_BASE_URL}/products`;
    const CUSTOMERS_ENDPOINT = `${API_BASE_URL}/customers`; // Added Customers endpoint
    const STORES_ENDPOINT = `${API_BASE_URL}/stores`;

    // --- State Variables ---
    let currentPage = 1;
    let currentPageSize = 20;
    let availableStores = []; // Holds ALL stores {id, name}
    let filterMode = 'all'; // 'all' or 'single'
    let selectedSingleStoreId = null; // ID of the store selected in single mode
    let originalRowData = null; // Store data of the row being edited
    let editingProductId = null; // Track which product is currently being edited
    let isCreatingProduct = false; // Track if the create row is active
    let editingCustomerId = null; // Track which customer is currently being edited
    let isCreatingCustomer = false; // Track if the customer create row is active


    let currentSortKey = null; // 'name', 'price', 'stock', 'created_at', 'email', 'phone'
    let currentSortDirection = 'asc'; // 'asc', 'desc'

    // --- SVG Icons --- (Define them once, maybe move outside renderProductTable if used elsewhere)
    const svgIconClipboard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
    const svgIconEdit = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
    const svgIconDelete = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`;
    const svgIconSave = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`; // Checkmark for Save
    const svgIconCancel = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18px" height="18px"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`; // Same as delete for Cancel

    // --- Date Formatting Utility ---
    const formatDate = (isoString) => {
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

    // --- Utility Functions ---
    const getToken = () => {
        return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    };

    const showLoginErrorMessage = (message) => {
        if (errorMessageDiv) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.classList.add('show');
        }
    };

    const hideLoginErrorMessage = () => {
        if (errorMessageDiv) {
            errorMessageDiv.classList.remove('show');
        }
    };

     // Helper to display errors within the main content area
    const showContentError = (message) => {
        if (contentArea) {
            contentArea.innerHTML = `<p class="error-message show" style="margin: 20px;">${message}</p>`;
        }
        console.error(message);
    };

    // Helper to clear the content area and show generic loading
    const clearContentArea = () => {
        if (contentArea) {
            contentArea.innerHTML = '<h1 class="loading-placeholder">Cargando...</h1>';
        }
    };


    // --- Core Fetch Utility ---
    const fetchData = async (url, options = {}) => {
        console.log(`[fetchData] Attempting to fetch: ${url}`);
        const token = getToken();
        if (!token) {
            console.log("[fetchData] No token found, redirecting to login.");
            window.location.href = 'index.html';
            return { error: 'No token', response: null, data: null };
        }
        const defaultHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        try {
            const response = await fetch(url, { ...options, headers: { ...defaultHeaders, ...options.headers } });
            console.log(`[fetchData] Fetch executed for ${url}. Status: ${response.status}`);

            if (response.status === 401) {
                console.log("[fetchData] Unauthorized (401). Redirecting to login.");
                localStorage.removeItem('authToken'); sessionStorage.removeItem('authToken');
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
                    const jsonError = JSON.parse(errorText); // Try parsing
                    if(jsonError && jsonError.detail) detailMessage = jsonError.detail;
                } catch(e){ console.warn("[fetchData] Could not parse error body as JSON."); }
                console.error(`[fetchData] Fetch failed for ${url}:`, detailMessage);
                return { error: detailMessage, response: response, data: null };
            }

            // Process successful response
            if (contentType && contentType.includes("application/json") && response.status !== 204) {
                try {
                    data = await response.json();
                    console.log(`[fetchData] JSON data parsed successfully for ${url}.`);
                } catch (e) {
                    console.error(`[fetchData] Failed to parse JSON for ${url}:`, e);
                    return { error: 'Failed to parse JSON response', response: response, data: null };
                 }
            } else {
                 console.log(`[fetchData] No JSON content or status 204 for ${url}.`);
            }
            console.log(`[fetchData] Success processing for ${url}.`);
            // Explicitly return response for header access
            return { error: null, response: response, data: data };

        } catch (error) {
            console.error(`[fetchData] Network or other error fetching ${url}:`, error);
            return { error: 'Network error or failed to fetch', response: null, data: null };
        }
    };


    // --- Fetch ALL Stores ---
    const fetchAllStores = async () => {
        console.log('[fetchAllStores] Starting...');
        availableStores = [];
        let page = 1;
        const pageSize = 100;
        let hasMorePages = true;
        let safetyCounter = 0;

        while (hasMorePages && safetyCounter < 50) {
            safetyCounter++;
            const url = `${STORES_ENDPOINT}?page=${page}&page_size=${pageSize}`;
            console.log(`[fetchAllStores] Fetching page ${page}`);
            const { error, response, data } = await fetchData(url);
            if (error) {
                console.error(`[fetchAllStores] Error fetching page ${page}:`, error);
                 showContentError(`No se pudo cargar la lista completa de tiendas: ${error}`);
                return false;
            }
            if (data && Array.isArray(data)) {
                availableStores = availableStores.concat(data);
            }
            const nextPageHeader = response?.headers?.get('x-next-page'); // Optional chaining for safety
            if (nextPageHeader) {
                 try {
                     const nextUrl = new URL(nextPageHeader);
                     const nextPageNum = parseInt(nextUrl.searchParams.get('page'));
                     if (!isNaN(nextPageNum) && nextPageNum > page) {
                         console.log(`[fetchAllStores] Next page header valid: ${nextPageHeader}. Continuing.`);
                         page = nextPageNum;
                     } else {
                         console.log('[fetchAllStores] Next page header found but invalid or not advancing. Assuming end.');
                         hasMorePages = false;
                     }
                 } catch (e) {
                     console.error('[fetchAllStores] Error parsing next page URL header:', nextPageHeader, e);
                     hasMorePages = false;
                 }
            } else {
                console.log('[fetchAllStores] No next page header found. Assuming end of pages.');
                hasMorePages = false;
            }
        }
        if (safetyCounter >= 50) console.warn("[fetchAllStores] Safety limit reached fetching stores.");
        availableStores.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));
        console.log(`[fetchAllStores] Finished. Total stores: ${availableStores.length}`);
        return true;
    };

    // --- Product View Logic ---

    // Function to render a row in DISPLAY mode
    const renderRowDisplayMode = (tableRowElement, productData) => {
        const store = availableStores.find(s => s.id === productData.store_id);
        const storeName = store ? store.name : (productData.store_id || 'N/A');
        const priceFormatted = productData.price !== undefined && productData.price !== null ? productData.price.toFixed(2) : 'N/A';
        const stockFormatted = productData.stock !== undefined && productData.stock !== null ? productData.stock : 'N/A';

        tableRowElement.innerHTML = `
            <td>${productData.name || 'N/A'}</td>
            <td class="price">${priceFormatted}</td>
            <td class="stock">${stockFormatted}</td>
            <td>${storeName}</td>
            <td>${formatDate(productData.created_at)}</td>
            <td class="actions">
                <button class="action-icon-btn copy-id-btn" data-product-id="${productData.id || ''}" title="Copiar ID del Producto">
                    ${svgIconClipboard}
                </button>
                <button class="action-icon-btn edit-btn" data-product-id="${productData.id || ''}" title="Editar Producto">
                     ${svgIconEdit}
                </button>
                <button class="action-icon-btn delete-btn" data-product-id="${productData.id || ''}" title="Eliminar Producto">
                     ${svgIconDelete}
                </button>
            </td>
        `;
        tableRowElement.classList.remove('editing');
        editingProductId = null; // Reset editing state tracker
        originalRowData = null;
        console.log(`[renderRowDisplayMode] Row for ${productData.id} reverted to display mode.`);
    };

    // Function to render a row in EDIT mode
    const renderRowEditMode = (tableRowElement, productData) => {
        const storeOptions = availableStores.map(store =>
            `<option value="${store.id}" ${store.id === productData.store_id ? 'selected' : ''}>${store.name || store.id}</option>`
        ).join('');

        tableRowElement.innerHTML = `
            <td><input type="text" class="edit-input edit-name" value="${productData.name || ''}"></td>
            <td><input type="number" step="0.01" class="edit-input edit-price" value="${productData.price !== undefined ? productData.price : ''}"></td>
            <td><input type="number" step="1" class="edit-input edit-stock" value="${productData.stock !== undefined ? productData.stock : ''}"></td>
            <td>
                 <select class="edit-input edit-store">
                     <option value="">Seleccionar tienda...</option> ${storeOptions}
                 </select>
             </td>
            <td></td>
            <td class="actions">
                <button class="action-icon-btn save-btn" data-product-id="${productData.id || ''}" title="Guardar Cambios">
                    ${svgIconSave}
                 </button>
                 <button class="action-icon-btn cancel-btn" data-product-id="${productData.id || ''}" title="Cancelar Edición">
                     ${svgIconCancel}
                 </button>
            </td>
        `;
        tableRowElement.classList.add('editing');
        editingProductId = productData.id; // Track which row is being edited
        console.log(`[renderRowEditMode] Row for ${productData.id} switched to edit mode.`);
        // Focus the first input field
        tableRowElement.querySelector('.edit-name').focus();
    };

    // Renders the whole table (calls renderRowDisplayMode for each product)
    const renderProductTable = (products) => {
        console.log('[renderProductTable] Rendering table...');
        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) { console.error('[renderProductTable] Table body missing!'); return; }
        tableBody.innerHTML = '';
        if (!products || products.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos.</td></tr>';
            return;
        }
        console.log(`[renderProductTable] Rendering ${products.length} items.`);
        products.forEach(product => {
            const row = document.createElement('tr');
            row.dataset.productId = product.id;
            row.dataset.storeId = product.store_id;
            renderRowDisplayMode(row, product); // Render initially in display mode
            tableBody.appendChild(row);
        });
    };

     // Helper function to extract page number from URL parameter
     const getPageNumberFromUrl = (url) => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const pageParam = urlObj.searchParams.get('page');
            const pageNum = pageParam ? parseInt(pageParam) : null;
            return !isNaN(pageNum) ? pageNum : null;
        } catch (e) {
            console.error("[getPageNumberFromUrl] Error parsing URL:", url, e);
            return null;
        }
    };

    // Helper function to create a page number button
    const createPageButton = (pageNumber, isCurrent = false) => {
        const button = document.createElement('button');
        button.textContent = pageNumber;
        button.classList.add('page-number-btn');
        if (isCurrent) {
            button.classList.add('active');
            button.disabled = true;
        }
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent potential form submission if inside one
            console.log(`Page number ${pageNumber} clicked.`);
            if (currentPage !== pageNumber) { // Avoid fetching if clicking current page
                currentPage = pageNumber;
                fetchProducts();
            }
        });
        return button;
    };

     // Helper function to create ellipsis span
     const createPageEllipsis = () => {
         const span = document.createElement('span');
         span.textContent = '...';
         span.classList.add('page-ellipsis');
         return span;
     };

    // Updates pagination controls AND generates page number links
    const updatePaginationControls = ({ nextPageNum, lastPageNum }) => { // Changed parameter names for clarity
        console.log(`[updatePaginationControls] Updating. Current: ${currentPage}, Next: ${nextPageNum}, Last: ${lastPageNum}`);
        const prevButton = document.getElementById('prev-page-button');
        const nextButton = document.getElementById('next-page-button');
        const pageInfo = document.getElementById('page-info');
        const pageNumbersContainer = document.getElementById('page-numbers');

        if (!prevButton || !nextButton || !pageInfo || !pageNumbersContainer) {
            console.error('[updatePaginationControls] Pagination UI elements missing!');
            return;
        }

        prevButton.disabled = currentPage <= 1;
        const isOnLastPage = !nextPageNum || (lastPageNum && currentPage >= lastPageNum);
        nextButton.disabled = isOnLastPage;
        console.log(`[updatePaginationControls] State: Prev disabled=${prevButton.disabled}, Next disabled=${nextButton.disabled}`);

        pageInfo.textContent = `Página ${currentPage}` + (lastPageNum ? ` de ${lastPageNum}` : '');

        pageNumbersContainer.innerHTML = '';
        if (lastPageNum && lastPageNum > 1) {
            console.log(`[updatePaginationControls] Generating page numbers up to ${lastPageNum}`);
            const maxPagesToShow = 5;
            let startPage, endPage;

            if (lastPageNum <= maxPagesToShow + 2) { // Show all if not many pages or ellipsis don't save much space
                startPage = 1;
                endPage = lastPageNum;
            } else {
                const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 1) / 2);
                const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 1) / 2);

                if (currentPage <= maxPagesBeforeCurrent + 1) { // Near the beginning
                    startPage = 1;
                    endPage = maxPagesToShow;
                } else if (currentPage >= lastPageNum - maxPagesAfterCurrent) { // Near the end
                    startPage = lastPageNum - maxPagesToShow + 1;
                    endPage = lastPageNum;
                } else { // In the middle
                    startPage = currentPage - maxPagesBeforeCurrent;
                    endPage = currentPage + maxPagesAfterCurrent;
                }
            }

            // Add 'First' and '...' if needed
            if (startPage > 1) {
                pageNumbersContainer.appendChild(createPageButton(1));
                if (startPage > 2) {
                    pageNumbersContainer.appendChild(createPageEllipsis());
                }
            }

            // Add the main page numbers
            for (let i = startPage; i <= endPage; i++) {
                pageNumbersContainer.appendChild(createPageButton(i, i === currentPage));
            }

            // Add '...' and 'Last' if needed
            if (endPage < lastPageNum) {
                if (endPage < lastPageNum - 1) {
                     pageNumbersContainer.appendChild(createPageEllipsis());
                }
                pageNumbersContainer.appendChild(createPageButton(lastPageNum));
            }
        } else {
             console.log("[updatePaginationControls] Not generating page numbers (lastPage <= 1 or null).");
        }
        console.log('[updatePaginationControls] Controls and page numbers updated.');
    };


    const renderSingleStoreSelector = () => {
        const selectElement = document.getElementById('single-store-select');
        if (!selectElement) { console.error('[renderSingleStoreSelector] Select element missing!'); return; }
        console.log(`[renderSingleStoreSelector] Rendering for ${availableStores.length} stores.`);
        selectElement.innerHTML = '';
        if (availableStores.length === 0) {
            selectElement.add(new Option("No hay tiendas", ""));
            selectElement.disabled = true; return;
        }
        selectElement.disabled = (filterMode === 'all');
        selectElement.add(new Option("Seleccione una tienda...", "")); // Placeholder
        availableStores.forEach(store => {
            selectElement.add(new Option(store.name || store.id, store.id));
        });
        selectElement.value = selectedSingleStoreId || "";
    };

    const toggleFilterUI = (isAllStoresMode) => {
        const singleStoreContainer = document.getElementById('single-store-selector-container');
        const singleStoreSelect = document.getElementById('single-store-select');
        const allStoresCheckbox = document.getElementById('all-stores-checkbox');
        if (!singleStoreContainer || !singleStoreSelect || !allStoresCheckbox) { console.error("[toggleFilterUI] Filter UI elements missing."); return; }

        filterMode = isAllStoresMode ? 'all' : 'single';
        console.log(`[toggleFilterUI] Setting filter mode: ${filterMode}`);
        singleStoreContainer.style.display = isAllStoresMode ? 'none' : 'block';
        singleStoreSelect.disabled = isAllStoresMode;
        allStoresCheckbox.checked = isAllStoresMode;

        if (isAllStoresMode) {
            selectedSingleStoreId = null;
            singleStoreSelect.value = "";
        } else {
             if (!selectedSingleStoreId && availableStores.length > 0) {
                selectedSingleStoreId = availableStores[0].id;
                singleStoreSelect.value = selectedSingleStoreId;
                console.log(`[toggleFilterUI] Auto-selected first store: ${selectedSingleStoreId}`);
             } else {
                 singleStoreSelect.value = selectedSingleStoreId || "";
             }
        }
    };

    // Central function to fetch products based on filter mode
    const fetchProducts = async () => {
        console.log(`[fetchProducts] Fetching. Page: ${currentPage}, Size: ${currentPageSize}, Mode: ${filterMode}, Store: ${selectedSingleStoreId}`);
        const tableBody = document.getElementById('products-table-body');
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
        const pageNumbersContainer = document.getElementById('page-numbers');
        if(pageNumbersContainer) pageNumbersContainer.innerHTML = ''; // Clear numbers while loading


        let url = '';
        let fetchNeeded = true;

        if (filterMode === 'all') {
            url = `${PRODUCTS_ENDPOINT}?page=${currentPage}&page_size=${currentPageSize}`;
        } else if (filterMode === 'single') {
            if (selectedSingleStoreId) {
                url = `${PRODUCTS_ENDPOINT}/store/${selectedSingleStoreId}?page=${currentPage}&page_size=${currentPageSize}`;
            } else {
                console.warn("[fetchProducts] Single mode, but no store selected.");
                renderProductTable([]);
                updatePaginationControls({ nextPageNum: null, lastPageNum: null });
                fetchNeeded = false;
            }
        } else {
             console.error("[fetchProducts] Invalid filter mode.");
             showContentError("Error de filtro inválido.");
             fetchNeeded = false;
        }

        if (!fetchNeeded) return;

        // Append sorting parameters if defined
        let finalUrl = url;
        if (currentSortKey) {
            finalUrl += `${finalUrl.includes('?') ? '&' : '?'}order_by=${currentSortKey}&order_dir=${currentSortDirection}`;
        }

        console.log(`[fetchProducts] Calling fetchData: ${finalUrl}`);
        // Ensure response object is always returned from fetchData to access headers
        const { error, response, data: productsData } = await fetchData(finalUrl);

        if (error) {
            console.error(`[fetchProducts] Fetch error:`, error);
            showContentError(`Error al cargar productos: ${error}`);
            renderProductTable([]);
            updatePaginationControls({ nextPageNum: null, lastPageNum: null }); // Pass numbers
            return;
        }
         // Ensure response object exists before accessing headers
        if (!response) {
            console.error(`[fetchProducts] Fetch succeeded but response object is missing.`);
             showContentError(`Error interno al procesar respuesta.`);
             renderProductTable(productsData || []); // Render data if available
             updatePaginationControls({ nextPageNum: null, lastPageNum: null });
             return;
        }


        console.log(`[fetchProducts] Fetch success. Products received: ${productsData?.length}`);
        renderProductTable(productsData || []);

        // --- Parse Headers and Update Controls ---
        const nextPageHeader = response.headers.get('X-Next-Page');
        const lastPageHeader = response.headers.get('X-Last-Page');
        console.log(`[fetchProducts] Raw Headers - Next URL: ${nextPageHeader}, Last URL: ${lastPageHeader}`);

        const nextPageNum = getPageNumberFromUrl(nextPageHeader);
        const lastPageNum = getPageNumberFromUrl(lastPageHeader);
        console.log(`[fetchProducts] Parsed Page Numbers - Next: ${nextPageNum}, Last: ${lastPageNum}`);

        let finalLastPage = lastPageNum;
        if (finalLastPage === null && productsData) { // Estimate only if header missing AND we have data
            const productCount = productsData.length;
            if (productCount < currentPageSize) {
                finalLastPage = currentPage;
                console.log(`[fetchProducts] Estimating last page as current page (${currentPage}).`);
            }
        }

        updatePaginationControls({ nextPageNum: nextPageNum, lastPageNum: finalLastPage }); // Pass parsed numbers
        // ---

        console.log(`[fetchProducts] Finished processing page ${currentPage}.`);
    };


    // --- View Loading ---
    const loadProductsView = async () => {
        console.log('[loadProductsView] ENTERED');
        try {
            console.log('[loadProductsView] Clearing area...');
            clearContentArea();
            if (!contentArea) { console.error('[loadProductsView] Content area missing!'); return; }

            console.log('[loadProductsView] Inserting HTML (with updated Store header)...');
            contentArea.innerHTML = `
                <h1>Productos</h1>
                <div class="view-controls">
                    <div class="filter-bar store-filter-section">
                         <h3>Filtrar:</h3>
                         <div class="filter-option">
                             <input type="checkbox" id="all-stores-checkbox" name="filter-mode">
                             <label for="all-stores-checkbox">Todas las tiendas</label>
                         </div>
                         <div class="filter-option" id="single-store-selector-container">
                             <label for="single-store-select">Tienda específica:</label>
                             <select id="single-store-select" name="single-store-select">
                                 <option value="">Cargando...</option>
                             </select>
                         </div>
                    </div>
                    <div class="page-size-selector">
                         <label for="page-size">Resultados:</label>
                         <select id="page-size" name="page-size">
                             <option value="20">20</option> <option value="50">50</option> <option value="100">100</option>
                         </select>
                    </div>
                 </div>
                 <button id="create-product-button" class="filter-button" style="margin-left: auto;">Crear Producto</button>
                <div class="table-container">
                    <table class="data-table products-table">
                         <thead>
                            <tr>
                                <th data-sort-key="name">Nombre <span class="sort-indicator"></span></th>
                                <th class="price" data-sort-key="price">Precio <span class="sort-indicator"></span></th>
                                <th class="stock" data-sort-key="stock">Stock <span class="sort-indicator"></span></th>
                                <th>Store</th>
                                <th data-sort-key="created_at">Fecha Creación <span class="sort-indicator"></span></th>
                                <th class="actions">Acciones</th>
                            </tr>
                        </thead>
                         <tbody id="products-table-body"><tr><td colspan="6">Cargando...</td></tr></tbody>
                     </table>
                </div>
                <div class="pagination-controls">
                    <button id="prev-page-button" disabled>Anterior</button>
                    <div id="page-numbers"></div> <!-- Container for number buttons -->
                    <button id="next-page-button" disabled>Siguiente</button>
                </div>
                 <div id="page-info-container">
                     <span id="page-info"></span> <!-- Span for "Página X de Y" -->
                 </div>
            `;
            console.log('[loadProductsView] HTML inserted.');

            // --- Get references AFTER setting innerHTML ---
            const prevButton = document.getElementById('prev-page-button');
            const nextButton = document.getElementById('next-page-button');
            const pageSizeSelect = document.getElementById('page-size');
            const allStoresCheckbox = document.getElementById('all-stores-checkbox');
            const singleStoreSelect = document.getElementById('single-store-select');
            const tableBody = document.getElementById('products-table-body');
            const pageNumbersContainer = document.getElementById('page-numbers'); // Get ref here
            const createProductButton = document.getElementById('create-product-button'); // Get Create button ref
             if (!pageNumbersContainer) console.error("Page numbers container REF not found!"); // Check ref
             if (!createProductButton) console.error("Create Product button REF not found!"); // Check ref
            console.log('[loadProductsView] References obtained.');


            // --- Fetch stores and setup filters ---
            console.log('[loadProductsView] Fetching stores...');
            await fetchAllStores();
            renderSingleStoreSelector(); // Populate select
            toggleFilterUI(true); // Set initial UI to 'all'

            console.log('[loadProductsView] Setting up listeners...');

            // --- Add listeners with null checks ---
            prevButton?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; fetchProducts(); } });
            nextButton?.addEventListener('click', () => { currentPage++; fetchProducts(); });
            pageSizeSelect?.addEventListener('change', (event) => { currentPageSize = parseInt(event.target.value); currentPage = 1; fetchProducts(); });
            allStoresCheckbox?.addEventListener('change', (event) => {
                toggleFilterUI(event.target.checked);
                currentPage = 1;
                 // Fetch only after state is set
                // Use setTimeout to ensure state update applies before fetch if needed, usually not required
                // setTimeout(() => fetchProducts(), 0);
                fetchProducts();
            });
            singleStoreSelect?.addEventListener('change', (event) => {
                selectedSingleStoreId = event.target.value || null;
                console.log(`[Filter] Single store selected: ${selectedSingleStoreId}`);
                // Fetch only if mode is single (changing selection implies we are in single mode)
                if (filterMode === 'single') {
                    currentPage = 1;
                    fetchProducts(); // fetchProducts handles the case where selectedSingleStoreId is null/empty
                }
            });
            createProductButton?.addEventListener('click', () => {
                console.log("[Create Button Click] Clicked.");
                showCreateProductRow();
            });
            // Add listeners for sortable headers
            const sortableHeaders = contentArea.querySelectorAll('th[data-sort-key]');
            sortableHeaders.forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.sortKey;
                    console.log(`[Sort] Header clicked: ${key}`);
                    if (currentSortKey === key) {
                        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortKey = key;
                        currentSortDirection = 'asc'; // Default to ascending when changing column
                    }
                    updateSortIndicators(); // Update UI
                    currentPage = 1; // Reset to first page when sorting
                    fetchProducts();
                });
            });
            tableBody?.addEventListener('click', async (event) => {
                event.preventDefault(); // Prevent any default browser action from the click
                // Find the closest button element, regardless of whether click was on button or SVG
                const targetButton = event.target.closest('.action-icon-btn');
                if (!targetButton) return; // Exit if the click wasn't on or inside an action button

                // If a row is currently being edited OR created, check interactions
                if (editingProductId || isCreatingProduct) {
                     const activeRow = document.querySelector('tr.editing, tr.creating'); // Find editing or creating row
                     // Check if the clicked button is INSIDE the active (editing or creating) row
                     if (activeRow && !activeRow.contains(targetButton)) {
                         console.log("[Table Click] Click outside active (edit/create) row ignored.");
                         const message = isCreatingProduct ? "Guarda o cancela la creación del nuevo producto antes de interactuar con otras filas." : "Termina o cancela la edición actual antes de interactuar con otras filas.";
                         alert(message);
                         return;
                     }
                     // Allow specific actions on the active row
                     if (isCreatingProduct && !(targetButton.classList.contains('save-new-btn') || targetButton.classList.contains('cancel-create-btn'))) {
                         console.log("[Table Click] Action on non-create row button ignored while creating.");
                         return; // Ignore if creating and button isn't save-new or cancel-create
                     }
                     if (editingProductId && !(targetButton.classList.contains('save-btn') || targetButton.classList.contains('cancel-btn'))) {
                         console.log("[Table Click] Action on non-edit row button ignored while editing.");
                         return; // Ignore if editing and button isn't save or cancel
                     }
                 }

                const productId = targetButton.dataset.productId;
                // Note: productId will be undefined for buttons in the 'create' row
                // if (!productId && !(targetButton.classList.contains('save-new-btn') || targetButton.classList.contains('cancel-create-btn'))) return;

                if (targetButton.classList.contains('copy-id-btn')) {
                    if (!productId) return;
                    try {
                        await navigator.clipboard.writeText(productId);
                        console.log(`[Table Click] Copied product ID: ${productId}`);
                        targetButton.disabled = true; targetButton.classList.add('copied-success');
                        setTimeout(() => { targetButton.disabled = false; targetButton.classList.remove('copied-success'); }, 1500);
                    } catch (err) {
                        console.error('[Table Click] Failed to copy ID:', err); alert('No se pudo copiar el ID.');
                    }
                } else if (targetButton.classList.contains('edit-btn')) {
                    console.log(`[Table Click] Edit button clicked for product ID: ${productId}`);
                    if (!productId) return;
                    handleEditProduct(productId); // Call revised edit handler
                } else if (targetButton.classList.contains('delete-btn')) {
                    console.log(`[Table Click] Delete button clicked for product ID: ${productId}`);
                    if (!productId) return;
                    await handleDeleteProduct(productId); // Call revised delete handler
                } else if (targetButton.classList.contains('save-btn')) {
                    console.log(`[Table Click] Save button clicked for product ID: ${productId}`);
                    if (!productId) return;
                    await handleSaveProduct(productId);
                 } else if (targetButton.classList.contains('cancel-btn')) {
                    console.log(`[Table Click] Cancel button clicked for product ID: ${productId}`);
                    if (!productId) return;
                    handleCancelEdit(productId);
                 } else if (targetButton.classList.contains('save-new-btn')) { // Handle Save New
                    console.log(`[Table Click] Save New button clicked.`);
                    await handleSaveNewProduct();
                 } else if (targetButton.classList.contains('cancel-create-btn')) { // Handle Cancel Create
                     console.log(`[Table Click] Cancel Create button clicked.`);
                     handleCancelCreateProduct();
                 }
            });
            console.log('[loadProductsView] Listeners added.');

            // --- Trigger initial fetch ---
            console.log('[loadProductsView] Triggering initial fetchProducts...');
            currentPage = 1;
            await fetchProducts(); // Fetch initial data based on default 'all' mode

        } catch (error) {
            console.error('[loadProductsView] CRITICAL ERROR:', error);
            showContentError(`Error crítico al cargar vista: ${error.message || error}`);
        }
        console.log('[loadProductsView] EXITING');
    };

    // --- Customer View Logic ---

    // Central function to fetch customers based on filter mode
    const fetchCustomers = async () => {
        console.log(`[fetchCustomers] Fetching. Page: ${currentPage}, Size: ${currentPageSize}, Mode: ${filterMode}, Store: ${selectedSingleStoreId}`);
        const tableBody = document.getElementById('customers-table-body'); // Use customers table ID
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>'; // Adjust colspan if needed
        const pageNumbersContainer = document.getElementById('page-numbers');
        if(pageNumbersContainer) pageNumbersContainer.innerHTML = ''; // Clear numbers while loading

        let url = '';
        let fetchNeeded = true;

        if (filterMode === 'all') {
            url = `${CUSTOMERS_ENDPOINT}?page=${currentPage}&page_size=${currentPageSize}`;
        } else if (filterMode === 'single') {
            if (selectedSingleStoreId) {
                url = `${CUSTOMERS_ENDPOINT}/store/${selectedSingleStoreId}?page=${currentPage}&page_size=${currentPageSize}`;
            } else {
                console.warn("[fetchCustomers] Single mode, but no store selected.");
                renderCustomerTable([]); // Use customer render function
                updatePaginationControls({ nextPageNum: null, lastPageNum: null });
                fetchNeeded = false;
            }
        } else {
             console.error("[fetchCustomers] Invalid filter mode.");
             showContentError("Error de filtro inválido.");
             fetchNeeded = false;
        }

        if (!fetchNeeded) return;

        // Append sorting parameters if defined
        let finalUrl = url;
        if (currentSortKey) {
            // Ensure sort key is valid for customers before appending
            const validCustomerSortKeys = ['name', 'email', 'phone', 'created_at']; // Define valid keys
            if (validCustomerSortKeys.includes(currentSortKey)) {
                 finalUrl += `${finalUrl.includes('?') ? '&' : '?'}order_by=${currentSortKey}&order_dir=${currentSortDirection}`;
            } else {
                console.warn(`[fetchCustomers] Invalid sort key '${currentSortKey}' for customers. Ignoring.`);
                currentSortKey = null; // Reset invalid key
            }
        }

        console.log(`[fetchCustomers] Calling fetchData: ${finalUrl}`);
        const { error, response, data: customersData } = await fetchData(finalUrl);

        if (error) {
            console.error(`[fetchCustomers] Fetch error:`, error);
            showContentError(`Error al cargar clientes: ${error}`);
            renderCustomerTable([]); // Use customer render function
            updatePaginationControls({ nextPageNum: null, lastPageNum: null });
            return;
        }
        if (!response) {
            console.error(`[fetchCustomers] Fetch succeeded but response object is missing.`);
             showContentError(`Error interno al procesar respuesta.`);
             renderCustomerTable(customersData || []); // Use customer render function
             updatePaginationControls({ nextPageNum: null, lastPageNum: null });
             return;
        }

        console.log(`[fetchCustomers] Fetch success. Customers received: ${customersData?.length}`);
        renderCustomerTable(customersData || []); // Use customer render function

        // --- Parse Headers and Update Controls ---
        const nextPageHeader = response.headers.get('X-Next-Page');
        const lastPageHeader = response.headers.get('X-Last-Page');
        console.log(`[fetchCustomers] Raw Headers - Next URL: ${nextPageHeader}, Last URL: ${lastPageHeader}`);

        const nextPageNum = getPageNumberFromUrl(nextPageHeader);
        const lastPageNum = getPageNumberFromUrl(lastPageHeader);
        console.log(`[fetchCustomers] Parsed Page Numbers - Next: ${nextPageNum}, Last: ${lastPageNum}`);

        let finalLastPage = lastPageNum;
        if (finalLastPage === null && customersData) {
            const customerCount = customersData.length;
            if (customerCount < currentPageSize) {
                finalLastPage = currentPage;
                console.log(`[fetchCustomers] Estimating last page as current page (${currentPage}).`);
            }
        }

        updatePaginationControls({ nextPageNum: nextPageNum, lastPageNum: finalLastPage });
        // ---

        console.log(`[fetchCustomers] Finished processing page ${currentPage}.`);
    };

    // Renders the customer table body
    const renderCustomerTable = (customers) => {
        console.log('[renderCustomerTable] Rendering table...');
        const tableBody = document.getElementById('customers-table-body');
        if (!tableBody) { console.error('[renderCustomerTable] Table body missing!'); return; }
        tableBody.innerHTML = '';
        if (!customers || customers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6">No se encontraron clientes.</td></tr>'; // Adjust colspan
            return;
        }
        console.log(`[renderCustomerTable] Rendering ${customers.length} items.`);
        customers.forEach(customer => {
            const row = document.createElement('tr');
            row.dataset.customerId = customer.id; // Use customerId
            row.dataset.storeId = customer.store_id;
            renderCustomerRowDisplayMode(row, customer); // Render initially in display mode
            tableBody.appendChild(row);
        });
    };

    // Function to render a customer row in DISPLAY mode
    const renderCustomerRowDisplayMode = (tableRowElement, customerData) => {
        const store = availableStores.find(s => s.id === customerData.store_id);
        const storeName = store ? store.name : (customerData.store_id || 'N/A');

        tableRowElement.innerHTML = `
            <td>${customerData.name || 'N/A'}</td>
            <td>${customerData.email || 'N/A'}</td>
            <td>${customerData.phone || 'N/A'}</td>
            <td>${storeName}</td>
            <td>${formatDate(customerData.created_at)}</td>
            <td class="actions">
                <button class="action-icon-btn copy-id-btn" data-customer-id="${customerData.id || ''}" title="Copiar ID del Cliente">
                    ${svgIconClipboard}
                </button>
                <button class="action-icon-btn edit-btn" data-customer-id="${customerData.id || ''}" title="Editar Cliente">
                     ${svgIconEdit}
                </button>
                <button class="action-icon-btn delete-btn" data-customer-id="${customerData.id || ''}" title="Eliminar Cliente">
                     ${svgIconDelete}
                </button>
            </td>
        `;
        tableRowElement.classList.remove('editing');
        // Reset editing state for customers (need separate state variable if editing products and customers simultaneously is possible)
        // editingCustomerId = null; // Assuming we need a separate editingCustomerId state
        originalRowData = null; // Assuming shared originalRowData is okay for now, or create originalCustomerData
        console.log(`[renderCustomerRowDisplayMode] Row for ${customerData.id} reverted to display mode.`);
    };

    // Function to render a customer row in EDIT mode
    const renderCustomerRowEditMode = (tableRowElement, customerData) => {
        // Store ID is not editable according to schema, so we don't need store options here.
        // We'll display the original store name or ID non-editably.
        const store = availableStores.find(s => s.id === customerData.store_id);
        const storeName = store ? store.name : (customerData.store_id || 'N/A');

        tableRowElement.innerHTML = `
            <td><input type="text" class="edit-input edit-name" value="${customerData.name || ''}"></td>
            <td><input type="email" class="edit-input edit-email" value="${customerData.email || ''}"></td>
            <td><input type="text" class="edit-input edit-phone" value="${customerData.phone || ''}"></td>
            <td>${storeName}</td> <!-- Display store name, not editable -->
            <td></td> <!-- Created date cell empty in edit mode -->
            <td class="actions">
                <button class="action-icon-btn save-btn" data-customer-id="${customerData.id || ''}" title="Guardar Cambios">
                    ${svgIconSave}
                 </button>
                 <button class="action-icon-btn cancel-btn" data-customer-id="${customerData.id || ''}" title="Cancelar Edición">
                     ${svgIconCancel}
                 </button>
            </td>
        `;
        tableRowElement.classList.add('editing');
        // editingCustomerId = customerData.id; // Track which customer row is being edited
        console.log(`[renderCustomerRowEditMode] Row for ${customerData.id} switched to edit mode.`);
        // Focus the first input field
        tableRowElement.querySelector('.edit-name').focus();
    };


    // --- View Loading for Customers ---
    const loadCustomersView = async () => {
        console.log('[loadCustomersView] ENTERED');
        try {
            console.log('[loadCustomersView] Clearing area...');
            clearContentArea();
            if (!contentArea) { console.error('[loadCustomersView] Content area missing!'); return; }

            console.log('[loadCustomersView] Inserting HTML...');
            // **Adapt HTML structure for Customers**
            contentArea.innerHTML = `
                <h1>Clientes</h1>
                <div class="view-controls">
                    <div class="filter-bar store-filter-section">
                         <h3>Filtrar:</h3>
                         <div class="filter-option">
                             <input type="checkbox" id="all-stores-checkbox" name="filter-mode">
                             <label for="all-stores-checkbox">Todas las tiendas</label>
                         </div>
                         <div class="filter-option" id="single-store-selector-container">
                             <label for="single-store-select">Tienda específica:</label>
                             <select id="single-store-select" name="single-store-select">
                                 <option value="">Cargando...</option>
                             </select>
                         </div>
                    </div>
                    <div class="page-size-selector">
                         <label for="page-size">Resultados:</label>
                         <select id="page-size" name="page-size">
                             <option value="20">20</option> <option value="50">50</option> <option value="100">100</option>
                         </select>
                    </div>
                 </div>
                 <button id="create-customer-button" class="filter-button" style="margin-left: auto;">Crear Cliente</button> <!-- Changed button ID and text -->
                <div class="table-container">
                    <table class="data-table customers-table"> <!-- Added customers-table class -->
                         <thead>
                            <tr>
                                <th data-sort-key="name">Nombre <span class="sort-indicator"></span></th>
                                <th data-sort-key="email">Email <span class="sort-indicator"></span></th>
                                <th data-sort-key="phone">Teléfono <span class="sort-indicator"></span></th>
                                <th>Tienda</th> <!-- Store is not directly sortable via API in this example -->
                                <th data-sort-key="created_at">Fecha Creación <span class="sort-indicator"></span></th>
                                <th class="actions">Acciones</th>
                            </tr>
                        </thead>
                         <tbody id="customers-table-body"><tr><td colspan="6">Cargando...</td></tr></tbody> <!-- Changed tbody ID and colspan -->
                     </table>
                </div>
                <div class="pagination-controls">
                    <button id="prev-page-button" disabled>Anterior</button>
                    <div id="page-numbers"></div>
                    <button id="next-page-button" disabled>Siguiente</button>
                </div>
                 <div id="page-info-container">
                     <span id="page-info"></span>
                 </div>
            `;
            console.log('[loadCustomersView] HTML inserted.');

            // --- Get references AFTER setting innerHTML ---
            const prevButton = document.getElementById('prev-page-button');
            const nextButton = document.getElementById('next-page-button');
            const pageSizeSelect = document.getElementById('page-size');
            const allStoresCheckbox = document.getElementById('all-stores-checkbox');
            const singleStoreSelect = document.getElementById('single-store-select');
            const tableBody = document.getElementById('customers-table-body'); // Use customer table body ID
            const pageNumbersContainer = document.getElementById('page-numbers');
            const createCustomerButton = document.getElementById('create-customer-button'); // Use customer button ID
             if (!pageNumbersContainer) console.error("Page numbers container REF not found!");
             if (!createCustomerButton) console.error("Create Customer button REF not found!");
            console.log('[loadCustomersView] References obtained.');

            // --- Fetch stores and setup filters ---
            console.log('[loadCustomersView] Fetching stores...');
            await fetchAllStores();
            renderSingleStoreSelector();
            toggleFilterUI(true);

            console.log('[loadCustomersView] Setting up listeners...');

            // --- Add listeners (adapt fetchProducts to fetchCustomers) ---
            prevButton?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; fetchCustomers(); } }); // Use fetchCustomers
            nextButton?.addEventListener('click', () => { currentPage++; fetchCustomers(); }); // Use fetchCustomers
            pageSizeSelect?.addEventListener('change', (event) => { currentPageSize = parseInt(event.target.value); currentPage = 1; fetchCustomers(); }); // Use fetchCustomers
            allStoresCheckbox?.addEventListener('change', (event) => {
                toggleFilterUI(event.target.checked);
                currentPage = 1;
                fetchCustomers(); // Use fetchCustomers
            });
            singleStoreSelect?.addEventListener('change', (event) => {
                selectedSingleStoreId = event.target.value || null;
                console.log(`[Filter] Single store selected: ${selectedSingleStoreId}`);
                if (filterMode === 'single') {
                    currentPage = 1;
                    fetchCustomers(); // Use fetchCustomers
                }
            });
            createCustomerButton?.addEventListener('click', () => {
                console.log("[Create Customer Button Click] Clicked.");
                showCreateCustomerRow(); // Call the customer-specific function
            });
            // Add listeners for sortable headers (adapt fetchProducts to fetchCustomers)
            const sortableHeaders = contentArea.querySelectorAll('th[data-sort-key]');
            sortableHeaders.forEach(th => {
                th.addEventListener('click', () => {
                    const key = th.dataset.sortKey;
                    console.log(`[Sort] Header clicked: ${key}`);
                    if (currentSortKey === key) {
                        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentSortKey = key;
                        currentSortDirection = 'asc';
                    }
                    updateSortIndicators();
                    currentPage = 1;
                    fetchCustomers(); // Use fetchCustomers
                });
            });
            // Add table body listener (adapt handlers for customers)
            tableBody?.addEventListener('click', async (event) => {
                event.preventDefault();
                const targetButton = event.target.closest('.action-icon-btn');
                if (!targetButton) return;

                // Prevent actions on other rows if a customer row is being edited or created
                if (editingCustomerId || isCreatingCustomer) {
                    const activeRow = document.querySelector('tr.editing[data-customer-id], tr.creating[data-customer-id]'); // Find editing or creating customer row
                    if (activeRow && !activeRow.contains(targetButton)) {
                        console.log("[Table Click] Click outside active customer (edit/create) row ignored.");
                        const message = isCreatingCustomer ? "Guarda o cancela la creación del nuevo cliente antes de interactuar con otras filas." : "Termina o cancela la edición actual del cliente antes de interactuar con otras filas.";
                        alert(message);
                        return;
                    }
                     // Allow specific actions on the active row
                     if (isCreatingCustomer && !(targetButton.classList.contains('save-new-btn') || targetButton.classList.contains('cancel-create-btn'))) {
                         console.log("[Table Click] Action on non-create row button ignored while creating customer.");
                         return;
                     }
                     if (editingCustomerId && !(targetButton.classList.contains('save-btn') || targetButton.classList.contains('cancel-btn'))) {
                         console.log("[Table Click] Action on non-edit row button ignored while editing customer.");
                         return;
                     }
                }

                const customerId = targetButton.dataset.customerId; // Use data-customer-id

                if (targetButton.classList.contains('copy-id-btn')) {
                    if (!customerId) return;
                    try {
                        await navigator.clipboard.writeText(customerId);
                        console.log(`[Table Click] Copied customer ID: ${customerId}`);
                        targetButton.disabled = true; targetButton.classList.add('copied-success');
                        setTimeout(() => { targetButton.disabled = false; targetButton.classList.remove('copied-success'); }, 1500);
                    } catch (err) {
                        console.error('[Table Click] Failed to copy ID:', err); alert('No se pudo copiar el ID.');
                    }
                } else if (targetButton.classList.contains('edit-btn')) {
                    console.log(`[Table Click] Edit button clicked for customer ID: ${customerId}`);
                    if (!customerId) return;
                    handleEditCustomer(customerId); // Call customer edit handler
                } else if (targetButton.classList.contains('delete-btn')) {
                    console.log(`[Table Click] Delete button clicked for customer ID: ${customerId}`);
                    if (!customerId) return;
                    await handleDeleteCustomer(customerId); // Call customer delete handler
                } else if (targetButton.classList.contains('save-btn')) {
                    console.log(`[Table Click] Save button clicked for customer ID: ${customerId}`);
                    if (!customerId) return;
                    await handleSaveCustomer(customerId); // Call customer save handler
                 } else if (targetButton.classList.contains('cancel-btn')) {
                    console.log(`[Table Click] Cancel button clicked for customer ID: ${customerId}`);
                    if (!customerId) return;
                    handleCancelEditCustomer(customerId); // Call customer cancel handler
                 } else if (targetButton.classList.contains('save-new-btn')) { // Specific class for saving new customer
                    console.log(`[Table Click] Save New Customer button clicked.`);
                    await handleSaveNewCustomer(); // Call customer save new handler
                 } else if (targetButton.classList.contains('cancel-create-btn')) { // Specific class for cancelling new customer
                     console.log(`[Table Click] Cancel Create Customer button clicked.`);
                     handleCancelCreateCustomer(); // Call customer cancel create handler
                 }
            });
            console.log('[loadCustomersView] Listeners added.');

            // --- Trigger initial fetch ---
            console.log('[loadCustomersView] Triggering initial fetchCustomers...');
            currentPage = 1;
            await fetchCustomers(); // Fetch initial customer data

        } catch (error) {
            console.error('[loadCustomersView] CRITICAL ERROR:', error);
            showContentError(`Error crítico al cargar vista de clientes: ${error.message || error}`);
        }
        console.log('[loadCustomersView] EXITING');
    };


    // --- Login/Logout Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); hideLoginErrorMessage();
            const email = emailInput.value; const password = passwordInput.value; const rememberMe = rememberMeCheckbox.checked;
            if (!email || !password) { showLoginErrorMessage('Email y contraseña requeridos.'); return; }
            const formData = new URLSearchParams(); formData.append('username', email); formData.append('password', password);
            try {
                const response = await fetch(LOGIN_ENDPOINT, { method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: formData });
                const data = await response.json();
                if (!response.ok) { showLoginErrorMessage(data.detail || `Error: ${response.statusText}`); throw new Error(data.detail); }
                const token = data.access_token;
                if (rememberMe) { localStorage.setItem('authToken', token); } else { sessionStorage.setItem('authToken', token); }
                window.location.href = 'dashboard.html';
            } catch (error) { console.error('Login failed:', error); if (!errorMessageDiv || !errorMessageDiv.classList.contains('show')) { showLoginErrorMessage('Error al iniciar sesión.'); } }
        });
    }
     if(logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken'); sessionStorage.removeItem('authToken');
            window.location.href = 'index.html';
        });
     }


    // --- Navigation ---
     const handleNavigation = (targetId) => {
         console.log(`Navigating to: ${targetId}`);
         sidebarLinks.forEach(l => l.classList.remove('active'));
         const activeLink = document.querySelector(`.sidebar-nav a[href="#${targetId}"]`);
         if (activeLink) activeLink.classList.add('active');

         // Reset state consistently
         currentPage = 1;
         currentPageSize = 20;
         availableStores = [];
         filterMode = 'all'; // Default mode
         selectedSingleStoreId = null;

         switch (targetId) {
             case 'products':
                 loadProductsView();
                 break;
             case 'customers':
                 loadCustomersView(); // Call the new function for customers
                 break;
             case 'orders': // New case for Orders
                 loadOrdersView();
                 break;
             case 'stores': // New case for Stores
                 loadStoresView();
                 break;
             default:
                if (contentArea) {
                     const title = activeLink ? activeLink.textContent.replace('[Icon] ','') : 'Panel Principal';
                     contentArea.innerHTML = `<h1>${title}</h1><p>Contenido no implementado.</p>`;
                 }
                 break;
         }
     };
     sidebarLinks.forEach(link => {
         link.addEventListener('click', (event) => {
             event.preventDefault();
             const targetId = link.getAttribute('href')?.substring(1);
             if(targetId) handleNavigation(targetId);
         });
     });


    // --- Initial Check/Load ---
    const loadInitialView = () => {
        console.log('Initial load check...');
        const token = getToken();
        const path = window.location.pathname;
        const hash = window.location.hash.substring(1);

        if (path.includes('dashboard.html')) {
            if (!token) { console.log("No token, redirecting to login."); window.location.href = 'index.html'; return; }
            if (hash) {
                console.log(`Initial hash detected: #${hash}. Navigating...`);
                handleNavigation(hash);
            } else {
                 console.log("No initial hash, showing default panel.");
                 if (contentArea) contentArea.innerHTML = '<h1>Panel Principal</h1><p>Selecciona una opción...</p>';
            }
        } else if (path.includes('index.html') || path.endsWith('/')) { // Check for root path too
             if (token) { console.log("Already logged in, redirecting to dashboard."); window.location.href = 'dashboard.html'; }
        }
    };

    loadInitialView(); // Run on load

    // --- Utility to toggle button states ---
    const toggleActionButtonsDisabled = (disabled) => {
        document.querySelectorAll('.action-icon-btn:not(.save-btn):not(.cancel-btn):not(.save-new-btn):not(.cancel-create-btn)')
            .forEach(btn => btn.disabled = disabled);
        // Also toggle the correct create button based on the current view
        const createProductBtn = document.getElementById('create-product-button');
        const createCustomerBtn = document.getElementById('create-customer-button');
        if(createProductBtn) createProductBtn.disabled = disabled;
        if(createCustomerBtn) createCustomerBtn.disabled = disabled;
    };

    // --- Product Action Handlers ---

    const showCreateProductRow = () => {
        console.log("[showCreateProductRow] Attempting to show create row.");
        if (editingProductId) {
            alert("Termina o cancela la edición actual antes de crear un nuevo producto.");
            return;
        }
        if (isCreatingProduct) {
             console.log("[showCreateProductRow] Already creating a product.");
             // Optionally focus the first input of the existing create row
             document.querySelector('tr.creating .edit-name')?.focus();
             return;
        }

        const tableBody = document.getElementById('products-table-body');
        if (!tableBody) { console.error("[showCreateProductRow] Table body not found!"); return; }

        isCreatingProduct = true;
        toggleActionButtonsDisabled(true); // Disable other actions

        const createRow = document.createElement('tr');
        createRow.classList.add('creating'); // Use 'creating' class to distinguish from 'editing'

        const storeOptions = availableStores.map(store =>
            `<option value="${store.id}">${store.name || store.id}</option>`
        ).join('');

        createRow.innerHTML = `
            <td><input type="text" class="edit-input edit-name" placeholder="Nombre producto"></td>
            <td><input type="number" step="0.01" class="edit-input edit-price" placeholder="0.00"></td>
            <td><input type="number" step="1" class="edit-input edit-stock" placeholder="0"></td>
            <td>
                 <select class="edit-input edit-store">
                     <option value="">Seleccionar tienda...</option> ${storeOptions}
                 </select>
             </td>
            <td></td>
            <td class="actions">
                <button class="action-icon-btn save-new-btn" title="Guardar Nuevo Producto">
                    ${svgIconSave} <!-- Use Save icon -->
                 </button>
                 <button class="action-icon-btn cancel-create-btn" title="Cancelar Creación">
                     ${svgIconCancel} <!-- Use Cancel icon -->
                 </button>
            </td>
        `;

        // Insert at the top of the table body
        tableBody.insertBefore(createRow, tableBody.firstChild);
        console.log("[showCreateProductRow] Create row added to table.");
        createRow.querySelector('.edit-name').focus(); // Focus the first input
    };

    const handleCancelCreateProduct = () => {
        console.log("[handleCancelCreateProduct] Cancelling product creation.");
        const createRow = document.querySelector('tr.creating');
        if (createRow) {
            createRow.remove();
        }
        isCreatingProduct = false;
        toggleActionButtonsDisabled(false); // Re-enable other actions
    };

    const handleSaveNewProduct = async () => {
        console.log("[handleSaveNewProduct] Attempting to save new product.");
        const createRow = document.querySelector('tr.creating');
        if (!createRow) {
            console.error("[handleSaveNewProduct] Create row not found!");
            return;
        }

        // --- Get values from inputs ---
        const nameInput = createRow.querySelector('.edit-name');
        const priceInput = createRow.querySelector('.edit-price');
        const stockInput = createRow.querySelector('.edit-stock');
        const storeSelect = createRow.querySelector('.edit-store');

        if (!nameInput || !priceInput || !stockInput || !storeSelect) {
             console.error("[handleSaveNewProduct] Input elements not found in the create row.");
             alert("Error: No se pudieron encontrar los campos de creación.");
             return;
        }

        const newData = {
             name: nameInput.value.trim(),
             price: parseFloat(priceInput.value),
             stock: parseInt(stockInput.value, 10),
             store_id: storeSelect.value || null
        };

        // --- Validation (similar to edit) ---
        if (!newData.name) { alert("El nombre del producto no puede estar vacío."); nameInput.focus(); return; }
        if (isNaN(newData.price) || newData.price < 0) { alert("El precio debe ser un número positivo."); priceInput.focus(); return; }
        if (isNaN(newData.stock) || !Number.isInteger(newData.stock) || newData.stock < 0) { alert("El stock debe ser un número entero positivo."); stockInput.focus(); return; }
        if (!newData.store_id) { alert("Debe seleccionar una tienda válida."); storeSelect.focus(); return; }

        console.log("[handleSaveNewProduct] Validation passed. New data:", newData);

        // --- API Call (POST request) ---
        try {
            const createUrl = PRODUCTS_ENDPOINT;
            console.log(`[handleSaveNewProduct] Sending POST request to: ${createUrl}`);

            const { error, response, data: createdProduct } = await fetchData(createUrl, {
                 method: 'POST',
                 body: JSON.stringify(newData)
            });

            if (error) {
                 console.error(`[handleSaveNewProduct] Failed to create product:`, error);
                 alert(`Error al crear el producto: ${error}`);
                 // Keep create row open for correction
            } else {
                 console.log(`[handleSaveNewProduct] Product created successfully. Response data:`, createdProduct);
                 handleCancelCreateProduct(); // Remove the create row
                 await fetchProducts(); // Refresh the table to show the new product
                 alert("Producto creado correctamente.");
            }
        } catch (err) {
            console.error(`[handleSaveNewProduct] Exception during product creation:`, err);
            alert(`Ocurrió un error inesperado al intentar crear el producto.`);
            // Keep create row open
        }
    };

    const handleCancelEdit = (productId) => {
        console.log(`[handleCancelEdit] Cancelling edit for product ID: ${productId}`);
        if (!originalRowData || editingProductId !== productId) {
            console.warn("[handleCancelEdit] No original data found or mismatch in editing ID. Cannot cancel properly.");
            // Attempt to find the row and just refresh maybe?
             const row = document.querySelector(`tr[data-product-id="${productId}"]`);
             if(row) renderRowDisplayMode(row, {}); // Re-render with potentially empty data as fallback
             else fetchProducts(); // Full refresh as last resort
            return;
        }
        const row = document.querySelector(`tr.editing[data-product-id="${productId}"]`);
        if (row) {
            renderRowDisplayMode(row, originalRowData);
        } else {
            console.error(`[handleCancelEdit] Could not find the editing row for ID: ${productId}`);
        }
        // Reset state regardless
        editingProductId = null;
        originalRowData = null;
        toggleActionButtonsDisabled(false); // Re-enable buttons on cancel
    };

    const handleSaveProduct = async (productId) => {
        console.log(`[handleSaveProduct] Attempting to save product ID: ${productId}`);
        const row = document.querySelector(`tr.editing[data-product-id="${productId}"]`);
        if (!row) {
            console.error(`[handleSaveProduct] Could not find the editing row for ID: ${productId}`);
            return;
        }

        // --- Get values from inputs ---
        const nameInput = row.querySelector('.edit-name');
        const priceInput = row.querySelector('.edit-price');
        const stockInput = row.querySelector('.edit-stock');
        const storeSelect = row.querySelector('.edit-store');

        if (!nameInput || !priceInput || !stockInput || !storeSelect) {
            console.error("[handleSaveProduct] Input elements not found in the row.");
            alert("Error: No se pudieron encontrar los campos de edición.");
            return;
        }

        const updatedData = {
            name: nameInput.value.trim(),
            price: parseFloat(priceInput.value), // Convert to number
            stock: parseInt(stockInput.value, 10), // Convert to integer
            store_id: storeSelect.value || null // Read string UUID directly
        };

        // --- Validation --- 
        if (!updatedData.name) {
            alert("El nombre del producto no puede estar vacío.");
            nameInput.focus();
            return;
        }
        if (isNaN(updatedData.price) || updatedData.price < 0) {
            alert("El precio debe ser un número positivo.");
            priceInput.focus();
            return;
        }
        if (isNaN(updatedData.stock) || !Number.isInteger(updatedData.stock) || updatedData.stock < 0) {
            alert("El stock debe ser un número entero positivo.");
            stockInput.focus();
            return;
        }
        if (!updatedData.store_id) { // Check if store_id is null or empty string
             alert("Debe seleccionar una tienda válida.");
             storeSelect.focus();
             return;
        }
        console.log("[handleSaveProduct] Validation passed. Updated data:", updatedData);

        // --- API Call --- 
        try {
            const saveUrl = `${PRODUCTS_ENDPOINT}/${productId}`;
            console.log(`[handleSaveProduct] Sending PUT request to: ${saveUrl}`);

            // Use PUT for full update, ensure body matches backend schema
            const { error, response, data: savedProduct } = await fetchData(saveUrl, { 
                method: 'PUT',
                body: JSON.stringify(updatedData)
            });

            if (error) {
                 console.error(`[handleSaveProduct] Failed to save product ${productId}:`, error);
                 alert(`Error al guardar: ${error}`);
                 // Keep row in edit mode
             } else {
                 console.log(`[handleSaveProduct] Product ${productId} saved successfully. Response data:`, savedProduct);
                 // Use the returned data (if available) or the data we sent to update the row
                 const displayData = { ...originalRowData, ...(savedProduct || updatedData), id: productId }; // Merge data, prioritize response
                 renderRowDisplayMode(row, displayData);
                 // Log token status AFTER rendering
                 console.log(`[handleSaveProduct] Token after renderRowDisplayMode for ${productId}:`, getToken());
                 // No need to fetchProducts() if the row is updated directly
                 toggleActionButtonsDisabled(false); // Re-enable buttons on successful save
             }
        } catch (err) {
            console.error(`[handleSaveProduct] Exception during save for product ${productId}:`, err);
            alert(`Ocurrió un error inesperado al intentar guardar el producto ${productId}.`);
            // Keep row in edit mode
        }
    };

    const handleDeleteProduct = async (productId) => {
        // --- Prevent deleting while editing the same row --- 
        if (editingProductId === productId) {
            alert("No puedes eliminar un producto mientras lo estás editando. Cancela la edición primero.");
            return;
        }
        // --- Check if *another* row is being edited --- 
        if (editingProductId && editingProductId !== productId) {
            if (!confirm("Hay otro producto en modo edición. ¿Quieres cancelar esa edición y eliminar este producto?")) {
                return; // User chose not to proceed
            }
            handleCancelEdit(editingProductId); // Cancel the other edit
        }
        // --- END Prevent Deletion Checks ---

        if (!productId) {
            console.error('[handleDeleteProduct] No product ID provided.');
            return;
        }
        console.log(`[handleDeleteProduct] Attempting to delete product ID: ${productId}`);

        if (!confirm(`¿Estás seguro de que quieres eliminar el producto con ID ${productId}? Esta acción no se puede deshacer.`)) {
            console.log('[handleDeleteProduct] Deletion cancelled by user.');
            return;
        }

        try {
            const deleteUrl = `${PRODUCTS_ENDPOINT}/${productId}`;
            console.log(`[handleDeleteProduct] Sending DELETE request to: ${deleteUrl}`);
            const { error, response } = await fetchData(deleteUrl, { method: 'DELETE' });

             if (error) {
                 console.error(`[handleDeleteProduct] Failed to delete product ${productId}:`, error);
                 alert(`Error al eliminar el producto ${productId}: ${error || 'Error desconocido'}`);
             } else {
                 console.log(`[handleDeleteProduct] Product ${productId} deleted successfully.`);
                 // Find the row and remove it directly for immediate feedback
                 const rowToRemove = document.querySelector(`tr[data-product-id="${productId}"]`);
                 if (rowToRemove) {
                     rowToRemove.remove(); // Attempt to remove row for immediate feedback
                     console.log(`[handleDeleteProduct] Row for ${productId} removed from table.`);
                 } else {
                     console.warn(`[handleDeleteProduct] Row for ${productId} not found after delete, will rely on fetchProducts.`);
                 }
                 // Fetch products again to ensure table consistency and correct pagination
                 await fetchProducts();
             }
        } catch (err) {
            console.error(`[handleDeleteProduct] Exception during delete for product ${productId}:`, err);
            alert(`Ocurrió un error inesperado al intentar eliminar el producto ${productId}.`);
        }
    };

    const handleEditProduct = (productId) => {
        console.log(`[handleEditProduct] Edit action triggered for product ID: ${productId}`);
        // --- Prevent editing multiple rows --- 
        if (isCreatingProduct) {
            alert("Guarda o cancela la creación del nuevo producto antes de editar otro.");
            return;
        }
        if (editingProductId && editingProductId !== productId) {
            if (!confirm("Ya estás editando otro producto. ¿Quieres cancelar esa edición y editar este?")) {
                return; // User chose not to proceed
            }
            handleCancelEdit(editingProductId); // Cancel the other edit first
        }
        if(editingProductId === productId) { // Already editing this one
            console.log(`[handleEditProduct] Row ${productId} is already in edit mode.`);
            return;
        }
        // --- END Multiple Edit Check ---

        const row = document.querySelector(`tr[data-product-id="${productId}"]`);
        if (!row) {
            console.error(`[handleEditProduct] Could not find the row for ID: ${productId}`);
            return;
        }

        // --- Store original data (simple approach: read from current cells) ---
        try {
            const name = row.cells[0].textContent;
            const priceText = row.cells[1].textContent;
            const stockText = row.cells[2].textContent;
            // Finding store_id is tricky here, need to search based on displayed name or have it stored
            // Let's assume we have the full product object available somehow or refetch
            // SIMPLIFICATION: Let's just use the data we have easily
            const store_id = row.dataset.storeId || null; // Read string UUID directly

            originalRowData = {
                id: productId,
                name: name,
                price: parseFloat(priceText), // Attempt to parse
                stock: parseInt(stockText, 10),
                store_id: store_id
            };
             console.log("[handleEditProduct] Stored original data:", originalRowData);

            // Switch row to edit mode
             renderRowEditMode(row, originalRowData);
             toggleActionButtonsDisabled(true); // Disable other buttons while editing

        } catch (e) {
            console.error("[handleEditProduct] Error reading original data from row:", e);
            alert("Error al intentar iniciar la edición.");
            // Reset state if error occurs
            editingProductId = null;
             originalRowData = null;
        }
    };

    // --- Customer Action Handlers ---

    const showCreateCustomerRow = () => {
        console.log("[showCreateCustomerRow] Attempting to show create row.");
        if (editingCustomerId || editingProductId || isCreatingProduct) { // Check all editing/creating states
            alert("Termina o cancela cualquier edición o creación actual antes de crear un nuevo cliente.");
            return;
        }
        if (isCreatingCustomer) {
             console.log("[showCreateCustomerRow] Already creating a customer.");
             document.querySelector('tr.creating[data-customer-id] .edit-name')?.focus();
             return;
        }

        const tableBody = document.getElementById('customers-table-body');
        if (!tableBody) { console.error("[showCreateCustomerRow] Customer table body not found!"); return; }

        isCreatingCustomer = true;
        toggleActionButtonsDisabled(true); // Disable other actions

        const createRow = document.createElement('tr');
        createRow.classList.add('creating');
        createRow.dataset.customerId = ''; // Indicate this is a create row

        const storeOptions = availableStores.map(store =>
            `<option value="${store.id}">${store.name || store.id}</option>`
        ).join('');

        // Adapt HTML for customer fields
        createRow.innerHTML = `
            <td><input type="text" class="edit-input edit-name" placeholder="Nombre cliente"></td>
            <td><input type="email" class="edit-input edit-email" placeholder="cliente@ejemplo.com"></td>
            <td><input type="text" class="edit-input edit-phone" placeholder="123-456-7890"></td>
            <td>
                 <select class="edit-input edit-store">
                     <option value="">Seleccionar tienda...</option> ${storeOptions}
                 </select>
             </td>
            <td></td> <!-- Created date empty -->
            <td class="actions">
                <button class="action-icon-btn save-new-btn" title="Guardar Nuevo Cliente">
                    ${svgIconSave}
                 </button>
                 <button class="action-icon-btn cancel-create-btn" title="Cancelar Creación">
                     ${svgIconCancel}
                 </button>
            </td>
        `;

        tableBody.insertBefore(createRow, tableBody.firstChild);
        console.log("[showCreateCustomerRow] Create customer row added.");
        createRow.querySelector('.edit-name').focus();
    };

    const handleCancelCreateCustomer = () => {
        console.log("[handleCancelCreateCustomer] Cancelling customer creation.");
        const createRow = document.querySelector('tr.creating[data-customer-id=""]'); // Target specific create row
        if (createRow) {
            createRow.remove();
        }
        isCreatingCustomer = false;
        toggleActionButtonsDisabled(false);
    };

    const handleSaveNewCustomer = async () => {
        console.log("[handleSaveNewCustomer] Attempting to save new customer.");
        const createRow = document.querySelector('tr.creating[data-customer-id=""]');
        if (!createRow) { console.error("[handleSaveNewCustomer] Create row not found!"); return; }

        const nameInput = createRow.querySelector('.edit-name');
        const emailInput = createRow.querySelector('.edit-email');
        const phoneInput = createRow.querySelector('.edit-phone');
        const storeSelect = createRow.querySelector('.edit-store');

        if (!nameInput || !emailInput || !phoneInput || !storeSelect) {
             console.error("[handleSaveNewCustomer] Input elements not found."); alert("Error: Campos de creación no encontrados."); return;
        }

        const newData = {
             name: nameInput.value.trim(),
             email: emailInput.value.trim(),
             phone: phoneInput.value.trim(),
             store_id: storeSelect.value || null
        };

        // --- Validation ---
        if (!newData.name) { alert("El nombre del cliente no puede estar vacío."); nameInput.focus(); return; }
        // Basic email validation (more robust validation can be added)
        if (!newData.email || !/\S+@\S+\.\S+/.test(newData.email)) { alert("Introduce un email válido."); emailInput.focus(); return; }
        if (!newData.phone) { alert("El teléfono no puede estar vacío."); phoneInput.focus(); return; } // Simple check
        if (!newData.store_id) { alert("Debe seleccionar una tienda válida."); storeSelect.focus(); return; }

        console.log("[handleSaveNewCustomer] Validation passed. New data:", newData);

        // --- API Call (POST request) ---
        try {
            const createUrl = CUSTOMERS_ENDPOINT;
            console.log(`[handleSaveNewCustomer] Sending POST request to: ${createUrl}`);

            const { error, data: createdCustomer } = await fetchData(createUrl, {
                 method: 'POST',
                 body: JSON.stringify(newData)
            });

            if (error) {
                 console.error(`[handleSaveNewCustomer] Failed to create customer:`, error);
                 alert(`Error al crear el cliente: ${error}`);
            } else {
                 console.log(`[handleSaveNewCustomer] Customer created successfully:`, createdCustomer);
                 handleCancelCreateCustomer(); // Remove the create row
                 await fetchCustomers(); // Refresh the table
                 alert("Cliente creado correctamente.");
            }
        } catch (err) {
            console.error(`[handleSaveNewCustomer] Exception during customer creation:`, err);
            alert(`Ocurrió un error inesperado al intentar crear el cliente.`);
        }
    };

    const handleCancelEditCustomer = (customerId) => {
        console.log(`[handleCancelEditCustomer] Cancelling edit for customer ID: ${customerId}`);
        // Assuming originalRowData holds the customer data being edited
        if (!originalRowData || editingCustomerId !== customerId) {
            console.warn("[handleCancelEditCustomer] No original data or ID mismatch.");
             const row = document.querySelector(`tr[data-customer-id="${customerId}"]`);
             if(row) renderCustomerRowDisplayMode(row, {}); // Fallback render
             else fetchCustomers(); // Full refresh
            return;
        }
        const row = document.querySelector(`tr.editing[data-customer-id="${customerId}"]`);
        if (row) {
            renderCustomerRowDisplayMode(row, originalRowData);
        } else {
            console.error(`[handleCancelEditCustomer] Could not find editing row for ID: ${customerId}`);
        }
        editingCustomerId = null;
        originalRowData = null;
        toggleActionButtonsDisabled(false);
    };

    const handleSaveCustomer = async (customerId) => {
        console.log(`[handleSaveCustomer] Attempting to save customer ID: ${customerId}`);
        const row = document.querySelector(`tr.editing[data-customer-id="${customerId}"]`);
        if (!row) { console.error(`[handleSaveCustomer] Editing row not found: ${customerId}`); return; }

        const nameInput = row.querySelector('.edit-name');
        const emailInput = row.querySelector('.edit-email');
        const phoneInput = row.querySelector('.edit-phone');

        if (!nameInput || !emailInput || !phoneInput) {
            console.error("[handleSaveCustomer] Input elements not found."); alert("Error: Campos de edición no encontrados."); return;
        }

        const updatedData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim()
            // store_id is not included as it's not editable via CustomerUpdate schema
        };

        // --- Validation ---
        if (!updatedData.name) { alert("El nombre no puede estar vacío."); nameInput.focus(); return; }
        if (!updatedData.email || !/\S+@\S+\.\S+/.test(updatedData.email)) { alert("Introduce un email válido."); emailInput.focus(); return; }
        if (!updatedData.phone) { alert("El teléfono no puede estar vacío."); phoneInput.focus(); return; }

        console.log("[handleSaveCustomer] Validation passed. Updated data:", updatedData);

        // --- API Call (PUT request) ---
        try {
            const saveUrl = `${CUSTOMERS_ENDPOINT}/${customerId}`;
            console.log(`[handleSaveCustomer] Sending PUT request to: ${saveUrl}`);

            const { error, data: savedCustomer } = await fetchData(saveUrl, {
                method: 'PUT',
                body: JSON.stringify(updatedData) // Send only updatable fields
            });

            if (error) {
                 console.error(`[handleSaveCustomer] Failed to save customer ${customerId}:`, error);
                 alert(`Error al guardar: ${error}`);
             } else {
                 console.log(`[handleSaveCustomer] Customer ${customerId} saved successfully:`, savedCustomer);
                 // Merge original data with saved data (or updatedData as fallback)
                 const displayData = { ...originalRowData, ...(savedCustomer || updatedData), id: customerId };
                 renderCustomerRowDisplayMode(row, displayData);
                 editingCustomerId = null; // Reset editing state
                 originalRowData = null;
                 toggleActionButtonsDisabled(false);
             }
        } catch (err) {
            console.error(`[handleSaveCustomer] Exception during save for ${customerId}:`, err);
            alert(`Ocurrió un error inesperado al guardar el cliente ${customerId}.`);
        }
    };

    const handleDeleteCustomer = async (customerId) => {
        if (editingCustomerId === customerId) {
            alert("Cancela la edición actual antes de eliminar."); return;
        }
        if (editingCustomerId || isCreatingCustomer || editingProductId || isCreatingProduct) { // Check all states
             if (!confirm("Hay una operación de edición o creación en curso. ¿Quieres cancelarla y eliminar este cliente?")) {
                 return;
             }
             // Cancel any ongoing operation
             if(editingCustomerId) handleCancelEditCustomer(editingCustomerId);
             if(isCreatingCustomer) handleCancelCreateCustomer();
             if(editingProductId) handleCancelEdit(editingProductId); // Assuming product cancel function exists
             if(isCreatingProduct) handleCancelCreateProduct(); // Assuming product cancel function exists
        }

        if (!customerId) { console.error('[handleDeleteCustomer] No customer ID.'); return; }
        console.log(`[handleDeleteCustomer] Attempting delete for ID: ${customerId}`);

        if (!confirm(`¿Seguro que quieres eliminar al cliente con ID ${customerId}?`)) {
            console.log('[handleDeleteCustomer] Deletion cancelled.'); return;
        }

        try {
            const deleteUrl = `${CUSTOMERS_ENDPOINT}/${customerId}`;
            console.log(`[handleDeleteCustomer] Sending DELETE to: ${deleteUrl}`);
            const { error } = await fetchData(deleteUrl, { method: 'DELETE' });

             if (error) {
                 console.error(`[handleDeleteCustomer] Failed for ${customerId}:`, error);
                 alert(`Error al eliminar cliente ${customerId}: ${error}`);
             } else {
                 console.log(`[handleDeleteCustomer] Customer ${customerId} deleted.`);
                 const rowToRemove = document.querySelector(`tr[data-customer-id="${customerId}"]`);
                 if (rowToRemove) {
                     rowToRemove.remove();
                     console.log(`[handleDeleteCustomer] Row removed.`);
                 }
                 // Optionally, refresh the whole table to ensure consistency
                 await fetchCustomers();
             }
        } catch (err) {
            console.error(`[handleDeleteCustomer] Exception for ${customerId}:`, err);
            alert(`Error inesperado al eliminar cliente ${customerId}.`);
        }
    };

     const handleEditCustomer = (customerId) => {
        console.log(`[handleEditCustomer] Edit triggered for ID: ${customerId}`);
        if (isCreatingCustomer || editingProductId || isCreatingProduct) {
            alert("Termina o cancela cualquier edición o creación actual antes de editar un cliente."); return;
        }
        if (editingCustomerId && editingCustomerId !== customerId) {
            if (!confirm("Ya estás editando otro cliente. ¿Cancelar esa edición y editar este?")) { return; }
            handleCancelEditCustomer(editingCustomerId);
        }
        if(editingCustomerId === customerId) { console.log(`[handleEditCustomer] Row ${customerId} already in edit mode.`); return; }

        const row = document.querySelector(`tr[data-customer-id="${customerId}"]`);
        if (!row) { console.error(`[handleEditCustomer] Row not found: ${customerId}`); return; }

        try {
            // Read data directly from cells for simplicity, assuming renderCustomerRowDisplayMode is accurate
            const name = row.cells[0].textContent;
            const email = row.cells[1].textContent;
            const phone = row.cells[2].textContent;
            const store_id = row.dataset.storeId || null; // Get store_id from data attribute

            // Need created_at and updated_at if they are part of the BaseCustomer schema used by renderCustomerRowDisplayMode
            // For simplicity, let's assume they are not strictly needed for re-rendering display mode after cancel
            originalRowData = { id: customerId, name, email, phone, store_id }; // Store essential data

             console.log("[handleEditCustomer] Stored original data:", originalRowData);

             renderCustomerRowEditMode(row, originalRowData); // Switch to edit mode
             editingCustomerId = customerId; // Set editing state
             toggleActionButtonsDisabled(true);

        } catch (e) {
            console.error("[handleEditCustomer] Error reading original data:", e);
            alert("Error al iniciar la edición.");
            editingCustomerId = null;
            originalRowData = null;
            toggleActionButtonsDisabled(false); // Ensure buttons are re-enabled on error
        }
    };


    // --- UI Update for Sort Indicators ---
    const updateSortIndicators = () => {
        contentArea.querySelectorAll('th[data-sort-key]').forEach(th => {
            const indicator = th.querySelector('.sort-indicator');
            if (!indicator) return;
            if (th.dataset.sortKey === currentSortKey) {
                indicator.textContent = currentSortDirection === 'asc' ? ' ▲' : ' ▼';
                th.classList.add('sorted'); // Optional: for specific styling
            } else {
                indicator.textContent = '';
                th.classList.remove('sorted');
            }
        });
        console.log(`[updateSortIndicators] Indicators updated. Key: ${currentSortKey}, Dir: ${currentSortDirection}`);
    };

}); // End DOMContentLoaded

// --- Order View Logic ---

const fetchOrders = async () => {
    console.log(`[fetchOrders] Fetching. Page: ${currentPage}, Size: ${currentPageSize}`);
    const tableBody = document.getElementById('orders-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
    const pageNumbersContainer = document.getElementById('orders-page-numbers'); // Use specific ID for orders
    if(pageNumbersContainer) pageNumbersContainer.innerHTML = ''; // Clear numbers while loading

    let url = `${API_BASE_URL}/orders?page=${currentPage}&page_size=${currentPageSize}`;

    // Append sorting parameters if defined
    if (currentSortKey) {
        url += `${url.includes('?') ? '&' : '?'}order_by=${currentSortKey}&order_dir=${currentSortDirection}`;
    }

    console.log(`[fetchOrders] Calling fetchData: ${url}`);
    const { error, response, data: ordersData } = await fetchData(url);

    if (error) {
        console.error(`[fetchOrders] Fetch error:`, error);
        showContentError(`Error al cargar órdenes: ${error}`);
        renderOrderTable([]);
        updatePaginationControls({ nextPageNum: null, lastPageNum: null });
        return;
    }

    if (!response) {
        console.error(`[fetchOrders] Fetch succeeded but response object is missing.`);
        showContentError(`Error interno al procesar respuesta.`);
        renderOrderTable(ordersData || []);
        updatePaginationControls({ nextPageNum: null, lastPageNum: null });
        return;
    }

    console.log(`[fetchOrders] Fetched ${ordersData?.length} orders.`);
    renderOrderTable(ordersData || []);

    const nextPageHeader = response.headers.get('x-next-page');
    const lastPageHeader = response.headers.get('x-last-page');
    const nextPageNum = getPageNumberFromUrl(nextPageHeader);
    const lastPageNum = getPageNumberFromUrl(lastPageHeader);

    updatePaginationControls({ nextPageNum, lastPageNum });
};

const renderOrderTable = (orders) => {
    console.log('[renderOrderTable] Rendering table...');
    const ordersSection = document.getElementById('orders-section');
    if (!ordersSection) { console.error('[renderOrderTable] Orders section missing!'); return; }

    // Clear previous content and add table structure
    ordersSection.innerHTML = `
        <h2>Gestión de Órdenes</h2>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Cliente ID</th>
                        <th>Tienda ID</th>
                        <th class="sortable" data-sort-key="total">Total</th>
                        <th class="sortable" data-sort-key="created_at">Fecha Creación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="orders-table-body">
                    <!-- Order rows will be inserted here -->
                </tbody>
            </table>
        </div>
        <div class="pagination-controls">
            <button id="prev-page-button">Anterior</button>
            <span id="page-info"></span>
            <div id="page-numbers" class="page-numbers"></div> <!-- Container for page number buttons -->
            <button id="next-page-button">Siguiente</button>
        </div>
    `;

    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) { console.error('[renderOrderTable] Table body missing after render!'); return; }

    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No se encontraron órdenes.</td></tr>';
        return;
    }

    console.log(`[renderOrderTable] Rendering ${orders.length} items.`);
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.dataset.orderId = order.id;
        row.innerHTML = `
            <td>${order.id || 'N/A'}</td>
            <td>${order.customer_id || 'N/A'}</td>
            <td>${order.store_id || 'N/A'}</td>
            <td>${order.total !== undefined && order.total !== null ? order.total.toFixed(2) : 'N/A'}</td>
            <td>${formatDate(order.created_at)}</td>
            <td class="actions">
                <button class="action-icon-btn copy-id-btn" data-order-id="${order.id || ''}" title="Copiar ID de la Orden">
                    ${svgIconClipboard}
                </button>
                <button class="action-icon-btn view-details-btn" data-order-id="${order.id || ''}" title="Ver Detalles de la Orden">
                     ${svgIconClipboard} <!-- Using clipboard icon for now, replace with a view/details icon if available -->
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    updateSortIndicators(); // Apply sort indicators after rendering
};

const loadOrdersView = async () => {
    console.log('[loadOrdersView] Loading Orders view...');
    clearContentArea(); // Clear previous content and show loading
    currentPage = 1; // Reset pagination for the new view
    currentSortKey = 'created_at'; // Default sort for orders
    currentSortDirection = 'desc';
    await fetchOrders();
    console.log('[loadOrdersView] Orders view loaded.');
};

// --- Store View Logic ---

const fetchStores = async () => {
    console.log(`[fetchStores] Fetching. Page: ${currentPage}, Size: ${currentPageSize}`);
    const tableBody = document.getElementById('stores-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';
    const pageNumbersContainer = document.getElementById('stores-page-numbers'); // Use specific ID for stores
    if(pageNumbersContainer) pageNumbersContainer.innerHTML = ''; // Clear numbers while loading

    let url = `${API_BASE_URL}/stores?page=${currentPage}&page_size=${currentPageSize}`;

    // Append sorting parameters if defined
    if (currentSortKey) {
        url += `${url.includes('?') ? '&' : '?'}order_by=${currentSortKey}&order_dir=${currentSortDirection}`;
    }

    console.log(`[fetchStores] Calling fetchData: ${url}`);
    const { error, response, data: storesData } = await fetchData(url);

    if (error) {
        console.error(`[fetchStores] Fetch error:`, error);
        showContentError(`Error al cargar tiendas: ${error}`);
        renderStoreTable([]);
        updatePaginationControls({ nextPageNum: null, lastPageNum: null });
        return;
    }

    if (!response) {
        console.error(`[fetchStores] Fetch succeeded but response object is missing.`);
        showContentError(`Error interno al procesar respuesta.`);
        renderStoreTable(storesData || []);
        updatePaginationControls({ nextPageNum: null, lastPageNum: null });
        return;
    }

    console.log(`[fetchStores] Fetched ${storesData?.length} stores.`);
    renderStoreTable(storesData || []);

    const nextPageHeader = response.headers.get('x-next-page');
    const lastPageHeader = response.headers.get('x-last-page');
    const nextPageNum = getPageNumberFromUrl(nextPageHeader);
    const lastPageNum = getPageNumberFromUrl(lastPageHeader);

    updatePaginationControls({ nextPageNum, lastPageNum });
};

const renderStoreTable = (stores) => {
    console.log('[renderStoreTable] Rendering table...');
    const storesSection = document.getElementById('stores-section');
    if (!storesSection) { console.error('[renderStoreTable] Stores section missing!'); return; }

    // Clear previous content and add table structure
    storesSection.innerHTML = `
        <h2>Gestión de Tiendas</h2>
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th class="sortable" data-sort-key="name">Nombre</th>
                        <th class="sortable" data-sort-key="address">Dirección</th>
                        <th class="sortable" data-sort-key="created_at">Fecha Creación</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody id="stores-table-body">
                    <!-- Store rows will be inserted here -->
                </tbody>
            </table>
        </div>
        <div class="pagination-controls">
            <button id="prev-page-button">Anterior</button>
            <span id="page-info"></span>
            <div id="page-numbers" class="page-numbers"></div> <!-- Container for page number buttons -->
            <button id="next-page-button">Siguiente</button>
        </div>
    `;

    const tableBody = document.getElementById('stores-table-body');
    if (!tableBody) { console.error('[renderStoreTable] Table body missing after render!'); return; }

    if (!stores || stores.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No se encontraron tiendas.</td></tr>';
        return;
    }

    console.log(`[renderStoreTable] Rendering ${stores.length} items.`);
    stores.forEach(store => {
        const row = document.createElement('tr');
        row.dataset.storeId = store.id;
        row.innerHTML = `
            <td>${store.id || 'N/A'}</td>
            <td>${store.name || 'N/A'}</td>
            <td>${store.address || 'N/A'}</td>
            <td>${formatDate(store.created_at)}</td>
            <td class="actions">
                <button class="action-icon-btn copy-id-btn" data-store-id="${store.id || ''}" title="Copiar ID de la Tienda">
                    ${svgIconClipboard}
                </button>
                <button class="action-icon-btn view-details-btn" data-store-id="${store.id || ''}" title="Ver Detalles de la Tienda">
                     ${svgIconClipboard} <!-- Using clipboard icon for now, replace with a view/details icon if available -->
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    updateSortIndicators(); // Apply sort indicators after rendering
};

const loadStoresView = async () => {
    console.log('[loadStoresView] Loading Stores view...');
    clearContentArea(); // Clear previous content and show loading
    currentPage = 1; // Reset pagination for the new view
    currentSortKey = 'created_at'; // Default sort for stores
    currentSortDirection = 'desc';
    await fetchStores();
    console.log('[loadStoresView] Stores view loaded.');
};
