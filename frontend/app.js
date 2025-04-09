const apiUrl = 'http://127.0.0.1:8000'; // API base URL
const contentArea = document.getElementById('content-area');
const mainNav = document.getElementById('main-nav');
const logoutButton = document.getElementById('logout-button');

// --- Referencias a los Modales de Edición ---
let editProductModal, editProductForm, editProductIdInput, editProductNameInput, editProductPriceInput, editProductStockInput, editProductStoreIdInput, closeEditProductModalButton, cancelEditProductButton, saveEditProductButton, editProductError;
let editRoleModal, editRoleForm, editRoleIdInput, editRoleNameInput, closeEditRoleModalButton, cancelEditRoleButton, saveEditRoleButton, editRoleError;
let editUserModal, editUserForm, editUserIdInput, editUserNameInput, editUserEmailInput, editUserCrossStoreCheckbox, editUserStoresCheckboxesContainer, editUserRolesCheckboxesContainer, closeEditUserModalButton, cancelEditUserButton, saveEditUserButton, saveUserStoresButton, saveUserRolesButton, editUserError;
let editStoreModal, editStoreForm, editStoreIdInput, editStoreNameInput, editStoreAddressInput, closeEditStoreModalButton, cancelEditStoreButton, saveEditStoreButton, editStoreError;
let editCustomerModal, editCustomerForm, editCustomerIdInput, editCustomerNameInput, editCustomerEmailInput, editCustomerPhoneInput, closeEditCustomerModalButton, cancelEditCustomerButton, saveEditCustomerButton, editCustomerError;


// --- Funciones de Inicialización de Modales ---
function initializeEditProductModalRefs() {
    editProductModal = document.getElementById('edit-product-modal');
    editProductForm = document.getElementById('edit-product-form');
    editProductIdInput = document.getElementById('edit-product-id');
    editProductNameInput = document.getElementById('edit-product-name');
    editProductPriceInput = document.getElementById('edit-product-price');
    editProductStockInput = document.getElementById('edit-product-stock');
    editProductStoreIdInput = document.getElementById('edit-product-store-id');
    closeEditProductModalButton = document.getElementById('close-edit-modal');
    cancelEditProductButton = document.getElementById('cancel-edit-button');
    saveEditProductButton = document.getElementById('save-edit-button');
    editProductError = document.getElementById('edit-product-error');
}
function initializeEditRoleModalRefs() {
    editRoleModal = document.getElementById('edit-role-modal');
    editRoleForm = document.getElementById('edit-role-form');
    editRoleIdInput = document.getElementById('edit-role-id');
    editRoleNameInput = document.getElementById('edit-role-name');
    closeEditRoleModalButton = document.getElementById('close-edit-role-modal');
    cancelEditRoleButton = document.getElementById('cancel-edit-role-button');
    saveEditRoleButton = document.getElementById('save-edit-role-button');
    editRoleError = document.getElementById('edit-role-error');
}
function initializeEditUserModalRefs() {
    editUserModal = document.getElementById('edit-user-modal');
    editUserForm = document.getElementById('edit-user-form');
    editUserIdInput = document.getElementById('edit-user-id');
    editUserNameInput = document.getElementById('edit-user-name');
    editUserEmailInput = document.getElementById('edit-user-email');
    editUserCrossStoreCheckbox = document.getElementById('edit-user-cross-store');
    editUserStoresCheckboxesContainer = document.getElementById('edit-user-stores-checkboxes');
    editUserRolesCheckboxesContainer = document.getElementById('edit-user-roles-checkboxes');
    closeEditUserModalButton = document.getElementById('close-edit-user-modal');
    cancelEditUserButton = document.getElementById('cancel-edit-user-button');
    saveEditUserButton = document.getElementById('save-edit-user-button');
    saveUserStoresButton = document.getElementById('save-user-stores-button');
    saveUserRolesButton = document.getElementById('save-user-roles-button');
    editUserError = document.getElementById('edit-user-error');
}
function initializeEditStoreModalRefs() {
    editStoreModal = document.getElementById('edit-store-modal');
    editStoreForm = document.getElementById('edit-store-form');
    editStoreIdInput = document.getElementById('edit-store-id');
    editStoreNameInput = document.getElementById('edit-store-name');
    editStoreAddressInput = document.getElementById('edit-store-address');
    closeEditStoreModalButton = document.getElementById('close-edit-store-modal');
    cancelEditStoreButton = document.getElementById('cancel-edit-store-button');
    saveEditStoreButton = document.getElementById('save-edit-store-button');
    editStoreError = document.getElementById('edit-store-error');
}
function initializeEditCustomerModalRefs() {
    editCustomerModal = document.getElementById('edit-customer-modal');
    editCustomerForm = document.getElementById('edit-customer-form');
    editCustomerIdInput = document.getElementById('edit-customer-id');
    editCustomerNameInput = document.getElementById('edit-customer-name');
    editCustomerEmailInput = document.getElementById('edit-customer-email');
    editCustomerPhoneInput = document.getElementById('edit-customer-phone');
    closeEditCustomerModalButton = document.getElementById('close-edit-customer-modal');
    cancelEditCustomerButton = document.getElementById('cancel-edit-customer-button');
    saveEditCustomerButton = document.getElementById('save-edit-customer-button');
    editCustomerError = document.getElementById('edit-customer-error');
}


// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'login.html'; return; }
    loadSection('products');
    const initialLink = mainNav.querySelector('a[data-section="products"]');
    if (initialLink) {
        mainNav.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        initialLink.classList.add('active');
    }
});
mainNav.addEventListener('click', (event) => {
    const link = event.target.closest('a.nav-link');
    if (link && link.dataset.section) {
        event.preventDefault();
        const section = link.dataset.section;
        mainNav.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        link.classList.add('active');
        loadSection(section);
    }
});
logoutButton.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    window.location.href = 'login.html';
});

async function loadSection(section) {
    contentArea.innerHTML = `<div class="loading-indicator">Cargando ${section}...</div>`;
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'login.html'; return; }
    try {
        switch (section) {
            case 'products': await loadProducts(token); break;
            case 'roles': await loadRoles(token); break;
            case 'users': await loadUsers(token); break;
            case 'customers': await loadCustomers(token); break; // Corregido: Llamar a loadCustomers
            case 'stores': await loadStores(token); break;
            case 'orders': contentArea.innerHTML = '<h2>Pedidos</h2><p>Contenido de Pedidos (pendiente).</p>'; break;
            default: contentArea.innerHTML = '<h2>Sección no encontrada</h2>';
        }
    } catch (error) {
        console.error(`Error cargando la sección ${section}:`, error);
        contentArea.innerHTML = `<p class="error">Error al cargar ${section}: ${error.message}</p>`;
        if (error.message.includes('401')) {
             localStorage.removeItem('access_token');
             window.location.href = 'login.html';
        }
    }
}

// --- Variables globales para paginación y ordenación (Productos) ---
let currentProductPage = 1;
const productsPageSize = 20;
let currentSort = { key: null, ascending: true };

