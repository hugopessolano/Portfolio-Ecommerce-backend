import * as api from './api.js';
import * as state from './state.js';
import * as utils from './utils.js';
import * as ui from './uiComponents.js';
import * as config from './config.js';
import { loadOrderDetailView } from './orderDetailView.js'; // Import the new detail view function

const contentArea = document.querySelector('.content-area');

// --- Order Table Rendering ---

const renderOrderTable = (orders, stores) => {
    console.log('[OrderView] Rendering table...');
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) {
        console.error('[OrderView] Table body missing!');
        return;
    }
    tableBody.innerHTML = ''; // Clear previous content
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No se encontraron órdenes.</td></tr>'; // Adjust colspan
        return;
    }

    console.log(`[OrderView] Rendering ${orders.length} items.`);
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.dataset.orderId = order.id; // Keep orderId for actions if needed later
        const storeName = stores.find(store => store.id === order.store_id)?.name || 'N/A';
        row.innerHTML = `
            <td>${order.customer?.name || 'N/A'}</td>
            <td>${storeName}</td>
            <td>${order.total !== undefined && order.total !== null ? order.total.toFixed(2) : 'N/A'}</td>
            <td>${utils.formatDate(order.created_at)}</td>
            <td class="actions">
                <button class="action-icon-btn copy-id-btn" data-order-id="${order.id || ''}" title="Copiar ID de la Orden">
                    ${config.svgIconClipboard}
                </button>
                <button class="action-icon-btn view-details-btn" data-order-id="${order.id || ''}" title="Ver Detalles de la Orden">
                     ${config.svgIconViewDetails} <!-- Using a view details icon -->
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

// --- Order Data Fetching ---

const fetchOrders = async () => {
    console.log(`[OrderView] Fetching. Page: ${state.currentPage}, Size: ${state.currentPageSize}, Sort: ${state.currentSortKey} ${state.currentSortDirection}`);
    const tableBody = document.getElementById('orders-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">Cargando órdenes...</td></tr>'; // Adjust colspan
    const pageNumbersContainer = document.getElementById('page-numbers'); // Use generic ID
    if (pageNumbersContainer) pageNumbersContainer.innerHTML = '';

    // Ensure sort key is valid for orders
    const validOrderSortKeys = ['total', 'created_at'];
    let fetchSortKey = state.currentSortKey;
    if (fetchSortKey && !validOrderSortKeys.includes(fetchSortKey)) {
        console.warn(`[OrderView] Invalid sort key '${fetchSortKey}' for orders. Resetting.`);
        state.setSort(null, 'asc'); // Reset state
        fetchSortKey = null; // Use null for the fetch call
        ui.updateSortIndicators(); // Update UI
    }

    // Fetch stores to map store_id to store name
    let allStores = [];
    let storePage = 1;
    const storePageSize = 100; // Valid page size for stores endpoint
    let hasMoreStores = true;

    while (hasMoreStores) {
        const { error: storeError, response: storeResponse, data: storesData } = await api.getStores(storePage, storePageSize);
        if (storeError) {
            console.error(`[OrderView] Error fetching stores page ${storePage}:`, storeError);
            // Decide how to handle this error - maybe show orders with N/A for store name
            // For now, break the loop and use the stores fetched so far
            break;
        }
        if (storesData) {
            allStores = allStores.concat(storesData);
        }

        const nextStorePageHeader = storeResponse?.headers.get('X-Next-Page');
        hasMoreStores = nextStorePageHeader !== null;
        if (hasMoreStores) {
            storePage++;
        }
    }
    const stores = allStores;


    const { error, response, data: ordersData } = await api.getOrders(state.currentPage, state.currentPageSize, fetchSortKey, state.currentDirection); // Corrected state.currentSortDirection to state.currentDirection

    if (error) {
        console.error(`[OrderView] Fetch error:`, error);
        utils.showContentError(`Error al cargar órdenes: ${error}`);
        renderOrderTable([]);
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchOrders);
        return;
    }

    if (!response) {
        console.error(`[OrderView] Fetch succeeded but response object is missing.`);
        utils.showContentError(`Error interno al procesar respuesta del servidor.`);
        renderOrderTable(ordersData || []);
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchOrders);
        return;
    }

    console.log(`[OrderView] Fetched ${ordersData?.length} orders.`);
    renderOrderTable(ordersData || [], stores); // Pass stores to renderOrderTable

    // --- Parse Headers and Update Pagination ---
    const nextPageHeader = response.headers.get('X-Next-Page');
    const lastPageHeader = response.headers.get('X-Last-Page');
    const nextPageNum = utils.getPageNumberFromUrl(nextPageHeader);
    const lastPageNum = utils.getPageNumberFromUrl(lastPageHeader);

    let finalLastPage = lastPageNum;
    if (finalLastPage === null && ordersData && ordersData.length < state.currentPageSize) {
        finalLastPage = state.currentPage;
    }

    ui.updatePaginationControls({ nextPageNum: nextPageNum, lastPageNum: finalLastPage }, fetchOrders);
    // ---

    console.log(`[OrderView] Finished processing page ${state.currentPage}.`);
};

// --- Event Listener Setup ---
const setupOrderViewEventListeners = () => {
    if (!contentArea) return;

    // Use event delegation on the table body for copy/view details
    const tableBody = contentArea.querySelector('#orders-table-body');
    if (tableBody) {
        tableBody.replaceWith(tableBody.cloneNode(true)); // Remove old listeners
        const newTableBody = contentArea.querySelector('#orders-table-body');

        newTableBody.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('.action-icon-btn');
            if (!targetButton) return;
            event.preventDefault();

            const orderId = targetButton.dataset.orderId;
            if (!orderId) return;

            if (targetButton.classList.contains('copy-id-btn')) {
                try {
                    await navigator.clipboard.writeText(orderId);
                    console.log(`[OrderView] Copied order ID: ${orderId}`);
                    targetButton.disabled = true; targetButton.classList.add('copied-success');
                    setTimeout(() => { targetButton.disabled = false; targetButton.classList.remove('copied-success'); }, 1500);
                } catch (err) {
                    console.error('[OrderView] Failed to copy ID:', err); alert('No se pudo copiar el ID.');
                }
            } else if (targetButton.classList.contains('view-details-btn')) {
                console.log(`[OrderView] View details clicked for order ID: ${orderId}`);
                // Update the URL hash to trigger navigation to the order detail view
                window.location.hash = `order/${orderId}`;
            }
        });
         console.log("[OrderView] Table body event listener setup.");
    } else {
        console.error("[OrderView] Order table body not found after loading view.");
    }

    // Setup shared UI components (pagination, sorting, page size)
    // Note: Store filter is not applicable to Orders based on original script structure
    ui.setupSortableHeaders(fetchOrders);
    ui.setupPageSizeSelector(fetchOrders);
    // Pagination controls are setup inside fetchOrders via ui.updatePaginationControls

    console.log("[OrderView] All event listeners setup.");
};


// --- Load Order View ---
export const loadOrdersView = async () => {
    console.log('[OrderView] ENTERED loadOrdersView');
    if (!contentArea) { console.error('[OrderView] Content area missing!'); return; }

    // 1. Set HTML structure
    console.log('[OrderView] Inserting HTML structure...');
    contentArea.innerHTML = `
        <h1>Órdenes</h1>
        <div class="view-controls">
            <!-- No store filter for orders based on original script -->
            <div class="page-size-selector">
                 <label for="page-size">Resultados:</label>
                 <select id="page-size" name="page-size">
                     <option value="20">20</option>
                     <option value="50">50</option>
                     <option value="100">100</option>
                 </select>
            </div>
         </div>
         <!-- No create button for orders based on original script -->
        <div class="table-container">
            <table class="data-table orders-table">
                 <thead>
                    <tr>
                        <th>Cliente</th>
                        <th>Tienda</th>
                        <th data-sort-key="total">Total <span class="sort-indicator"></span></th>
                        <th data-sort-key="created_at">Fecha Creación <span class="sort-indicator"></span></th>
                        <th class="actions">Acciones</th>
                    </tr>
                </thead>
                 <tbody id="orders-table-body">
                    <!-- Rows will be loaded here -->
                 </tbody>
             </table>
        </div>
        <div class="pagination-controls">
            <button id="prev-page-button" disabled>Anterior</button>
            <div id="page-numbers"></div>
            <button id="next-page-button" disabled>Siguiente</button>
        </div>
         <div id="page-info-container">
             <span id="page-info">Página ? de ?</span>
         </div>
    `;
    console.log('[OrderView] HTML structure inserted.');

    // 2. No extra data fetch needed before main fetch (like stores for filter)

    // 3. Setup event listeners
    console.log('[OrderView] Setting up event listeners...');
    setupOrderViewEventListeners();

    // 4. Fetch initial order data
    console.log('[OrderView] Triggering initial fetchOrders...');
    // Set default sort for orders if not already set
    if (!state.currentSortKey || !['total', 'created_at'].includes(state.currentSortKey)) {
         state.setSort('created_at', 'desc'); // Default sort for orders
    }
    await fetchOrders();

    // 5. Update sort indicators
    ui.updateSortIndicators();

    console.log('[OrderView] EXITING loadOrdersView');
};
