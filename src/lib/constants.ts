// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
export const WEBUI_API_BASE_URL = `${API_BASE_URL}/api/v1`;

// App info
export const APP_NAME = 'Cortex';

// Get version from global constant defined by Vite
declare const APP_VERSION: string;
export const VERSION = typeof APP_VERSION !== 'undefined' ? APP_VERSION : '0.1.0';