// --- Funciones para la sección de Productos ---
async function loadProducts(token) {
    currentProductPage = 1;
    currentSort = { key: null, ascending: true };
    try {
        const initialHtml = `
            <h2>Productos</h2>
            <button id="show-add-product-form-btn">Añadir Nuevo Producto</button>
            <div id="add-product-form-container" style="display: none; margin-top: 15px;">
                <h3>Añadir Producto</h3>
                <form id="add-product-form">
                    <div class="form-group"><label for="product-name">Nombre:</label><input type="text" id="product-name" name="name" required></div>
                    <div class="form-group"><label for="product-price">Precio:</label><input type="number" step="0.01" id="product-price" name="price" required></div>
                    <div class="form-group"><label for="product-stock">Stock:</label><input type="number" id="product-stock" name="stock" required></div>
                    <div class="form-group"><label for="product-store-id">ID Tienda:</label><input type="text" id="product-store-id" name="store_id" required></div>
                    <button type="submit">Guardar Producto</button><p id="add-product-error" class="error"></p>
                </form>
            </div>
            <table id="products-table" class="sortable-table">
                <thead><tr>
                    <th class="sortable-header" data-sort-key="id" data-sort-type="string">ID <span class="sort-indicator"></span></th>
                    <th class="sortable-header" data-sort-key="name" data-sort-type="string">Nombre <span class="sort-indicator"></span></th>
                    <th class="sortable-header" data-sort-key="price" data-sort-type="number">Precio <span class="sort-indicator"></span></th>
                    <th class="sortable-header" data-sort-key="stock" data-sort-type="number">Stock <span class="sort-indicator"></span></th>
                    <th class="sortable-header" data-sort-key="store_id" data-sort-type="string">ID Tienda <span class="sort-indicator"></span></th>
                    <th class="sortable-header" data-sort-key="created_at" data-sort-type="date">Creado <span class="sort-indicator"></span></th>
                    <th class="sortable-header" data-sort-key="updated_at" data-sort-type="date">Actualizado <span class="sort-indicator"></span></th>
                    <th>Acciones</th>
                </tr></thead>
                <tbody id="products-table-body"></tbody>
            </table>
            <div id="load-more-products-container" style="text-align: center; margin-top: 20px;"><button id="load-more-products-btn">Cargar más productos</button></div>`;
        contentArea.innerHTML = initialHtml;
        initializeEditProductModalRefs(); // Inicializar refs ANTES de usarlas
        await fetchAndAppendProducts(currentProductPage, token); // Llamada ÚNICA
        setupProductEventListeners(token);
    } catch (error) {
        console.error('Error inicial al cargar productos:', error);
        contentArea.innerHTML = `<p class="error">Error al cargar productos: ${error.message}</p>`;
    }
}
async function fetchAndAppendProducts(page, token) {
    const tableBody = document.getElementById('products-table-body');
    const loadMoreContainer = document.getElementById('load-more-products-container');
    const loadMoreBtn = document.getElementById('load-more-products-btn');

    if (page === 1) { // Clear table only on initial load
        tableBody.innerHTML = '<tr><td colspan="8" class="loading-indicator">Cargando productos...</td></tr>';
    } else {
        loadMoreBtn.textContent = 'Cargando...';
        loadMoreBtn.disabled = true;
    }

    try {
        // Construct query parameters for pagination and sorting
        let queryParams = `?page=${page}&page_size=${productsPageSize}`;
        if (currentSort.key) {
            queryParams += `&sort_by=${currentSort.key}&sort_order=${currentSort.ascending ? 'asc' : 'desc'}`;
            // Note: Backend needs to support sorting for this to work. Assuming it does based on router structure.
        }

        const products = await fetchApi(`/products${queryParams}`, {}, token);

        if (page === 1) {
            tableBody.innerHTML = ''; // Clear loading indicator
        }

        if (products.length === 0 && page === 1) {
            tableBody.innerHTML = '<tr><td colspan="8">No se encontraron productos.</td></tr>';
            loadMoreContainer.style.display = 'none';
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');
            row.setAttribute('data-product-id', product.id);
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.price.toFixed(2)}</td>
                <td>${product.stock}</td>
                <td>${product.store_id}</td>
                <td>${formatDateTime(product.created_at)}</td>
                <td>${formatDateTime(product.updated_at)}</td>
                <td>
                    <button class="edit-product-btn" data-id="${product.id}">Editar</button>
                    <button class="delete-product-btn" data-id="${product.id}">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Show/hide "Load More" button
        if (products.length < productsPageSize) {
            loadMoreContainer.style.display = 'none'; // No more products
        } else {
            loadMoreContainer.style.display = 'block';
            loadMoreBtn.textContent = 'Cargar más productos';
            loadMoreBtn.disabled = false;
        }

    } catch (error) {
        console.error('Error fetching products:', error);
        if (page === 1) {
            tableBody.innerHTML = `<tr><td colspan="8" class="error">Error al cargar productos: ${error.message}</td></tr>`;
        } else {
             // Show error near button?
             loadMoreBtn.textContent = 'Error al cargar';
             loadMoreBtn.disabled = true; // Keep disabled on error
        }
        loadMoreContainer.style.display = 'none'; // Hide on error
    } finally {
         if (page > 1) {
             loadMoreBtn.disabled = false; // Re-enable unless error occurred
             if(loadMoreBtn.textContent === 'Cargando...') loadMoreBtn.textContent = 'Cargar más productos'; // Reset text if still loading
         }
    }
}

