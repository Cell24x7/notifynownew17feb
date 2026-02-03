// RCS Campaign API Service
import { API_BASE_URL } from '@/config/api';
// Note: This needs significant refactoring as it uses window.location.hostname multiple times.
// I will start by adding the import and then replace the occurrences in a multi_replace step for cleanliness if needed,
// but for now I see multiple hardcoded strings. I'll use multi_replace for this file specifically in next step.
// Handles sending RCS campaigns to multiple contacts

export const rcsCampaignApi = {
  /**
   * Send RCS campaign to multiple contacts
   * @param campaignData - Campaign details and contacts
   * @returns Campaign send results
   */
  async sendCampaign(campaignData: {
    campaignName: string;
    templateId: string;
    contacts: Array<{ mobile?: string; email?: string; name?: string }>;
    variables?: Record<string, string>[];
    scheduledTime?: string;
  }) {
    if (!campaignData.campaignName) {
      throw new Error('Campaign name is required');
    }

    if (!campaignData.templateId) {
      throw new Error('Template ID is required');
    }

    if (!campaignData.contacts || campaignData.contacts.length === 0) {
      throw new Error('At least one contact is required');
    }

    console.log('📤 Sending RCS campaign:', campaignData.campaignName);
    console.log(`📞 Recipients: ${campaignData.contacts.length}`);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rcs/send-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(campaignData)
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send campaign');
      }

      const result = await response.json();

      console.log('✅ Campaign sent successfully');
      console.log(`📊 Results - Sent: ${result.sentMessages}, Failed: ${result.failedMessages}`);

      return result;
    } catch (error) {
      console.error('❌ Campaign send error:', error);
      throw error;
    }
  },

  /**
   * Send single RCS message to a contact
   * @param mobile - Mobile number
   * @param templateName - Template name
   * @returns Message send result
   */
  async sendMessage(mobile: string, templateName: string) {
    if (!mobile) {
      throw new Error('Mobile number is required');
    }

    if (!templateName) {
      throw new Error('Template name is required');
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rcs/send-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify({ mobile, templateName })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send message');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Message send error:', error);
      throw error;
    }
  },

  /**
   * Get RCS templates
   * @returns List of available templates
   */
  async getTemplates() {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rcs/templates`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Templates fetch error:', error);
      throw error;
    }
  },

  /**
   * Get campaign status
   * @param campaignId - Campaign ID
   * @returns Campaign status details
   */
  async getCampaignStatus(campaignId: string) {
    if (!campaignId) {
      throw new Error('Campaign ID is required');
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rcs/campaign/${campaignId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch campaign status');
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Campaign status fetch error:', error);
      throw error;
    }
  }
};
