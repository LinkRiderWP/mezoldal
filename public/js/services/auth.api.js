const TOKEN_KEY = 'miklomez_auth_token';

export const authApi = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },
    setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    },
    removeToken() {
        localStorage.removeItem(TOKEN_KEY);
    },
    async getProfile() {
        const token = this.getToken();
        if (!token) return null;
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    },
    async login(email, password) {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        return await res.json();
    },
    async register(payload) {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return await res.json();
    },
    async updatePreferences(wantsEmailNotification) {
        const res = await fetch('/api/auth/preferences', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: JSON.stringify({ wantsEmailNotification })
        });
        return await res.json();
    }
};