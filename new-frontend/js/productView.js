import * as api from './api.js';
import * as state from './state.js';
import * as utils from './utils.js';
import * as ui from './uiComponents.js';
import * as config from './config.js';

const contentArea = document.querySelector('.content-area');

// --- Product Table Rendering ---

// Function to render a product row in DISPLAY mode
const renderRowDisplayMode = (tableRowElement, productData) => {
    const store = state.availableStores.find(s => s.id === productData.store_id);
    const storeName = store ? store.name : (productData.store_id || 'N/A');
    const priceFormatted = productData.price !== undefined && productData.price !== null ? productData.price.toFixed(2) : 'N/A';
    const stockFormatted = productData.stock !== undefined && productData.stock !== null ? productData.stock : 'N/A';

    tableRowElement.innerHTML = `
        <td>${productData.name || 'N/A'}</td>
        <td class="price">${priceFormatted}</td>
        <td class="stock">${stockFormatted}</td>
        <td>${storeName}</td>
        <td>${utils.formatDate(productData.created_at)}</td>
        <td class="actions">
            <button class="action-icon-btn copy-id-btn" data-product-id="${productData.id || ''}" title="Copiar ID del Producto">
                ${config.svgIconClipboard}
            </button>
            <button class="action-icon-btn edit-btn" data-product-id="${productData.id || ''}" title="Editar Producto">
                 ${config.svgIconEdit}
            </button>
            <button class="action-icon-btn delete-btn" data-product-id="${productData.id || ''}" title="Eliminar Producto">
                 ${config.svgIconDelete}
            </button>
        </td>
    `;
    tableRowElement.classList.remove('editing', 'creating'); // Ensure both classes are removed
    // Reset editing state only if this row was the one being edited
    if (state.editingProductId === productData.id) {
        state.setEditingProductId(null);
        state.setOriginalRowData(null);
        utils.toggleActionButtonsDisabled(false, 'products'); // Re-enable buttons
    }
    console.log(`[ProductView] Row for ${productData.id} rendered in display mode.`);
};

