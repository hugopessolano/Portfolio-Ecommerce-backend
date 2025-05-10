import { loginUser } from './api.js';
import { showLoginErrorMessage, hideLoginErrorMessage } from './utils.js';

// Sets up the event listener for the login form
export function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');

    if (loginForm && emailInput && passwordInput && rememberMeCheckbox) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            hideLoginErrorMessage(); // Hide previous errors

            const email = emailInput.value;
            const password = passwordInput.value;
            const rememberMe = rememberMeCheckbox.checked;

            if (!email || !password) {
                showLoginErrorMessage('Email y contraseña requeridos.');
                return;
            }

            console.log('[Auth] Attempting login...');
            const { error, data } = await loginUser(email, password);

            if (error) {
                console.error('Login failed:', error);
                // Use the error message from fetchData if available, otherwise generic
                showLoginErrorMessage(error || 'Error al iniciar sesión.');
            } else if (data && data.access_token) {
                console.log('[Auth] Login successful.');
                const token = data.access_token;
                if (rememberMe) {
                    localStorage.setItem('authToken', token);
                    console.log('[Auth] Token stored in localStorage.');
                } else {
                    sessionStorage.setItem('authToken', token);
                    console.log('[Auth] Token stored in sessionStorage.');
                }
                window.location.href = 'dashboard.html'; // Redirect to dashboard on success
            } else {
                // Handle unexpected success response without token
                console.error('Login failed: No access token received.');
                showLoginErrorMessage('Error inesperado durante el inicio de sesión.');
            }
        });
        console.log('[Auth] Login form listener setup complete.');
    } else {
        // Only log warning if we are actually on the login page (index.html)
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
             console.warn('[Auth] Login form elements not found. Login functionality will not work.');
        }
    }
}

// Logs the user out
export function logoutUser() {
    console.log('[Auth] Logging out...');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html'; // Redirect to login page
}

// Sets up the event listener for the logout button
export function setupLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', (event) => {
            event.preventDefault(); // Prevent default if it's a link/button
            logoutUser();
        });
        console.log('[Auth] Logout button listener setup complete.');
    } else {
         // Only log warning if we are on the dashboard page
         if (window.location.pathname.includes('dashboard.html')) {
            console.warn('[Auth] Logout button not found.');
         }
    }
}
