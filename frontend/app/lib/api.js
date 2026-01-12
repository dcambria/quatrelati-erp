const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Se for 401, tentar renovar o token
      if (response.status === 401 && typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken && !endpoint.includes('/auth/')) {
          const refreshed = await this.refreshToken(refreshToken);
          if (refreshed) {
            // Repetir a requisição com o novo token
            config.headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
            const retryResponse = await fetch(url, config);
            return this.handleResponse(retryResponse);
          }
        }

        // Limpar tokens e redirecionar para login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Sessão expirada');
      }

      return this.handleResponse(response);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/pdf')) {
      return response.blob();
    }

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Erro na requisição');
      error.status = response.status;
      error.details = data.details;
      throw error;
    }

    return { data, status: response.status };
  }

  async refreshToken(refreshToken) {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  patch(endpoint, data) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Upload de arquivo (FormData)
  async upload(endpoint, formData) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {};

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || 'Erro no upload');
      error.status = response.status;
      throw error;
    }

    return { data, status: response.status };
  }

  // Download de arquivo (PDF)
  async download(endpoint, filename) {
    const url = `${this.baseUrl}${endpoint}`;
    let response = await fetch(url, {
      headers: this.getHeaders(),
    });

    // Se for 401, tentar renovar o token
    if (response.status === 401 && typeof window !== 'undefined') {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const refreshed = await this.refreshToken(refreshToken);
        if (refreshed) {
          // Repetir a requisição com o novo token
          response = await fetch(url, {
            headers: this.getHeaders(),
          });
        }
      }

      if (response.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Sessão expirada');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao baixar arquivo');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

const api = new ApiClient();
export default api;
