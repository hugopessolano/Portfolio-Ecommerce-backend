import { getPageNumberFromUrl } from './utils.js';
import * as state from './state.js'; // Import state variables/functions
// Import specific view functions if needed for event listeners, e.g., fetchProducts
// Or pass callback functions as parameters

// --- Pagination Component ---

// Helper function to create a page number button
const createPageButton = (pageNumber, isCurrent = false, clickCallback) => {
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
        if (state.currentPage !== pageNumber) { // Avoid fetching if clicking current page
            state.setCurrentPage(pageNumber);
            if (clickCallback) {
                clickCallback(); // Call the provided function to fetch data for the new page
            } else {
                console.warn("Pagination button clicked, but no callback provided to fetch data.");
            }
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
// Requires a `fetchCallback` function to be passed, which will be called when a page button is clicked.
export const updatePaginationControls = ({ nextPageNum, lastPageNum }, fetchCallback) => {
    console.log(`[updatePaginationControls] Updating. Current: ${state.currentPage}, Next: ${nextPageNum}, Last: ${lastPageNum}`);
    const prevButton = document.getElementById('prev-page-button');
    const nextButton = document.getElementById('next-page-button');
    const pageInfo = document.getElementById('page-info');
    const pageNumbersContainer = document.getElementById('page-numbers');

    if (!prevButton || !nextButton || !pageInfo || !pageNumbersContainer) {
        console.error('[updatePaginationControls] Pagination UI elements missing!');
        return;
    }

    // Setup Prev/Next button listeners (only need to do this once, maybe in view setup?)
    // For now, adding them here ensures they work after re-rendering the view.
    // Remove previous listeners to avoid duplicates if this function is called multiple times
    prevButton.replaceWith(prevButton.cloneNode(true)); // Simple way to remove listeners
    nextButton.replaceWith(nextButton.cloneNode(true));
    const newPrevButton = document.getElementById('prev-page-button');
    const newNextButton = document.getElementById('next-page-button');

    newPrevButton.disabled = state.currentPage <= 1;
    const isOnLastPage = !nextPageNum || (lastPageNum && state.currentPage >= lastPageNum);
    newNextButton.disabled = isOnLastPage;

    newPrevButton.addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.setCurrentPage(state.currentPage - 1);
            fetchCallback();
        }
    });
    newNextButton.addEventListener('click', () => {
        if (!isOnLastPage) {
            // Use nextPageNum if available and valid, otherwise just increment
            const targetPage = (nextPageNum && nextPageNum > state.currentPage) ? nextPageNum : state.currentPage + 1;
            state.setCurrentPage(targetPage);
            fetchCallback();
        }
    });


    console.log(`[updatePaginationControls] State: Prev disabled=${newPrevButton.disabled}, Next disabled=${newNextButton.disabled}`);

    pageInfo.textContent = `Página ${state.currentPage}` + (lastPageNum ? ` de ${lastPageNum}` : '');

    // Generate page number buttons
    pageNumbersContainer.innerHTML = ''; // Clear previous buttons
    if (lastPageNum && lastPageNum > 1) {
        console.log(`[updatePaginationControls] Generating page numbers up to ${lastPageNum}`);
        const maxPagesToShow = 5; // Max number links shown (e.g., 1 ... 4 5 6 ... 10)
        let startPage, endPage;

        if (lastPageNum <= maxPagesToShow + 2) { // Show all if not many pages or ellipsis don't save much space
            startPage = 1;
            endPage = lastPageNum;
        } else {
            // Calculate start/end pages for the sliding window
            const maxPagesBeforeCurrent = Math.floor((maxPagesToShow - 1) / 2);
            const maxPagesAfterCurrent = Math.ceil((maxPagesToShow - 1) / 2);

            if (state.currentPage <= maxPagesBeforeCurrent + 1) { // Near the beginning
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (state.currentPage >= lastPageNum - maxPagesAfterCurrent) { // Near the end
                startPage = lastPageNum - maxPagesToShow + 1;
                endPage = lastPageNum;
            } else { // In the middle
                startPage = state.currentPage - maxPagesBeforeCurrent;
                endPage = state.currentPage + maxPagesAfterCurrent;
            }
        }

        // Add 'First' page button and '...' if needed
        if (startPage > 1) {
            pageNumbersContainer.appendChild(createPageButton(1, false, fetchCallback));
            if (startPage > 2) {
                pageNumbersContainer.appendChild(createPageEllipsis());
            }
        }

        // Add the main page number buttons
        for (let i = startPage; i <= endPage; i++) {
            pageNumbersContainer.appendChild(createPageButton(i, i === state.currentPage, fetchCallback));
        }

        // Add '...' and 'Last' page button if needed
        if (endPage < lastPageNum) {
            if (endPage < lastPageNum - 1) {
                pageNumbersContainer.appendChild(createPageEllipsis());
            }
            pageNumbersContainer.appendChild(createPageButton(lastPageNum, false, fetchCallback));
        }
    } else {
        console.log("[updatePaginationControls] Not generating page numbers (lastPage <= 1 or null).");
    }
    console.log('[updatePaginationControls] Controls and page numbers updated.');
};


