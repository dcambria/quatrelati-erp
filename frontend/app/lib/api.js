// URL relativa: Nginx roteia /api/* para o backend em prod; Next.js rewrite em dev
const API_URL = '/api';

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

    // Se não for JSON, evitar crash com "Unexpected token '<'"
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        const error = new Error(`Erro ${response.status}: resposta inesperada do servidor`);
        error.status = response.status;
        throw error;
      }
      return { data: {}, status: response.status };
    }

    const data = await response.json();

    if (!response.ok) {
      // Construir mensagem de erro detalhada
      let errorMessage = data.error || 'Erro na requisição';

      // Se houver detalhes de validação, incluir na mensagem
      if (data.details && Array.isArray(data.details) && data.details.length > 0) {
        const detailMessages = data.details.map(d => d.message).join('; ');
        errorMessage = detailMessages;
      }

      const error = new Error(errorMessage);
      error.status = response.status;
      error.details = data.details;
      error.originalError = data.error;
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

  // Download de arquivo (PDF) - abre em nova aba
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
    const pdfUrl = window.URL.createObjectURL(blob);

    // Abrir PDF em nova aba
    const newTab = window.open(pdfUrl, '_blank');

    // Se o navegador bloqueou pop-up, fazer download tradicional
    if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    // Limpar URL após um tempo (para permitir visualização)
    setTimeout(() => {
      window.URL.revokeObjectURL(pdfUrl);
    }, 60000);
  }
}

const api = new ApiClient();
export default api;
