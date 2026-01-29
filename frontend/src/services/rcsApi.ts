// API service for RCS Bot Configuration

const API_BASE_URL = `http://${window.location.hostname}:5000/api/rcs`;

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

interface RCSBotData {
  bot_name: string;
  brand_name: string;
  short_description: string;
  brand_color: string;
  bot_logo_url: string;
  banner_image_url: string;
  terms_url: string;
  privacy_url: string;
  route_type: 'DOMESTIC' | 'INTERNATIONAL';
  bot_type: 'DOMESTIC' | 'INTERNATIONAL';
  message_type: 'OTP' | 'TRANSACTIONAL' | 'PROMOTIONAL';
  billing_category: 'CONVERSATIONAL';
  development_platform: 'GSMA_API' | 'GOOGLE_API';
  webhook_url: string;
  callback_url?: string;
  languages_supported: string;
  agree_all_carriers: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  contacts?: Array<{
    contact_type: 'PHONE' | 'EMAIL' | 'WEBSITE';
    contact_value: string;
    label?: string;
  }>;
  media?: Array<{
    media_type: 'LOGO' | 'BANNER';
    media_url: string;
  }>;
}

export const rcsApi = {
  // Get all bots
  async getAllBots() {
    try {
      const response = await fetch(`${API_BASE_URL}/bots`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch bots');
      return await response.json();
    } catch (error) {
      console.error('Error fetching bots:', error);
      throw error;
    }
  },

  // Get bot by ID
  async getBotById(id: string | number) {
    try {
      const response = await fetch(`${API_BASE_URL}/bots/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Bot not found');
      return await response.json();
    } catch (error) {
      console.error('Error fetching bot:', error);
      throw error;
    }
  },

  // Create new bot configuration
  async createBot(data: RCSBotData) {
    try {
      const response = await fetch(`${API_BASE_URL}/bots`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create bot');
      return await response.json();
    } catch (error) {
      console.error('Error creating bot:', error);
      throw error;
    }
  },

  // Update bot configuration
  async updateBot(id: string | number, data: Partial<RCSBotData>) {
    try {
      const response = await fetch(`${API_BASE_URL}/bots/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update bot');
      return await response.json();
    } catch (error) {
      console.error('Error updating bot:', error);
      throw error;
    }
  },

  // Delete bot
  async deleteBot(id: string | number) {
    try {
      const response = await fetch(`${API_BASE_URL}/bots/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to delete bot');
      return await response.json();
    } catch (error) {
      console.error('Error deleting bot:', error);
      throw error;
    }
  },
};

