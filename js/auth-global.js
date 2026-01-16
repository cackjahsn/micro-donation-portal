// js/auth-global.js - Global authentication helper for all pages (Updated for Utils.js)

// Check authentication status on any page
function checkGlobalAuth() {
    console.log('=== GLOBAL AUTH CHECK ===');
    
    // Use utils.getStorage if available
    if (typeof utils !== 'undefined' && utils.getStorage) {
        const user = utils.getStorage('user');
        const token = utils.getStorage('token');
        
        console.log('Utils storage check:', { 
            user: user ? 'Exists' : 'Missing', 
            token: token ? 'Exists' : 'Missing' 
        });
        
        if (user && token) {
            console.log('User is logged in globally:', user);
            return user;
        }
    } else {
        // Fallback to localStorage
        const userStr = localStorage.getItem('micro_donation_user');
        const token = localStorage.getItem('micro_donation_token');
        
        console.log('LocalStorage check:', { 
            userStr: !!userStr, 
            token: !!token 
        });
        
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
            if (loginBtn.parentElement) {
                loginBtn.parentElement.style.display = 'none'; // Hide the li item
            }
        }
        if (registerBtn) {
            registerBtn.style.display = 'none';
            if (registerBtn.parentElement) {
                registerBtn.parentElement.style.display = 'none'; // Hide the li item
            }
        }
        
        // Create user menu if not exists
        createUserMenu(user);
    } else {
        // User is not logged in - show login/register buttons
        if (loginBtn) {
            loginBtn.style.display = 'block';
            if (loginBtn.parentElement) {
                loginBtn.parentElement.style.display = 'block';
            }
        }
        if (registerBtn) {
            registerBtn.style.display = 'block';
            if (registerBtn.parentElement) {
                registerBtn.parentElement.style.display = 'block';
            }
        }
        
        // Remove user menu if exists
        const userMenu = document.getElementById('userMenu');
        if (userMenu) {
            userMenu.remove();
        }
        
        // Remove admin menu if exists
        const adminMenu = document.getElementById('adminMenu');
        if (adminMenu) {
            adminMenu.remove();
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
    
    const userName = user.name?.split(' ')[0] || 
                    user.email?.split('@')[0] || 
                    'User';
    
    console.log('Creating user menu for:', userName);
    
    const userMenuHTML = `
        <li class="nav-item dropdown" id="userMenu">
            <a class="nav-link dropdown-toggle" href="#" role="button" 
               data-bs-toggle="dropdown">
                <i class="fas fa-user-circle me-1"></i>
                <span class="user-name">${userName}</span>
                ${user.role === 'admin' ? ' (Admin)' : ''}
            </a>
            <ul class="dropdown-menu">
                ${user.role === 'admin' ? `
                    <li><a class="dropdown-item" href="admin-dashboard.html">
                        <i class="fas fa-tachometer-alt me-2"></i>Admin Dashboard
                    </a></li>
                    <li><hr class="dropdown-divider"></li>
                ` : ''}
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
        
        // Clear storage using utils if available
        if (typeof utils !== 'undefined' && utils.clearSession) {
            utils.clearSession();
        } else if (typeof auth !== 'undefined' && auth.clearSession) {
            auth.clearSession();
        } else {
            // Fallback to localStorage clearing
            localStorage.removeItem('micro_donation_token');
            localStorage.removeItem('micro_donation_user');
            localStorage.removeItem('communitygive_token');
            localStorage.removeItem('communitygive_user');
        }
        
        // Show notification
        if (typeof utils !== 'undefined' && utils.showNotification) {
            utils.showNotification('Logged out successfully', 'success');
        }
        
        // Redirect to homepage
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    });
}

// Create admin menu if user is admin
function createAdminMenu(user) {
    if (user.role !== 'admin') return;
    
    if (document.getElementById('adminMenu')) {
        return;
    }
    
    const navbarNav = document.querySelector('#navbarNav .navbar-nav');
    if (!navbarNav) return;
    
    const adminMenuHTML = `
        <li class="nav-item" id="adminMenu">
            <a class="nav-link" href="admin-dashboard.html">
                <i class="fas fa-tachometer-alt me-1"></i>Admin
            </a>
        </li>
    `;
    
    // Add admin menu at the beginning
    navbarNav.insertAdjacentHTML('afterbegin', adminMenuHTML);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Global auth helper loaded');
    
    // Wait a bit for auth.js and utils.js to initialize
    setTimeout(function() {
        const user = checkGlobalAuth();
        updateNavbarForAuth(user);
        
        if (user && user.role === 'admin') {
            createAdminMenu(user);
        }
        
        // Listen for auth changes
        window.addEventListener('storage', function(e) {
            if (e.key === 'micro_donation_user' || e.key === 'micro_donation_token' ||
                e.key === 'communitygive_user' || e.key === 'communitygive_token') {
                console.log('Auth storage changed, updating navbar...');
                const updatedUser = checkGlobalAuth();
                updateNavbarForAuth(updatedUser);
                
                if (updatedUser && updatedUser.role === 'admin') {
                    createAdminMenu(updatedUser);
                }
            }
        });
        
        // Listen for custom auth change events
        window.addEventListener('authchange', function(e) {
            console.log('Auth change event received:', e.detail);
            updateNavbarForAuth(e.detail.user);
            
            if (e.detail.user && e.detail.user.role === 'admin') {
                createAdminMenu(e.detail.user);
            }
        });
    }, 300);
});

// Make functions available globally
window.checkGlobalAuth = checkGlobalAuth;
window.updateNavbarForAuth = updateNavbarForAuth;
window.createUserMenu = createUserMenu;