// Function to render a product row in EDIT mode
const renderRowEditMode = (tableRowElement, productData) => {
    const storeOptions = state.availableStores.map(store =>
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
        <td></td> <!-- Created date cell empty -->
        <td class="actions">
            <button class="action-icon-btn save-btn" data-product-id="${productData.id || ''}" title="Guardar Cambios">
                ${config.svgIconSave}
             </button>
             <button class="action-icon-btn cancel-btn" data-product-id="${productData.id || ''}" title="Cancelar Edición">
                 ${config.svgIconCancel}
             </button>
        </td>
    `;
    tableRowElement.classList.add('editing');
    tableRowElement.classList.remove('creating');
    state.setEditingProductId(productData.id); // Track which row is being edited
    state.setOriginalRowData(productData); // Store original data for cancellation
    utils.toggleActionButtonsDisabled(true, 'products'); // Disable other actions
    console.log(`[ProductView] Row for ${productData.id} switched to edit mode.`);
    // Focus the first input field
    tableRowElement.querySelector('.edit-name')?.focus();
};

// Renders the whole product table body
const renderProductTable = (products) => {
    console.log('[ProductView] Rendering table...');
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) {
        console.error('[ProductView] Table body missing!');
        return;
    }
    tableBody.innerHTML = ''; // Clear previous content
    if (!products || products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No se encontraron productos.</td></tr>'; // Adjust colspan if needed
        return;
    }
    console.log(`[ProductView] Rendering ${products.length} items.`);
    products.forEach(product => {
        const row = document.createElement('tr');
        row.dataset.productId = product.id;
        row.dataset.storeId = product.store_id; // Store store_id for potential use
        renderRowDisplayMode(row, product); // Render initially in display mode
        tableBody.appendChild(row);
    });
};

// --- Product Data Fetching ---

// Central function to fetch products based on current state (filter, sort, page)
const fetchProducts = async () => {
    console.log(`[ProductView] Fetching. Page: ${state.currentPage}, Size: ${state.currentPageSize}, Mode: ${state.filterMode}, Store: ${state.selectedSingleStoreId}, Sort: ${state.currentSortKey} ${state.currentSortDirection}`);
    const tableBody = document.getElementById('products-table-body');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="6">Cargando productos...</td></tr>'; // Adjust colspan
    const pageNumbersContainer = document.getElementById('page-numbers');
    if (pageNumbersContainer) pageNumbersContainer.innerHTML = ''; // Clear numbers while loading

    let result;
    if (state.filterMode === 'all') {
        result = await api.getProducts(state.currentPage, state.currentPageSize, state.currentSortKey, state.currentSortDirection);
    } else if (state.filterMode === 'single' && state.selectedSingleStoreId) {
        result = await api.getProductsByStore(state.selectedSingleStoreId, state.currentPage, state.currentPageSize, state.currentSortKey, state.currentSortDirection);
    } else {
        console.warn("[ProductView] Single mode selected, but no store ID available. Showing empty table.");
        renderProductTable([]);
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchProducts); // Update controls for empty result
        return; // Don't proceed with fetch
    }

    const { error, response, data: productsData } = result;

    if (error) {
        console.error(`[ProductView] Fetch error:`, error);
        utils.showContentError(`Error al cargar productos: ${error}`);
        renderProductTable([]); // Show empty table on error
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchProducts); // Reset pagination
        return;
    }

    if (!response) {
        console.error(`[ProductView] Fetch succeeded but response object is missing.`);
        utils.showContentError(`Error interno al procesar respuesta del servidor.`);
        renderProductTable(productsData || []); // Render data if available
        ui.updatePaginationControls({ nextPageNum: null, lastPageNum: null }, fetchProducts);
        return;
    }

    console.log(`[ProductView] Fetch success. Products received: ${productsData?.length}`);
    renderProductTable(productsData || []);

    // --- Parse Headers and Update Pagination ---
    const nextPageHeader = response.headers.get('X-Next-Page');
    const lastPageHeader = response.headers.get('X-Last-Page');
    console.log(`[ProductView] Raw Headers - Next URL: ${nextPageHeader}, Last URL: ${lastPageHeader}`);

    const nextPageNum = utils.getPageNumberFromUrl(nextPageHeader);
    const lastPageNum = utils.getPageNumberFromUrl(lastPageHeader);
    console.log(`[ProductView] Parsed Page Numbers - Next: ${nextPageNum}, Last: ${lastPageNum}`);

    // Estimate last page if header is missing and we received fewer items than page size
    let finalLastPage = lastPageNum;
    if (finalLastPage === null && productsData && productsData.length < state.currentPageSize) {
        finalLastPage = state.currentPage;
        console.log(`[ProductView] Estimating last page as current page (${state.currentPage}) based on results count.`);
    }

    ui.updatePaginationControls({ nextPageNum: nextPageNum, lastPageNum: finalLastPage }, fetchProducts);
    // ---

    console.log(`[ProductView] Finished processing page ${state.currentPage}.`);
};


// --- Product Action Handlers ---

const handleEditProduct = (productId) => {
    console.log(`[ProductView] Edit action triggered for product ID: ${productId}`);
    if (state.isCreatingProduct) {
        alert("Guarda o cancela la creación del nuevo producto antes de editar otro.");
        return;
    }
    if (state.editingCustomerId || state.isCreatingCustomer) {
        alert("Termina o cancela la edición/creación de clientes antes de editar un producto.");
        return;
    }
    if (state.editingProductId && state.editingProductId !== productId) {
        if (!confirm("Ya estás editando otro producto. ¿Quieres cancelar esa edición y editar este?")) {
            return;
        }
        handleCancelEdit(state.editingProductId); // Cancel the other edit first
    }
    if (state.editingProductId === productId) {
        console.log(`[ProductView] Row ${productId} is already in edit mode.`);
        return;
    }

    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
    if (!row) {
        console.error(`[ProductView] Could not find the row for ID: ${productId}`);
        return;
    }

    // --- Store original data ---
    // Ideally, fetch the full product data again to ensure accuracy before editing
    // Simple approach: read from current cells (might be inaccurate if display is simplified)
    try {
        const name = row.cells[0].textContent;
        const priceText = row.cells[1].textContent;
        const stockText = row.cells[2].textContent;
        const store_id = row.dataset.storeId || null; // Read from data attribute
        const created_at = Array.from(row.cells).find(cell => cell.textContent.includes('-') && cell.textContent.includes(':'))?.textContent || null; // Hacky way to find date

        const originalData = {
            id: productId,
            name: name,
            price: parseFloat(priceText) || 0,
            stock: parseInt(stockText, 10) || 0,
            store_id: store_id,
            created_at: created_at // Include if needed for re-rendering display mode
            // Add other fields if necessary
        };
        console.log("[ProductView] Stored original data for edit:", originalData);

        // Switch row to edit mode
        renderRowEditMode(row, originalData);

    } catch (e) {
        console.error("[ProductView] Error reading original data from row:", e);
        alert("Error al intentar iniciar la edición.");
        // Reset state if error occurs
        state.setEditingProductId(null);
        state.setOriginalRowData(null);
        utils.toggleActionButtonsDisabled(false, 'products');
    }
};

const handleCancelEdit = (productId) => {
    console.log(`[ProductView] Cancelling edit for product ID: ${productId}`);
    const row = document.querySelector(`tr.editing[data-product-id="${productId}"]`);
    if (row && state.originalRowData && state.editingProductId === productId) {
        renderRowDisplayMode(row, state.originalRowData); // Restore original data visually
    } else {
        console.warn("[ProductView] Could not find row, original data, or ID mismatch. Forcing table refresh.");
        fetchProducts(); // Force refresh as fallback
    }
    // Reset state regardless of whether the row was found/restored
    state.setEditingProductId(null);
    state.setOriginalRowData(null);
    utils.toggleActionButtonsDisabled(false, 'products'); // Re-enable buttons
};

const handleSaveProduct = async (productId) => {
    console.log(`[ProductView] Attempting to save product ID: ${productId}`);
    const row = document.querySelector(`tr.editing[data-product-id="${productId}"]`);
    if (!row) {
        console.error(`[ProductView] Could not find the editing row for ID: ${productId}`);
        return;
    }

    // --- Get values from inputs ---
    const nameInput = row.querySelector('.edit-name');
    const priceInput = row.querySelector('.edit-price');
    const stockInput = row.querySelector('.edit-stock');
    const storeSelect = row.querySelector('.edit-store');

    if (!nameInput || !priceInput || !stockInput || !storeSelect) {
        console.error("[ProductView] Input elements not found in the row.");
        alert("Error: No se pudieron encontrar los campos de edición.");
        return;
    }

    const updatedData = {
        name: nameInput.value.trim(),
        price: parseFloat(priceInput.value),
        stock: parseInt(stockInput.value, 10),
        store_id: storeSelect.value || null
    };

    // --- Validation ---
    if (!updatedData.name) { alert("El nombre del producto no puede estar vacío."); nameInput.focus(); return; }
    if (isNaN(updatedData.price) || updatedData.price < 0) { alert("El precio debe ser un número positivo."); priceInput.focus(); return; }
    if (isNaN(updatedData.stock) || !Number.isInteger(updatedData.stock) || updatedData.stock < 0) { alert("El stock debe ser un número entero positivo."); stockInput.focus(); return; }
    if (!updatedData.store_id) { alert("Debe seleccionar una tienda válida."); storeSelect.focus(); return; }

    console.log("[ProductView] Validation passed. Updated data:", updatedData);

    // --- API Call ---
    const { error, data: savedProduct } = await api.updateProduct(productId, updatedData);

    if (error) {
        console.error(`[ProductView] Failed to save product ${productId}:`, error);
        alert(`Error al guardar: ${error}`);
        // Keep row in edit mode for correction
    } else {
        console.log(`[ProductView] Product ${productId} saved successfully. Response data:`, savedProduct);
        // Use the returned data (if available and complete) or merge original with updated data
        const displayData = { ...state.originalRowData, ...(savedProduct || updatedData), id: productId };
        renderRowDisplayMode(row, displayData); // Updates row and resets editing state via renderRowDisplayMode
        // Note: toggleActionButtonsDisabled(false) is called inside renderRowDisplayMode when state.editingProductId matches
    }
};

const handleDeleteProduct = async (productId) => {
    if (state.editingProductId === productId) {
        alert("No puedes eliminar un producto mientras lo estás editando. Cancela la edición primero.");
        return;
    }
    if (state.editingProductId || state.isCreatingProduct || state.editingCustomerId || state.isCreatingCustomer) {
         if (!confirm("Hay otra operación de edición o creación en curso. ¿Quieres cancelarla y eliminar este producto?")) {
             return;
         }
         // Cancel any ongoing operation before deleting
         if(state.editingProductId) handleCancelEdit(state.editingProductId);
         if(state.isCreatingProduct) handleCancelCreateProduct();
         // Need access to customer cancel functions if they exist
         // if(state.editingCustomerId) handleCancelEditCustomer(state.editingCustomerId);
         // if(state.isCreatingCustomer) handleCancelCreateCustomer();
         console.warn("Attempting delete while other operations might be active in other views.");
    }

    if (!productId) { console.error('[ProductView] No product ID provided for delete.'); return; }
    console.log(`[ProductView] Attempting to delete product ID: ${productId}`);

    if (!confirm(`¿Estás seguro de que quieres eliminar el producto con ID ${productId}? Esta acción no se puede deshacer.`)) {
        console.log('[ProductView] Deletion cancelled by user.');
        return;
    }

    const { error } = await api.deleteProduct(productId);

    if (error) {
        console.error(`[ProductView] Failed to delete product ${productId}:`, error);
        alert(`Error al eliminar el producto ${productId}: ${error}`);
    } else {
        console.log(`[ProductView] Product ${productId} deleted successfully.`);
        // Remove row immediately or just refresh the table
        // Refreshing ensures pagination and data consistency
        alert("Producto eliminado correctamente."); // Give user feedback
        await fetchProducts(); // Refresh the table
    }
};

const showCreateProductRow = () => {
    console.log("[ProductView] Attempting to show create row.");
    if (state.editingProductId || state.editingCustomerId || state.isCreatingCustomer) {
        alert("Termina o cancela cualquier edición actual antes de crear un nuevo producto.");
        return;
    }
    if (state.isCreatingProduct) {
        console.log("[ProductView] Already creating a product.");
        document.querySelector('tr.creating .edit-name')?.focus();
        return;
    }

    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) { console.error("[ProductView] Table body not found!"); return; }

    state.setIsCreatingProduct(true);
    utils.toggleActionButtonsDisabled(true, 'products'); // Disable other actions

    const createRow = document.createElement('tr');
    createRow.classList.add('creating'); // Use 'creating' class

    const storeOptions = state.availableStores.map(store =>
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
        <td></td> <!-- Created date empty -->
        <td class="actions">
            <button class="action-icon-btn save-new-btn" title="Guardar Nuevo Producto">
                ${config.svgIconSave}
             </button>
             <button class="action-icon-btn cancel-create-btn" title="Cancelar Creación">
                 ${config.svgIconCancel}
             </button>
        </td>
    `;

    tableBody.insertBefore(createRow, tableBody.firstChild);
    console.log("[ProductView] Create row added to table.");
    createRow.querySelector('.edit-name')?.focus();
};

const handleCancelCreateProduct = () => {
    console.log("[ProductView] Cancelling product creation.");
    const createRow = document.querySelector('tr.creating');
    if (createRow) {
        createRow.remove();
    }
    state.setIsCreatingProduct(false);
    utils.toggleActionButtonsDisabled(false, 'products'); // Re-enable other actions
};

const handleSaveNewProduct = async () => {
    console.log("[ProductView] Attempting to save new product.");
    const createRow = document.querySelector('tr.creating');
    if (!createRow) { console.error("[ProductView] Create row not found!"); return; }

    const nameInput = createRow.querySelector('.edit-name');
    const priceInput = createRow.querySelector('.edit-price');
    const stockInput = createRow.querySelector('.edit-stock');
    const storeSelect = createRow.querySelector('.edit-store');

    if (!nameInput || !priceInput || !stockInput || !storeSelect) {
        console.error("[ProductView] Input elements not found in the create row.");
        alert("Error: No se pudieron encontrar los campos de creación.");
        return;
    }

    const newData = {
        name: nameInput.value.trim(),
        price: parseFloat(priceInput.value),
        stock: parseInt(stockInput.value, 10),
        store_id: storeSelect.value || null
    };

    // --- Validation ---
    if (!newData.name) { alert("El nombre del producto no puede estar vacío."); nameInput.focus(); return; }
    if (isNaN(newData.price) || newData.price < 0) { alert("El precio debe ser un número positivo."); priceInput.focus(); return; }
    if (isNaN(newData.stock) || !Number.isInteger(newData.stock) || newData.stock < 0) { alert("El stock debe ser un número entero positivo."); stockInput.focus(); return; }
    if (!newData.store_id) { alert("Debe seleccionar una tienda válida."); storeSelect.focus(); return; }

    console.log("[ProductView] Validation passed. New data:", newData);

    // --- API Call (POST request) ---
    const { error, data: createdProduct } = await api.createProduct(newData);

    if (error) {
        console.error(`[ProductView] Failed to create product:`, error);
        alert(`Error al crear el producto: ${error}`);
        // Keep create row open for correction
    } else {
        console.log(`[ProductView] Product created successfully. Response data:`, createdProduct);
        handleCancelCreateProduct(); // Remove the create row
        alert("Producto creado correctamente.");
        await fetchProducts(); // Refresh the table to show the new product (likely on page 1)
    }
};

// --- Event Listener Setup ---
const setupProductViewEventListeners = () => {
    if (!contentArea) return; // Should not happen if view loaded

    // Use event delegation on the table body
    const tableBody = contentArea.querySelector('#products-table-body');
    if (tableBody) {
        // Remove previous listener if any (simple way)
        tableBody.replaceWith(tableBody.cloneNode(true));
        const newTableBody = contentArea.querySelector('#products-table-body');

        newTableBody.addEventListener('click', async (event) => {
            const targetButton = event.target.closest('.action-icon-btn');
            if (!targetButton) return; // Exit if click wasn't on or inside an action button

            event.preventDefault(); // Prevent default button actions

            // --- Interaction Guards ---
            const activeEditRow = document.querySelector('tr.editing[data-product-id]');
            const activeCreateRow = document.querySelector('tr.creating'); // Generic check, could be product/customer etc.

            // If editing/creating a product, only allow save/cancel on that specific row
            if (state.editingProductId || state.isCreatingProduct) {
                const currentActiveRow = activeEditRow || activeCreateRow;
                if (currentActiveRow && !currentActiveRow.contains(targetButton)) {
                    const message = state.isCreatingProduct ? "Guarda o cancela la creación del nuevo producto antes de interactuar con otras filas." : "Termina o cancela la edición actual antes de interactuar con otras filas.";
                    alert(message);
                    console.log("[ProductView Table Click] Click outside active product (edit/create) row ignored.");
                    return;
                }
                // Allow only save/cancel within the active product row
                if (state.isCreatingProduct && !(targetButton.classList.contains('save-new-btn') || targetButton.classList.contains('cancel-create-btn'))) return;
                if (state.editingProductId && !(targetButton.classList.contains('save-btn') || targetButton.classList.contains('cancel-btn'))) return;
            }
            // --- End Guards ---


            const productId = targetButton.dataset.productId; // Will be undefined for create row buttons

            // --- Button Actions ---
            if (targetButton.classList.contains('copy-id-btn') && productId) {
                try {
                    await navigator.clipboard.writeText(productId);
                    console.log(`[ProductView] Copied product ID: ${productId}`);
                    targetButton.disabled = true; targetButton.classList.add('copied-success'); // Visual feedback
                    setTimeout(() => { targetButton.disabled = false; targetButton.classList.remove('copied-success'); }, 1500);
                } catch (err) {
                    console.error('[ProductView] Failed to copy ID:', err); alert('No se pudo copiar el ID.');
                }
            } else if (targetButton.classList.contains('edit-btn') && productId) {
                handleEditProduct(productId);
            } else if (targetButton.classList.contains('delete-btn') && productId) {
                await handleDeleteProduct(productId);
            } else if (targetButton.classList.contains('save-btn') && productId) {
                await handleSaveProduct(productId);
            } else if (targetButton.classList.contains('cancel-btn') && productId) {
                handleCancelEdit(productId);
            } else if (targetButton.classList.contains('save-new-btn')) { // Handle Save New
                await handleSaveNewProduct();
            } else if (targetButton.classList.contains('cancel-create-btn')) { // Handle Cancel Create
                handleCancelCreateProduct();
            }
        });
        console.log("[ProductView] Table body event listener setup.");
    } else {
        console.error("[ProductView] Product table body not found after loading view.");
    }

    // Listener for the "Create Product" button
    const createProductButton = contentArea.querySelector('#create-product-button');
    if (createProductButton) {
        // Use replaceWith to avoid duplicate listeners
        createProductButton.replaceWith(createProductButton.cloneNode(true));
        contentArea.querySelector('#create-product-button').addEventListener('click', () => {
            console.log("[ProductView Create Button] Clicked.");
            showCreateProductRow();
        });
        console.log("[ProductView] Create Product button listener setup.");
    } else {
         console.error("[ProductView] Create Product button not found after loading view.");
    }

    // Setup shared UI components (pagination, filters, sorting, page size)
    ui.setupStoreFilterControls(fetchProducts); // Pass fetchProducts as the callback
    ui.setupSortableHeaders(fetchProducts);
    ui.setupPageSizeSelector(fetchProducts);
    // Pagination controls are setup inside fetchProducts via ui.updatePaginationControls

    console.log("[ProductView] All event listeners setup.");
};


// --- Load Product View ---
// This is the main function exported by this module
export const loadProductsView = async () => {
    console.log('[ProductView] ENTERED loadProductsView');
    if (!contentArea) {
        console.error('[ProductView] Content area missing!');
        return; // Cannot proceed
    }

    // 1. Set the HTML structure for the view
    console.log('[ProductView] Inserting HTML structure...');
    contentArea.innerHTML = `
        <h1>Productos</h1>
        <div class="view-controls">
            <div class="filter-bar store-filter-section">
                 <h3>Filtrar:</h3>
                 <div class="filter-option">
                     <input type="checkbox" id="all-stores-checkbox" name="filter-mode">
                     <label for="all-stores-checkbox">Todas las tiendas</label>
                 </div>
                 <div class="filter-option" id="single-store-selector-container" style="display: none;"> <!-- Initially hidden -->
                     <label for="single-store-select">Tienda específica:</label>
                     <select id="single-store-select" name="single-store-select">
                         <option value="">Cargando...</option>
                     </select>
                 </div>
            </div>
            <div class="page-size-selector">
                 <label for="page-size">Resultados:</label>
                 <select id="page-size" name="page-size">
                     <option value="20">20</option>
                     <option value="50">50</option>
                     <option value="100">100</option>
                 </select>
            </div>
         </div>
         <button id="create-product-button" class="action-button create-button">Crear Producto</button> <!-- Use consistent classes -->
        <div class="table-container">
            <table class="data-table products-table">
                 <thead>
                    <tr>
                        <th data-sort-key="name">Nombre <span class="sort-indicator"></span></th>
                        <th class="price" data-sort-key="price">Precio <span class="sort-indicator"></span></th>
                        <th class="stock" data-sort-key="stock">Stock <span class="sort-indicator"></span></th>
                        <th>Tienda</th> <!-- Store name isn't directly sortable via API in this model -->
                        <th data-sort-key="created_at">Fecha Creación <span class="sort-indicator"></span></th>
                        <th class="actions">Acciones</th>
                    </tr>
                </thead>
                 <tbody id="products-table-body">
                    <!-- Rows will be loaded here -->
                 </tbody>
             </table>
        </div>
        <div class="pagination-controls">
            <button id="prev-page-button" disabled>Anterior</button>
            <div id="page-numbers"></div> <!-- Container for number buttons -->
            <button id="next-page-button" disabled>Siguiente</button>
        </div>
         <div id="page-info-container">
             <span id="page-info">Página ? de ?</span> <!-- Placeholder -->
         </div>
    `;
    console.log('[ProductView] HTML structure inserted.');

    // 2. Fetch necessary data (stores for the filter)
    console.log('[ProductView] Fetching stores for filter...');
    const storesLoaded = await api.fetchAllStores(); // Ensure stores are loaded into state
    if (!storesLoaded) {
        utils.showContentError("Error al cargar la lista de tiendas. El filtrado puede no funcionar.");
        // Continue loading products anyway, but filtering might be broken
    } else {
        console.log('[ProductView] Stores loaded successfully.');
    }

    // 3. Setup event listeners for controls specific to this view
    console.log('[ProductView] Setting up event listeners...');
    setupProductViewEventListeners(); // Sets up table, create button, filters, sorting, etc.

    // 4. Fetch initial data for the table
    console.log('[ProductView] Triggering initial fetchProducts...');
    await fetchProducts(); // Fetches data based on default state (page 1, all stores, etc.)

    // 5. Update sort indicators based on default/current sort state
    ui.updateSortIndicators();

    console.log('[ProductView] EXITING loadProductsView');
};
