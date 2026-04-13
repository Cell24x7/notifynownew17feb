import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface VoiceConfig {
  id: string;
  name: string;
  api_user: string;
  status: string;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`
  };
};

export const voiceService = {
  /**
   * Upload an audio file and get an Audio ID
   */
  uploadAudio: async (file: File) => {
    const formData = new FormData();
    formData.append('audio_file', file);

    const response = await axios.post(`${API_BASE_URL}/api/voice/upload`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Get available voice configurations
   */
  getConfigs: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/voice/configs`, {
      headers: getAuthHeaders()
    });
    return response.data;
  },

  /**
   * Save or update a voice configuration
   */
  saveConfig: async (config: any) => {
    const response = await axios.post(`${API_BASE_URL}/api/voice/configs`, config, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }
};
