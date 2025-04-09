const loginForm = document.getElementById('login-form');
const errorMessage = document.getElementById('error-message');
const apiUrl = 'http://127.0.0.1:8000'; // API base URL

// Redirigir si ya hay un token (por si el usuario navega a login.html estando logueado)
if (localStorage.getItem('access_token')) {
    window.location.href = 'index.html';
}

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Evitar el envío tradicional del formulario
    errorMessage.textContent = ''; // Limpiar mensajes de error previos

    const formData = new FormData(loginForm);

    try {
        const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            body: formData // FastAPI espera 'username' y 'password' como form data
        });

        const data = await response.json();

        if (!response.ok) {
            // Intentar obtener un mensaje de error más específico si la API lo proporciona
            const detail = data.detail || `Error ${response.status}: ${response.statusText}`;
            throw new Error(detail);
        }

        if (data.access_token) {
            localStorage.setItem('access_token', data.access_token);
            window.location.href = 'index.html'; // Redirigir a la página principal
        } else {
            throw new Error('No se recibió el token de acceso.');
        }

    } catch (error) {
        console.error('Error en el inicio de sesión:', error);
        errorMessage.textContent = `Error: ${error.message || 'No se pudo iniciar sesión. Verifica tus credenciales.'}`;
    }
});
