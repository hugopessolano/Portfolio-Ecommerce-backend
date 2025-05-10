import * as api from './api.js';
import * as state from './state.js';
import * as utils from './utils.js';
import * as ui from './uiComponents.js';
import * as config from './config.js';

const contentArea = document.querySelector('.content-area');

// --- Store Table Rendering ---

const renderStoreTable = (stores) => {
    console.log('[StoreView] Rendering table...');
    const tableBody = document.getElementById('stores-table-body');
    if (!tableBody) {
        console.error('[StoreView] Table body missing!');
        return;
    }
    tableBody.innerHTML = ''; // Clear previous content
    if (!stores || stores.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">No se encontraron tiendas.</td></tr>'; // Adjust colspan
        return;
    }

    console.log(`[StoreView] Rendering ${stores.length} items.`);
    stores.forEach(store => {
        const row = document.createElement('tr');
        row.dataset.storeId = store.id;
        row.innerHTML = `
            <td>${store.id || 'N/A'}</td>
            <td>${store.name || 'N/A'}</td>
            <td>${store.address || 'N/A'}</td>
            <td>${utils.formatDate(store.created_at)}</td>
            <td class="actions">
                <button class="action-icon-btn copy-id-btn" data-store-id="${store.id || ''}" title="Copiar ID de la Tienda">
                    ${config.svgIconClipboard}
                </button>
                <button class="action-icon-btn view-details-btn" data-store-id="${store.id || ''}" title="Ver Detalles de la Tienda">
                     ${config.svgIconViewDetails} <!-- Using a view details icon -->
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
};

// --- Store Data Fetching ---

const fetchStores = async () => {
    console.log(`[StoreView] Fetching. Page: ${state.currentPage}, Size: ${state.currentPageSize}, Sort: ${state.currentSortKey} ${state.currentSortDirection}`);
    const tableBody = document.getElementById('stores-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="5">Cargando tiendas...</td></tr>'; // Adjust colspan
    const pageNumbersContainer = document.getElementById('page-numbers'); // Use generic ID
    if (pageNumbersContainer) pageNumbersContainer.innerHTML = '';

    // Ensure sort key is valid for stores
    const validStoreSortKeys = ['name', 'address', 'created_at'];
    let fetchSortKey = state.currentSortKey;
    if (fetchSortKey && !validStoreSortKeys.includes(fetchSortKey)) {
        console.warn(`[StoreView] Invalid sort key '${fetchSortKey}' for stores. Resetting.`);
        state.setSort(null, 'asc'); // Reset state
        fetchSortKey = null; // Use null for the fetch call
        ui.updateSortIndicators(); // Update UI
    }

    const { error, response, data: storesData } = await api.getStores(state.currentPage, state.currentPageSize, fetchSortKey, state.currentSortDirection);

    if (error) {
        console.error(`[StoreView] Fetch error:`, error);
        utils.showContentError(`Error al cargar tiendas: ${error}`);
        renderStoreTable([]);
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchStores);
        return;
    }

    if (!response) {
        console.error(`[StoreView] Fetch succeeded but response object is missing.`);
        utils.showContentError(`Error interno al procesar respuesta del servidor.`);
        renderStoreTable(storesData || []);
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchStores);
        return;
    }

    console.log(`[StoreView] Fetched ${storesData?.length} stores.`);
    renderStoreTable(storesData || []);

    // --- Parse Headers and Update Pagination ---
    const nextPageHeader = response.headers.get('X-Next-Page');
    const lastPageHeader = response.headers.get('X-Last-Page');
    const nextPageNum = utils.getPageNumberFromUrl(nextPageHeader);
    const lastPageNum = utils.getPageNumberFromUrl(lastPageHeader);

    let finalLastPage = lastPageNum;
    if (finalLastPage === null && storesData && storesData.length < state.currentPageSize) {
        finalLastPage = state.currentPage;
    }

    ui.updatePaginationControls({ nextPageNum: nextPageNum, lastPageNum: finalLastPage }, fetchStores);
    // ---

    console.log(`[StoreView] Finished processing page ${state.currentPage}.`);
};

// --- Event Listener Setup ---
const setupStoreViewEventListeners = () => {
    if (!contentArea) return;

    // Use event delegation on the table body for copy/view details
    const tableBody = contentArea.querySelector('#stores-table-body');
    if (tableBody) {
        tableBody.replaceWith(tableBody.cloneNode(true)); // Remove old listeners
        const newTableBody = contentArea.querySelector('#stores-table-body');

        newTableBody.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('.action-icon-btn');
            if (!targetButton) return;
            event.preventDefault();

            const storeId = targetButton.dataset.storeId;
            if (!storeId) return;

            if (targetButton.classList.contains('copy-id-btn')) {
                try {
                    await navigator.clipboard.writeText(storeId);
                    console.log(`[StoreView] Copied store ID: ${storeId}`);
                    targetButton.disabled = true; targetButton.classList.add('copied-success');
                    setTimeout(() => { targetButton.disabled = false; targetButton.classList.remove('copied-success'); }, 1500);
                } catch (err) {
                    console.error('[StoreView] Failed to copy ID:', err); alert('No se pudo copiar el ID.');
                }
            } else if (targetButton.classList.contains('view-details-btn')) {
                console.log(`[StoreView] View details clicked for store ID: ${storeId}`);
                alert(`Funcionalidad "Ver Detalles" para Tienda ${storeId} no implementada.`);
                // TODO: Implement viewing store details (e.g., list products/customers in this store)
            }
        });
         console.log("[StoreView] Table body event listener setup.");
    } else {
        console.error("[StoreView] Store table body not found after loading view.");
    }

    // Setup shared UI components (pagination, sorting, page size)
    // Note: Store filter is not applicable to Stores view itself
    ui.setupSortableHeaders(fetchStores);
    ui.setupPageSizeSelector(fetchStores);
    // Pagination controls are setup inside fetchStores via ui.updatePaginationControls

    console.log("[StoreView] All event listeners setup.");
};


// --- Load Store View ---
export const loadStoresView = async () => {
    console.log('[StoreView] ENTERED loadStoresView');
    if (!contentArea) { console.error('[StoreView] Content area missing!'); return; }

    // 1. Set HTML structure
    console.log('[StoreView] Inserting HTML structure...');
    contentArea.innerHTML = `
        <h1>Tiendas</h1>
        <div class="view-controls">
            <!-- No store filter for stores view -->
            <div class="page-size-selector">
                 <label for="page-size">Resultados:</label>
                 <select id="page-size" name="page-size">
                     <option value="20">20</option>
                     <option value="50">50</option>
                     <option value="100">100</option>
                 </select>
            </div>
         </div>
         <!-- No create button for stores based on original script -->
        <div class="table-container">
            <table class="data-table stores-table">
                 <thead>
                    <tr>
                        <th>ID</th>
                        <th data-sort-key="name">Nombre <span class="sort-indicator"></span></th>
                        <th data-sort-key="address">Dirección <span class="sort-indicator"></span></th>
                        <th data-sort-key="created_at">Fecha Creación <span class="sort-indicator"></span></th>
                        <th class="actions">Acciones</th>
                    </tr>
                </thead>
                 <tbody id="stores-table-body">
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
    console.log('[StoreView] HTML structure inserted.');

    // 2. No extra data fetch needed

    // 3. Setup event listeners
    console.log('[StoreView] Setting up event listeners...');
    setupStoreViewEventListeners();

    // 4. Fetch initial store data
    console.log('[StoreView] Triggering initial fetchStores...');
    // Set default sort for stores if not already set
    if (!state.currentSortKey || !['name', 'address', 'created_at'].includes(state.currentSortKey)) {
         state.setSort('created_at', 'desc'); // Default sort for stores
    }
    await fetchStores();

    // 5. Update sort indicators
    ui.updateSortIndicators();

    console.log('[StoreView] EXITING loadStoresView');
};