// --- Store Filter Component ---

// Renders the options for the single store selector dropdown
export const renderSingleStoreSelector = () => {
    const selectElement = document.getElementById('single-store-select');
    if (!selectElement) {
        console.error('[renderSingleStoreSelector] Select element missing!');
        return;
    }
    console.log(`[renderSingleStoreSelector] Rendering for ${state.availableStores.length} stores.`);

    // Store current value if exists, to restore it after re-rendering
    const currentValue = selectElement.value;

    selectElement.innerHTML = ''; // Clear existing options

    if (state.availableStores.length === 0) {
        const defaultOption = new Option("No hay tiendas disponibles", "");
        selectElement.add(defaultOption);
        selectElement.disabled = true;
        return;
    }

    selectElement.disabled = (state.filterMode === 'all'); // Disable if 'all' mode is active

    // Add placeholder option
    selectElement.add(new Option("Seleccione una tienda...", ""));

    // Add options for each available store
    state.availableStores.forEach(store => {
        selectElement.add(new Option(store.name || store.id, store.id));
    });

    // Try to restore previous selection or the globally selected ID
    selectElement.value = state.selectedSingleStoreId || currentValue || "";
    console.log(`[renderSingleStoreSelector] Selector rendered. Current value: ${selectElement.value}`);
};

// Toggles the visibility and state of the store filter UI elements
// Requires a `fetchCallback` function to be passed for when the filter changes.
export const setupStoreFilterControls = (fetchCallback) => {
    const singleStoreContainer = document.getElementById('single-store-selector-container');
    const singleStoreSelect = document.getElementById('single-store-select');
    const allStoresCheckbox = document.getElementById('all-stores-checkbox');

    if (!singleStoreContainer || !singleStoreSelect || !allStoresCheckbox) {
        console.error("[setupStoreFilterControls] Filter UI elements missing.");
        return;
    }

    // Function to update UI based on mode
    const updateFilterUI = (isAllStoresMode) => {
        console.log(`[updateFilterUI] Setting filter mode: ${isAllStoresMode ? 'all' : 'single'}`);
        singleStoreContainer.style.display = isAllStoresMode ? 'none' : 'block';
        singleStoreSelect.disabled = isAllStoresMode;
        allStoresCheckbox.checked = isAllStoresMode;

        if (isAllStoresMode) {
            state.setSelectedStoreId(null); // Clear selected store ID
            singleStoreSelect.value = ""; // Reset dropdown visual
        } else {
            // If switching to single mode and no store is selected, maybe auto-select first?
            // Or just ensure the dropdown reflects the current state.selectedSingleStoreId
            singleStoreSelect.value = state.selectedSingleStoreId || "";
            // If still no value after setting from state, maybe select the first actual store?
            if (!singleStoreSelect.value && state.availableStores.length > 0) {
                 // Find the first *actual* store option (value is not "")
                 const firstStoreOption = Array.from(singleStoreSelect.options).find(opt => opt.value !== "");
                 if (firstStoreOption) {
                     // state.setSelectedStoreId(firstStoreOption.value); // Optionally update state too
                     // singleStoreSelect.value = firstStoreOption.value;
                     console.log(`[updateFilterUI] Single mode active, no store pre-selected.`);
                 }
            }
        }
    };

    // Initial UI setup based on current state
    updateFilterUI(state.filterMode === 'all');
    renderSingleStoreSelector(); // Ensure dropdown is populated correctly

    // --- Event Listeners ---
    allStoresCheckbox.addEventListener('change', (event) => {
        const isChecked = event.target.checked;
        state.setFilterMode(isChecked ? 'all' : 'single');
        updateFilterUI(isChecked); // Update UI appearance
        state.setCurrentPage(1); // Reset page when filter changes
        fetchCallback(); // Fetch data with new filter settings
    });

    singleStoreSelect.addEventListener('change', (event) => {
        const selectedId = event.target.value || null;
        state.setSelectedStoreId(selectedId);
        console.log(`[Filter] Single store selected: ${selectedId}`);
        // Fetch only if mode is single (changing selection implies we are in single mode)
        if (state.filterMode === 'single') {
            state.setCurrentPage(1); // Reset page
            fetchCallback(); // Fetch data for the selected store
        }
    });

    console.log("[setupStoreFilterControls] Store filter listeners setup complete.");
};


