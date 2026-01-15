// js/auth-global.js - Global authentication helper for all pages

// Check authentication status on any page
function checkGlobalAuth() {
    console.log('=== GLOBAL AUTH CHECK ===');
    
    // Get from localStorage
    const userStr = localStorage.getItem('micro_donation_user');
    const token = localStorage.getItem('micro_donation_token');
    
    console.log('LocalStorage check:', { userStr: !!userStr, token: !!token });
    
    if (userStr && token) {
        try {
            const user = JSON.parse(userStr);
            console.log('User is logged in globally:', user);
            return user;
        } catch (e) {
            console.error('Error parsing user:', e);
            return null;
        }
    }
    
    console.log('No global authentication found');
    return null;
}

// Update navbar for authenticated user
function updateNavbarForAuth(user) {
    console.log('Updating navbar for user:', user);
    
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (user) {
        // User is logged in - hide login/register buttons
        if (loginBtn) {
            loginBtn.style.display = 'none';
            loginBtn.parentElement.style.display = 'none'; // Hide the li item
        }
        if (registerBtn) {
            registerBtn.style.display = 'none';
            registerBtn.parentElement.style.display = 'none'; // Hide the li item
        }
        
        // Create user menu if not exists
        createUserMenu(user);
    } else {
        // User is not logged in - show login/register buttons
        if (loginBtn) {
            loginBtn.style.display = 'block';
            loginBtn.parentElement.style.display = 'block';
        }
        if (registerBtn) {
            registerBtn.style.display = 'block';
            registerBtn.parentElement.style.display = 'block';
        }
        
        // Remove user menu if exists
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.remove();
        }
    }
}

// Create user menu dropdown
function createUserMenu(user) {
    // Check if user menu already exists
    if (document.getElementById('userMenu')) {
        console.log('User menu already exists');
        return;
    }
    
    const navbarNav = document.querySelector('#navbarNav .navbar-nav');
    if (!navbarNav) {
        console.error('Navbar nav not found');
        return;
    }
    
    console.log('Creating user menu for:', user.name);
    
    const userMenuHTML = `
        <li class="nav-item dropdown" id="userMenu">
            <a class="nav-link dropdown-toggle" href="#" role="button" 
               data-bs-toggle="dropdown">
                <i class="fas fa-user-circle me-1"></i>
                <span class="user-name">${user.name.split(' ')[0]}</span>
            </a>
            <ul class="dropdown-menu">
                <li><a class="dropdown-item" href="pages/profile.html">
                    <i class="fas fa-user me-2"></i>My Profile
                </a></li>
                <li><a class="dropdown-item" href="#">
                    <i class="fas fa-donate me-2"></i>My Donations
                </a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item text-danger" href="#" id="globalLogoutBtn">
                    <i class="fas fa-sign-out-alt me-2"></i>Logout
                </a></li>
            </ul>
        </li>
    `;
    
    // Find where to insert (before login/register buttons)
    const loginItem = navbarNav.querySelector('.nav-item:has(#loginBtn)');
    if (loginItem) {
        loginItem.insertAdjacentHTML('beforebegin', userMenuHTML);
    } else {
        // Append to end if login button not found
        navbarNav.insertAdjacentHTML('beforeend', userMenuHTML);
    }
    
    // Add logout functionality
    document.getElementById('globalLogoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Global logout clicked');
        
        // Clear localStorage
        localStorage.removeItem('micro_donation_token');
        localStorage.removeItem('micro_donation_user');
        
        // Clear any auth instance
        if (window.auth && typeof auth.clearSession === 'function') {
            auth.clearSession();
        }
        
        // Redirect to homepage
        window.location.href = 'index.html';
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Global auth helper loaded');
    
    // Wait a bit for auth.js to initialize if it exists
    setTimeout(function() {
        const user = checkGlobalAuth();
        updateNavbarForAuth(user);
        
        // Also listen for auth changes
        window.addEventListener('storage', function(e) {
            if (e.key === 'micro_donation_user' || e.key === 'micro_donation_token') {
                console.log('Auth storage changed, updating navbar...');
                const updatedUser = checkGlobalAuth();
                updateNavbarForAuth(updatedUser);
            }
        });
    }, 100);
});

// Make functions available globally
window.checkGlobalAuth = checkGlobalAuth;
window.updateNavbarForAuth = updateNavbarForAuth;