function setupProductEventListeners(token) {
    const showAddFormBtn = document.getElementById('show-add-product-form-btn');
    const addFormContainer = document.getElementById('add-product-form-container');
    const addForm = document.getElementById('add-product-form');
    const addProductError = document.getElementById('add-product-error');
    const tableBody = document.getElementById('products-table-body');
    const loadMoreBtn = document.getElementById('load-more-products-btn');
    const productsTable = document.getElementById('products-table'); // For sorting

    // Toggle Add Product Form
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener('click', async () => {
            const isVisible = addFormContainer.style.display === 'block';
            addFormContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                const token = localStorage.getItem('access_token');
                console.log('Intentando cargar permisos para crear rol...');
                if (token) {
                    try {
                        await populatePermissionsCheckboxes('add-role-permissions-container', token);
                        console.log('Permisos cargados correctamente en crear rol');
                    } catch (error) {
                        console.error('Error al cargar permisos en crear rol:', error);
                    }
                } else {
                    console.warn('No hay token disponible para cargar permisos');
                }
            }
        });
    }

    // Handle Add Product Form Submission
    if (addForm) {
        addForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            addProductError.textContent = '';
            const formData = new FormData(addForm);
            const productData = Object.fromEntries(formData.entries());
            // Convert numeric fields
            productData.price = parseFloat(productData.price);
            productData.stock = parseInt(productData.stock, 10);

            try {
                const newProduct = await fetchApi('/products', {
                    method: 'POST',
                    body: JSON.stringify(productData)
                }, token);
                // Optionally add the new product to the top of the table or reload
                addForm.reset();
                addFormContainer.style.display = 'none';
                await loadProducts(token); // Reload the list to show the new product
            } catch (error) {
                console.error('Error adding product:', error);
                addProductError.textContent = `Error: ${error.message}`;
            }
        });
    }

    // Handle Edit and Delete Buttons (Event Delegation)
    if (tableBody) {
        tableBody.addEventListener('click', async (event) => {
            const target = event.target;

            // Delete Button
            if (target.classList.contains('delete-product-btn')) {
                const productId = target.dataset.id;
                if (confirm(`¿Está seguro de que desea eliminar el producto ${productId}?`)) {
                    try {
                        await fetchApi(`/products/${productId}`, { method: 'DELETE' }, token);
                        const rowToRemove = target.closest('tr');
                        if (rowToRemove) rowToRemove.remove();
                    } catch (error) {
                        console.error('Error deleting product:', error);
                        alert(`Error al eliminar: ${error.message}`);
                    }
                }
            }

            // Edit Button
            if (target.classList.contains('edit-product-btn')) {
                const productId = target.dataset.id;
                editProductError.textContent = ''; // Clear previous errors
                try {
                    const product = await fetchApi(`/products/${productId}`, {}, token);
                    // Populate modal
                    editProductIdInput.value = product.id;
                    editProductNameInput.value = product.name;
                    editProductPriceInput.value = product.price;
                    editProductStockInput.value = product.stock;
                    editProductStoreIdInput.value = product.store_id;
                    // Show modal
                    editProductModal.style.display = 'block';
                } catch (error) {
                    console.error('Error fetching product for edit:', error);
                    alert(`Error al cargar datos para editar: ${error.message}`);
                }
            }
        });
    }

    // Handle Edit Modal Buttons
    if (closeEditProductModalButton) {
        closeEditProductModalButton.addEventListener('click', () => editProductModal.style.display = 'none');
    }
    if (cancelEditProductButton) {
        cancelEditProductButton.addEventListener('click', () => editProductModal.style.display = 'none');
    }
    if (saveEditProductButton && editProductForm) { // Check form exists too
        saveEditProductButton.addEventListener('click', async () => { // Changed from form submit to button click
            editProductError.textContent = '';
            const productId = editProductIdInput.value;
            const formData = new FormData(editProductForm);
            const productData = { // Construct only updatable fields from ProductUpdate schema
                name: formData.get('name'),
                price: parseFloat(formData.get('price')),
                stock: parseInt(formData.get('stock'), 10),
                store_id: formData.get('store_id') // Assuming store_id can be updated
            };

            // Remove null/undefined values if necessary, backend handles None
            Object.keys(productData).forEach(key => productData[key] === undefined && delete productData[key]);


            try {
                const updatedProduct = await fetchApi(`/products/${productId}`, {
                    method: 'PUT',
                    body: JSON.stringify(productData)
                }, token);
                updateProductRow(updatedProduct);
                editProductModal.style.display = 'none';
            } catch (error) {
                console.error('Error updating product:', error);
                editProductError.textContent = `Error: ${error.message}`;
            }
        });
    }

    // Handle Load More Button
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            currentProductPage++;
            await fetchAndAppendProducts(currentProductPage, token);
        });
    }

    // Handle Sorting (Basic setup, assumes sortTableByColumn exists)
    if (productsTable) {
        productsTable.querySelectorAll('.sortable-header').forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sortKey;
                const sortType = header.dataset.sortType || 'string'; // Default to string sort

                if (currentSort.key === sortKey) {
                    currentSort.ascending = !currentSort.ascending;
                } else {
                    currentSort.key = sortKey;
                    currentSort.ascending = true;
                }

                // Update visual indicators (remove from others, add to current)
                productsTable.querySelectorAll('.sort-indicator').forEach(span => span.textContent = '');
                const indicator = header.querySelector('.sort-indicator');
                if (indicator) {
                    indicator.textContent = currentSort.ascending ? ' ▲' : ' ▼';
                }

                // Reload products with new sorting
                // Note: Backend MUST support sort_by and sort_order query params
                loadProducts(token); // Reload from page 1 with new sort order
            });
        });
    }
}

function updateProductRow(updatedProduct) {
    const row = document.querySelector(`tr[data-product-id="${updatedProduct.id}"]`);
    if (row) {
        row.innerHTML = `
            <td>${updatedProduct.id}</td>
            <td>${updatedProduct.name}</td>
            <td>${updatedProduct.price.toFixed(2)}</td>
            <td>${updatedProduct.stock}</td>
            <td>${updatedProduct.store_id}</td>
            <td>${formatDateTime(updatedProduct.created_at)}</td>
            <td>${formatDateTime(updatedProduct.updated_at)}</td>
            <td>
                <button class="edit-product-btn" data-id="${updatedProduct.id}">Editar</button>
                <button class="delete-product-btn" data-id="${updatedProduct.id}">Eliminar</button>
            </td>
        `;
    }
}


