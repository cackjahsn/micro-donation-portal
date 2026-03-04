/**
 * Path Resolver - Dynamic Base Path Handler
 * 
 * This script automatically detects the correct base path for the application
 * and provides helper functions for API calls and dynamic path resolution.
 * 
 * Usage: Include this script BEFORE any other scripts that use relative paths.
 * 
 * NOTE: HTML files should use standard relative paths:
 * - Root files: href="style.css", src="js/auth.js"
 * - Pages/ files: href="../style.css", src="../js/auth.js"
 */

(function() {
    'use strict';

    // Auto-detect base path from current URL
    function detectBasePath() {
        const path = window.location.pathname;
        
        // Check if we're in a subdirectory (e.g., /micro-donation-portal/pages/campaigns.html)
        const segments = path.split('/').filter(segment => segment.length > 0);
        
        // If path contains 'micro-donation-portal', use it as base
        const portalIndex = segments.indexOf('micro-donation-portal');
        if (portalIndex !== -1) {
            const basePath = '/' + segments.slice(0, portalIndex + 1).join('/');
            // Ensure trailing slash
            return basePath.endsWith('/') ? basePath : basePath + '/';
        }
        
        // Default to root if not in subdirectory
        return '/';
    }

    // Store the detected base path
    window.APP_BASE_PATH = detectBasePath();
    
    // Also set API base URL (ensure proper slash handling)
    const apiBase = window.APP_BASE_PATH.endsWith('/') 
        ? window.APP_BASE_PATH.slice(0, -1) 
        : window.APP_BASE_PATH;
    window.API_BASE_URL = apiBase + '/backend/api';

    console.log('[PathResolver] Base path detected:', window.APP_BASE_PATH);
    console.log('[PathResolver] API URL:', window.API_BASE_URL);

    /**
     * Resolve a relative path to an absolute path based on the detected base
     * Use this for dynamically generated paths in JavaScript
     * 
     * @param {string} path - Relative or absolute path
     * @returns {string} - Resolved absolute path
     */
    window.resolvePath = function(path) {
        if (!path) return '';
        
        // If path is already absolute (starts with / or http), return as-is
        if (path.startsWith('/') || path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        
        // If path uses parent directory reference (../)
        if (path.startsWith('../')) {
            // Count parent directory levels
            const parentLevels = (path.match(/\.\.\//g) || []).length;
            const cleanPath = path.replace(/^(\.\.\/)+/, '');
            
            // Get current directory depth
            const currentPath = window.location.pathname;
            const segments = currentPath.split('/').filter(s => s.length > 0);
            
            // Remove the file name if present
            if (segments.length > 0 && segments[segments.length - 1].includes('.')) {
                segments.pop();
            }
            
            // Go up parentLevels directories
            const newSegments = segments.slice(0, Math.max(0, segments.length - parentLevels));
            
            return '/' + [...newSegments, cleanPath].join('/');
        }
        
        // For simple relative paths, prepend base path
        const base = window.APP_BASE_PATH.endsWith('/') 
            ? window.APP_BASE_PATH.slice(0, -1) 
            : window.APP_BASE_PATH;
        return base + '/' + path;
    };

    /**
     * Get path to go back to root from current directory
     * @returns {string} - Relative path to root (e.g., "../" or "../../")
     */
    window.getRootPath = function() {
        const currentPath = window.location.pathname;
        const segments = currentPath.split('/').filter(s => s.length > 0);
        
        // Remove the file name if present
        if (segments.length > 0 && segments[segments.length - 1].includes('.')) {
            segments.pop();
        }
        
        // Check if we're in a subdirectory (like /pages/)
        const portalIndex = segments.indexOf('micro-donation-portal');
        if (portalIndex !== -1 && portalIndex < segments.length - 1) {
            // We're in a subdirectory, need to go back to micro-donation-portal root
            const depth = segments.length - portalIndex - 1;
            return '../'.repeat(depth);
        }
        
        // If we're at root, return empty
        return '';
    };

    /**
     * Update all links and resources with correct paths after DOM is loaded
     */
    function fixPathsOnLoad() {
        document.addEventListener('DOMContentLoaded', function() {
            // Fix all anchor links with data-path attribute
            document.querySelectorAll('a[data-path]').forEach(function(link) {
                const path = link.getAttribute('data-path');
                link.href = resolvePath(path);
            });

            // Fix all images with data-src attribute
            document.querySelectorAll('img[data-src]').forEach(function(img) {
                const src = img.getAttribute('data-src');
                img.src = resolvePath(src);
            });

            // Fix navbar brand link
            const brandLink = document.querySelector('.navbar-brand');
            if (brandLink && brandLink.getAttribute('href') === 'index.html') {
                brandLink.href = resolvePath('index.html');
            }

            // Fix all nav links
            document.querySelectorAll('.nav-link[href]').forEach(function(link) {
                const href = link.getAttribute('href');
                if (!href.startsWith('/') && !href.startsWith('http')) {
                    link.href = resolvePath(href);
                }
            });

            // Fix all button links
            document.querySelectorAll('a.btn[href]').forEach(function(link) {
                const href = link.getAttribute('href');
                if (!href.startsWith('/') && !href.startsWith('http') && 
                    !href.startsWith('#') && href.includes('.')) {
                    link.href = resolvePath(href);
                }
            });
        });
    }

    // Initialize path fixing
    fixPathsOnLoad();

})();