// --- Sort Indicator Component ---

// Updates the visual indicators (▲/▼) on table headers
export const updateSortIndicators = () => {
    const contentArea = document.querySelector('.content-area');
    if (!contentArea) return;

    contentArea.querySelectorAll('th[data-sort-key]').forEach(th => {
        const indicator = th.querySelector('.sort-indicator');
        if (!indicator) {
            // Create indicator span if it doesn't exist
            const newIndicator = document.createElement('span');
            newIndicator.classList.add('sort-indicator');
            th.appendChild(newIndicator);
            indicator = newIndicator; // Use the newly created one
        }

        if (th.dataset.sortKey === state.currentSortKey) {
            indicator.textContent = state.currentSortDirection === 'asc' ? ' ▲' : ' ▼';
            th.classList.add('sorted');
        } else {
            indicator.textContent = '';
            th.classList.remove('sorted');
        }
    });
    console.log(`[updateSortIndicators] Indicators updated. Key: ${state.currentSortKey}, Dir: ${state.currentSortDirection}`);
};

// Adds click listeners to sortable table headers
// Requires a `fetchCallback` function to fetch sorted data.
export const setupSortableHeaders = (fetchCallback) => {
    const contentArea = document.querySelector('.content-area');
    if (!contentArea) return;

    const sortableHeaders = contentArea.querySelectorAll('th[data-sort-key]');
    sortableHeaders.forEach(th => {
        // Use replaceWith to ensure only one listener is attached
        const newTh = th.cloneNode(true);
        th.parentNode.replaceChild(newTh, th);

        newTh.style.cursor = 'pointer'; // Indicate clickable header
        newTh.addEventListener('click', () => {
            const key = newTh.dataset.sortKey;
            console.log(`[Sort] Header clicked: ${key}`);
            let newDirection = 'asc';
            if (state.currentSortKey === key) {
                newDirection = state.currentSortDirection === 'asc' ? 'desc' : 'asc';
            }
            state.setSort(key, newDirection); // Update state
            updateSortIndicators(); // Update UI immediately
            state.setCurrentPage(1); // Reset to first page when sorting
            fetchCallback(); // Fetch sorted data
        });
    });
    console.log("[setupSortableHeaders] Sortable header listeners setup complete.");
};

// --- Page Size Selector ---
export const setupPageSizeSelector = (fetchCallback) => {
    const pageSizeSelect = document.getElementById('page-size');
    if (pageSizeSelect) {
        // Set initial value from state
        pageSizeSelect.value = state.currentPageSize.toString();

        pageSizeSelect.addEventListener('change', (event) => {
            const newSize = parseInt(event.target.value, 10);
            if (!isNaN(newSize)) {
                console.log(`[PageSize] Changed to: ${newSize}`);
                state.setPageSize(newSize);
                state.setCurrentPage(1); // Reset to page 1
                fetchCallback();
            }
        });
        console.log("[setupPageSizeSelector] Page size selector listener setup complete.");
    } else {
        console.warn("[setupPageSizeSelector] Page size select element ('page-size') not found.");
    }
};
