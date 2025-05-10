import * as api from './api.js';
import * as utils from './utils.js';
import * as ui from './uiComponents.js';

const contentArea = document.querySelector('.content-area');

export const loadOrderDetailView = async (orderId) => {
    console.log(`[OrderDetailView] Loading details for order ID: ${orderId}`);
    if (!contentArea) {
        console.error('[OrderDetailView] Content area missing!');
        return;
    }

    contentArea.innerHTML = '<h2>Cargando detalles de la orden...</h2>';

    if (!orderId) {
        contentArea.innerHTML = '<h2>Error: No se proporcionó ID de orden.</h2>';
        console.error('[OrderDetailView] No order ID provided.');
        return;
    }

    const { error, data: order } = await api.getOrderById(orderId);

    if (error) {
        console.error(`[OrderDetailView] Error fetching order ${orderId}:`, error);
        contentArea.innerHTML = `<h2>Error al cargar detalles de la orden ${orderId}:</h2><p>${error}</p>`;
        return;
    }

    if (!order) {
        contentArea.innerHTML = `<h2>Orden ${orderId} no encontrada.</h2>`;
        console.warn(`[OrderDetailView] Order ${orderId} not found.`);
        return;
    }

    console.log(`[OrderDetailView] Order data fetched:`, order);

    // Render order details
    renderOrderDetail(order);
};

const renderOrderDetail = (order) => {
    console.log('[OrderDetailView] Rendering order details...');
    contentArea.innerHTML = `
        <h1>Detalles de la Orden #${order.id}</h1>
        <div class="order-detail-container">
            <div class="order-info">
                <h3>Información de la Orden</h3>
                <p><strong>ID:</strong> ${order.id}</p>
                <p><strong>Tienda ID:</strong> ${order.store_id}</p>
                <p><strong>Total:</strong> ${order.total !== undefined && order.total !== null ? order.total.toFixed(2) : 'N/A'}</p>
                <p><strong>Fecha Creación:</strong> ${utils.formatDate(order.created_at)}</p>
                <p><strong>Última Actualización:</strong> ${utils.formatDate(order.updated_at)}</p>
            </div>

            <div class="customer-info">
                <h3>Información del Cliente</h3>
                ${order.customer ? `
                    <p><strong>ID:</strong> ${order.customer.id}</p>
                    <p><strong>Nombre:</strong> ${order.customer.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${order.customer.email || 'N/A'}</p>
                    <p><strong>Teléfono:</strong> ${order.customer.phone || 'N/A'}</p>
                ` : '<p>Información del cliente no disponible.</p>'}
            </div>

            <div class="products-info">
                <h3>Productos</h3>
                ${order.order_products && order.order_products.length > 0 ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Cantidad</th>
                                <th>Precio Unitario</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${order.order_products.map(product => `
                                <tr>
                                    <td>${product.name || 'N/A'}</td>
                                    <td>${product.quantity !== undefined && product.quantity !== null ? product.quantity : 'N/A'}</td>
                                    <td>${product.price !== undefined && product.price !== null ? product.price.toFixed(2) : 'N/A'}</td>
                                    <td>${(product.price * product.quantity).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p>No hay productos asociados a esta orden.</p>'}
            </div>
        </div>
        <button id="back-to-orders-button">Volver a Órdenes</button>
    `;

    // Add event listener for the back button
    const backButton = contentArea.querySelector('#back-to-orders-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            // TODO: Implement navigation back to the orders list
            console.log('[OrderDetailView] Back button clicked.');
            // Example: window.location.hash = '#orders'; // Assuming hash-based navigation
        });
    }
};
