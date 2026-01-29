const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface SMSSenderData {
  entity_type: string;
  sender_id: string;
  company_name: string;
  company_website: string;
  logo_url: string;
  header_content: string;
  footer_content: string;
  sample_messages: string[];
  dlt_template_id: string | null;
  contacts: Array<{
    contact_type: 'PHONE' | 'EMAIL';
    contact_value: string;
    label?: string;
  }>;
  privacy_url: string;
  terms_url: string;
  agree_dlt: boolean;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
}

export const smsApi = {
  // Get all senders
  async getAllSenders() {
    try {
      const response = await fetch(`${API_BASE_URL}/sms-senders`);
      if (!response.ok) throw new Error('Failed to fetch senders');
      return await response.json();
    } catch (error) {
      console.error('Error fetching senders:', error);
      throw error;
    }
  },

  // Create new sender
  async createSender(data: SMSSenderData) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms-senders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create sender');
      return await response.json();
    } catch (error) {
      console.error('Error creating sender:', error);
      throw error;
    }
  },

  // Delete sender
  async deleteSender(id: number) {
    try {
      const response = await fetch(`${API_BASE_URL}/sms-senders/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete sender');
      return await response.json();
    } catch (error) {
      console.error('Error deleting sender:', error);
      throw error;
    }
  },
};