// --- Funciones para la sección de Roles ---
async function loadRoles(token) {
    try {
        const initialHtml = `
            <h2>Roles</h2>
            <button id="show-add-role-form-btn">Añadir Nuevo Rol</button>
            <div id="add-role-form-container" style="display: none; margin-top: 15px;">
                <h3>Añadir Rol</h3>
                <form id="add-role-form">
                    <div class="form-group"><label for="role-name">Nombre del Rol:</label><input type="text" id="role-name" name="name" required></div>
                    <div class="form-group"><label for="add-role-store-select">Tienda:</label><select id="add-role-store-select" name="store_id" required><option value="">Seleccione una tienda...</option></select></div>
                    <div class="form-group"><label>Permisos:</label><div id="add-role-permissions-container" class="permissions-container"><p>Cargando permisos...</p></div></div>
                    <button type="submit">Guardar Rol</button><p id="add-role-error" class="error"></p>
                </form>
            </div>
            <table id="roles-table">
                <thead><tr><th>ID</th><th>Nombre</th><th>Permisos</th><th>Acciones</th></tr></thead>
                <tbody id="roles-table-body"></tbody>
            </table>`;
        contentArea.innerHTML = initialHtml;
        initializeEditRoleModalRefs(); // Inicializar refs ANTES de usarlas
        await fetchAndAppendRoles(token);
        setupRoleEventListeners(token);
    } catch (error) {
        console.error('Error inicial al cargar roles:', error);
        contentArea.innerHTML = `<p class="error">Error al cargar roles: ${error.message}</p>`;
    }
}
async function fetchAndAppendRoles(token) {
    const tableBody = document.getElementById('roles-table-body');
    tableBody.innerHTML = '<tr><td colspan="4" class="loading-indicator">Cargando roles...</td></tr>';

    try {
        const roles = await fetchApi('/roles?page=1&page_size=50', {}, token);

        if (!roles.length) {
            tableBody.innerHTML = '<tr><td colspan="4">No se encontraron roles.</td></tr>';
            return;
        }

        tableBody.innerHTML = '';
        roles.forEach(role => {
            const permissions = role.permissions?.map(p => p.name).join(', ') || '';
            const row = document.createElement('tr');
            row.setAttribute('data-role-id', role.id);
            row.innerHTML = `
                <td>${role.id}</td>
                <td>${role.name}</td>
                <td>${permissions}</td>
                <td>
                    <button class="edit-role-btn" data-id="${role.id}">Editar</button>
                    <button class="delete-role-btn" data-id="${role.id}">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching roles:', error);
        tableBody.innerHTML = `<tr><td colspan="4" class="error">Error al cargar roles: ${error.message}</td></tr>`;
    }
}

function setupRoleEventListeners(token) {
    const showAddFormBtn = document.getElementById('show-add-role-form-btn');
    const addFormContainer = document.getElementById('add-role-form-container');
    const addForm = document.getElementById('add-role-form');
    const addRoleError = document.getElementById('add-role-error');
    const tableBody = document.getElementById('roles-table-body');

    // Toggle Add Role Form
    if (showAddFormBtn) {
        showAddFormBtn.addEventListener('click', async () => {
            const isVisible = addFormContainer.style.display === 'block';
            addFormContainer.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                const token = localStorage.getItem('access_token');
                if (token) {
                    // Cargar tiendas en el select
                    await populateStoreSelector('add-role-store-select', token);
                    // Cargar permisos agrupados
                    await populatePermissionsCheckboxes('add-role-permissions-container', token);
                } else {
                    console.warn('No hay token disponible para cargar datos del formulario');
                }
            }
        });
    }

    // Handle Add Role Form Submission
    if (addForm) {
        addForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            addRoleError.textContent = '';
            const formData = new FormData(addForm);
            const roleData = Object.fromEntries(formData.entries());
            roleData.role_permissions = [];
            // Obtener permisos seleccionados
            addForm.querySelectorAll('#add-role-permissions-container input[type="checkbox"]:checked').forEach(cb => {
                roleData.role_permissions.push(cb.value);
            });

            try {
                await fetchApi('/roles', {
                    method: 'POST',
                    body: JSON.stringify(roleData)
                }, token);
                addForm.reset();
                addFormContainer.style.display = 'none';
                await fetchAndAppendRoles(token);
            } catch (error) {
                console.error('Error adding role:', error);
                addRoleError.textContent = `Error: ${error.message}`;
            }
        });
    }

    // Handle Edit and Delete Buttons (Event Delegation)
    if (tableBody) {
        tableBody.addEventListener('click', async (event) => {
            const target = event.target;

            // Delete Button
            if (target.classList.contains('delete-role-btn')) {
                const roleId = target.dataset.id;
                if (confirm(`¿Está seguro de que desea eliminar el rol ${roleId}?`)) {
                    try {
                        await fetchApi(`/roles/${roleId}`, { method: 'DELETE' }, token);
                        const rowToRemove = target.closest('tr');
                        if (rowToRemove) rowToRemove.remove();
                    } catch (error) {
                        console.error('Error deleting role:', error);
                        alert(`Error al eliminar: ${error.message}`);
                    }
                }
            }

            // Edit Button
            if (target.classList.contains('edit-role-btn')) {
                const roleId = target.dataset.id;
                editRoleError.textContent = '';
                try {
                    const role = await fetchApi(`/roles/${roleId}`, {}, token);
                    // Populate modal
                    editRoleIdInput.value = role.id;
                    editRoleNameInput.value = role.name;

                    // Cargar tiendas para el select (si existe)
                    const storeSelect = document.getElementById('add-role-store-select');
                    if (storeSelect) {
                        storeSelect.innerHTML = '<option value="">Cargando tiendas...</option>';
                        try {
                            const stores = await fetchApi('/stores?page=1&page_size=100', {}, token);
                            storeSelect.innerHTML = '<option value="">Seleccione una tienda...</option>';
                            stores.forEach(store => {
                                const option = document.createElement('option');
                                option.value = store.id;
                                option.textContent = store.name;
                                if (role.store_id === store.id) option.selected = true;
                                storeSelect.appendChild(option);
                            });
                        } catch {
                            storeSelect.innerHTML = '<option value="">Error al cargar tiendas</option>';
                        }
                    }

                    // Cargar permisos y marcar los asignados
                    const container = document.getElementById('edit-role-permissions-container');
                    container.innerHTML = '<p>Cargando permisos...</p>';
                    const permissions = await fetchApi('/permissions?page=1&page_size=100', {}, token);
                    container.innerHTML = '';
                    permissions.forEach(perm => {
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.value = perm.id;
                        checkbox.id = `edit-role-perm-${perm.id}`;
                        if (role.role_permissions.some(p => p.id === perm.id)) {
                            checkbox.checked = true;
                        }
                        const label = document.createElement('label');
                        label.htmlFor = checkbox.id;
                        label.textContent = perm.name;
                        container.appendChild(checkbox);
                        container.appendChild(label);
                    });

                    editRoleModal.style.display = 'block';
                } catch (error) {
                    console.error('Error fetching role for edit:', error);
                    alert(`Error al cargar datos para editar: ${error.message}`);
                }
            }
        });
    }

    // Handle Edit Modal Buttons
    if (closeEditRoleModalButton) {
        closeEditRoleModalButton.addEventListener('click', () => editRoleModal.style.display = 'none');
    }
    if (cancelEditRoleButton) {
        cancelEditRoleButton.addEventListener('click', () => editRoleModal.style.display = 'none');
    }
    if (saveEditRoleButton && editRoleForm) {
        saveEditRoleButton.addEventListener('click', async () => {
            editRoleError.textContent = '';
            const roleId = editRoleIdInput.value;
            const formData = new FormData(editRoleForm);
            const roleData = {
                name: formData.get('name'),
                role_permissions: []
            };
            editRoleForm.querySelectorAll('#edit-role-permissions-container input[type="checkbox"]:checked').forEach(cb => {
                roleData.role_permissions.push(cb.value);
            });

            try {
                const updatedRole = await fetchApi(`/roles/${roleId}`, {
                    method: 'PUT',
                    body: JSON.stringify(roleData)
                }, token);
                updateRoleRow(updatedRole);
                editRoleModal.style.display = 'none';
            } catch (error) {
                console.error('Error updating role:', error);
                editRoleError.textContent = `Error: ${error.message}`;
            }
        });
    }
}

function updateRoleRow(updatedRole) {
    const row = document.querySelector(`tr[data-role-id="${updatedRole.id}"]`);
    if (row) {
        const permissions = updatedRole.permissions?.map(p => p.name).join(', ') || '';
        row.innerHTML = `
            <td>${updatedRole.id}</td>
            <td>${updatedRole.name}</td>
            <td>${permissions}</td>
            <td>
                <button class="edit-role-btn" data-id="${updatedRole.id}">Editar</button>
                <button class="delete-role-btn" data-id="${updatedRole.id}">Eliminar</button>
            </td>
        `;
    }
}

// --- Funciones para la sección de Usuarios ---
async function loadUsers(token) {
    try {
        const initialHtml = `
            <h2>Usuarios</h2>
            <button id="show-add-user-form-btn">Añadir Nuevo Usuario</button>
            <div id="add-user-form-container" style="display: none; margin-top: 15px;">
                <h3>Añadir Usuario</h3>
                <form id="add-user-form">
                    <div class="form-group"><label for="user-name">Nombre:</label><input type="text" id="user-name" name="name" required></div>
                    <div class="form-group"><label for="user-email">Email:</label><input type="email" id="user-email" name="email" required></div>
                    <div class="form-group"><label for="user-password">Contraseña:</label><input type="password" id="user-password" name="password" required></div>
                    <div class="form-group"><label><input type="checkbox" id="user-cross-store" name="cross_store_allowed"> Permitir acceso multi-tienda</label></div>
                    <div class="form-group">
                        <label>Tiendas Asignadas:</label>
                        <div class="multi-select-container"><div id="add-user-stores-checkboxes" class="permission-grid"><p>Cargando tiendas...</p></div></div>
                        <small>Seleccione las tiendas.</small>
                    </div>
                     <div class="form-group">
                        <label>Roles Asignados:</label>
                         <div class="multi-select-container"><div id="add-user-roles-checkboxes" class="permission-grid"><p>Cargando roles...</p></div></div>
                         <small>Seleccione los roles.</small>
                    </div>
                    <button type="submit">Guardar Usuario</button>
                    <p id="add-user-error" class="error"></p>
                </form>
            </div>
            <table id="users-table">
                <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Multi-Tienda</th><th>Tiendas</th><th>Roles</th><th>Acciones</th></tr></thead>
                <tbody id="users-table-body"></tbody>
            </table>`;
        contentArea.innerHTML = initialHtml;
        initializeEditUserModalRefs(); // Inicializar refs ANTES de usarlas
        await fetchAndAppendUsers(token);
        setupUserEventListeners(token);
    } catch (error) {
        console.error('Error inicial al cargar usuarios:', error);
        contentArea.innerHTML = `<p class="error">Error al cargar usuarios: ${error.message}</p>`;
    }
}
async function fetchAndAppendUsers(token) { /* ... (código existente sin cambios) ... */ }
function setupUserEventListeners(token) { /* ... (código existente sin cambios) ... */ }
function updateUserRow(updatedUser) { /* ... (código existente sin cambios) ... */ }

// --- Funciones para la sección de Tiendas ---
async function loadStores(token) {
    try {
        const initialHtml = `
            <h2>Tiendas</h2>
            <button id="show-add-store-form-btn">Añadir Nueva Tienda</button>
            <div id="add-store-form-container" style="display: none; margin-top: 15px;">
                <h3>Añadir Tienda</h3>
                <form id="add-store-form">
                    <div class="form-group"><label for="store-name">Nombre:</label><input type="text" id="store-name" name="name" required></div>
                    <div class="form-group"><label for="store-address">Dirección:</label><input type="text" id="store-address" name="address" required></div>
                    <button type="submit">Guardar Tienda</button><p id="add-store-error" class="error"></p>
                </form>
            </div>
            <table id="stores-table">
                <thead><tr><th>ID</th><th>Nombre</th><th>Dirección</th><th>Acciones</th></tr></thead>
                <tbody id="stores-table-body"></tbody>
            </table>`;
        contentArea.innerHTML = initialHtml;
        initializeEditStoreModalRefs(); // Inicializar refs ANTES de usarlas
        await fetchAndAppendStores(token);
        setupStoreEventListeners(token);
    } catch (error) {
        console.error('Error inicial al cargar tiendas:', error);
        contentArea.innerHTML = `<p class="error">Error al cargar tiendas: ${error.message}</p>`;
    }
}
async function fetchAndAppendStores(token) { /* ... (código existente sin cambios) ... */ }
function setupStoreEventListeners(token) { /* ... (código existente sin cambios) ... */ }
function updateStoreRow(updatedStore) { /* ... (código existente sin cambios) ... */ }

// --- Funciones para la sección de Clientes ---
async function loadCustomers(token) {
    try {
        const initialHtml = `
            <h2>Clientes</h2>
            <button id="show-add-customer-form-btn">Añadir Nuevo Cliente</button>
            <div id="add-customer-form-container" style="display: none; margin-top: 15px;">
                <h3>Añadir Cliente</h3>
                <form id="add-customer-form">
                    <div class="form-group"><label for="customer-name">Nombre:</label><input type="text" id="customer-name" name="name" required></div>
                    <div class="form-group"><label for="customer-email">Email:</label><input type="email" id="customer-email" name="email" required></div>
                    <div class="form-group"><label for="customer-phone">Teléfono:</label><input type="tel" id="customer-phone" name="phone" required></div>
                    <div class="form-group"><label for="add-customer-store-select">Tienda:</label><select id="add-customer-store-select" name="store_id" required><option value="">Seleccione una tienda...</option></select></div>
                    <button type="submit">Guardar Cliente</button><p id="add-customer-error" class="error"></p>
                </form>
            </div>
            <table id="customers-table">
                <thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Tienda ID</th><th>Acciones</th></tr></thead>
                <tbody id="customers-table-body"></tbody>
            </table>`;
        contentArea.innerHTML = initialHtml;
        initializeEditCustomerModalRefs(); // Inicializar refs ANTES de usarlas
        await fetchAndAppendCustomers(token);
        setupCustomerEventListeners(token);
    } catch (error) {
        console.error('Error inicial al cargar clientes:', error);
        contentArea.innerHTML = `<p class="error">Error al cargar clientes: ${error.message}</p>`;
    }
}
async function fetchAndAppendCustomers(token) { /* ... (código existente sin cambios) ... */ }
function setupCustomerEventListeners(token) { /* ... (código existente sin cambios) ... */ }
function updateCustomerRow(updatedCustomer) { /* ... (código existente sin cambios) ... */ }


// --- Helper functions (populate*, fetchApi, formatDateTime, sortTableByColumn) ---
async function populateStoreCheckboxes(containerId, token, selectedStoreIds = []) { /* ... (código existente) ... */ }
async function populateRoleCheckboxes(containerId, token, selectedRoleIds = []) { /* ... (código existente) ... */ }
async function populateStoreSelector(selectElementId, token) {
    const selectElement = document.getElementById(selectElementId);
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">Cargando tiendas...</option>';

    try {
        const stores = await fetchApi('/stores?page=1&page_size=100', {}, token);
        selectElement.innerHTML = '<option value="">Seleccione una tienda...</option>';

        if (!stores || !stores.length) {
            selectElement.innerHTML = '<option value="">No hay tiendas disponibles</option>';
            return;
        }

        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error(`Error cargando tiendas para ${selectElementId}:`, error);
        selectElement.innerHTML = '<option value="">Error al cargar tiendas</option>';
    }
}

async function populatePermissionsCheckboxes(containerId, token, selectedPermissionIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<p>Cargando permisos...</p>';

    try {
        console.log(`[Permisos] Solicitando permisos para ${containerId}`);
        const permissions = await fetchApi('/permissions?page=1&page_size=100', {}, token);
        console.log(`[Permisos] Respuesta para ${containerId}:`, permissions);

        if (!permissions || !permissions.length) {
            container.innerHTML = '<p>No hay permisos disponibles.</p>';
            return;
        }

        // Agrupar permisos por 'description' si existe, si no, sin agrupar
        const groups = {};
        permissions.forEach(p => {
            const groupKey = p.description || 'Otros';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(p);
        });

        container.innerHTML = '';

        Object.keys(groups).forEach(groupName => {
            const groupDiv = document.createElement('div');
            groupDiv.classList.add('permission-group');

            const title = document.createElement('strong');
            title.textContent = groupName;
            groupDiv.appendChild(title);

            groups[groupName].forEach(perm => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = perm.id;
                checkbox.id = `${containerId}-perm-${perm.id}`;
                if (selectedPermissionIds.includes(perm.id)) {
                    checkbox.checked = true;
                }

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = perm.name;

                groupDiv.appendChild(checkbox);
                groupDiv.appendChild(label);
            });

            container.appendChild(groupDiv);
        });
    } catch (error) {
        console.error(`[Permisos] Error cargando permisos para ${containerId}:`, error);
        container.innerHTML = '<p class="error">Error al cargar permisos</p>';
    }
}

async function fetchApi(endpoint, options = {}, token) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    };
    const config = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers // Allow overriding headers like Content-Type if needed
        }
    };

    // Ensure body is stringified if present
    if (config.body && typeof config.body !== 'string') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(`${apiUrl}${endpoint}`, config);

        if (response.status === 401) { // Unauthorized
            console.error('Unauthorized access. Redirecting to login.');
            localStorage.removeItem('access_token');
            window.location.href = 'login.html';
            throw new Error('Acceso no autorizado (401)');
        }

        if (response.status === 204) { // No Content (e.g., successful DELETE)
            return null; // Or return a specific indicator if needed
        }

        const data = await response.json();

        if (!response.ok) {
            // Attempt to get error detail from FastAPI response
            const errorDetail = data.detail || `Error ${response.status}`;
            console.error('API Error:', errorDetail);
            throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail));
        }

        return data;

    } catch (error) {
        console.error('Fetch API Error:', error);
        // Re-throw the error so calling functions can handle it
        throw error; // Keep original error type if possible
    }
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    try {
        const date = new Date(dateTimeString);
        // Basic formatting, adjust as needed
        return date.toLocaleString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit' //, second: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date:", dateTimeString, e);
        return dateTimeString; // Return original if formatting fails
    }
}

function sortTableByColumn(table, columnIndex, sortType, ascending = true) { /* ... (código existente - ASUMIENDO QUE ESTÁ BIEN) ... */ }


// Combined click outside handler for all modals
window.addEventListener('click', (event) => {
    if (editProductModal && event.target === editProductModal) { editProductModal.style.display = 'none'; }
    if (editRoleModal && event.target === editRoleModal) { editRoleModal.style.display = 'none'; }
    if (editUserModal && event.target === editUserModal) { editUserModal.style.display = 'none'; }
    if (editStoreModal && event.target === editStoreModal) { editStoreModal.style.display = 'none'; }
    if (editCustomerModal && event.target === editCustomerModal) { editCustomerModal.style.display = 'none'; }
});
