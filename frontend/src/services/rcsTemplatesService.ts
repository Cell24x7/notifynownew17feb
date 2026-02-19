// RCS Templates Service
// Frontend service to communicate with RCS Templates API

import { API_BASE_URL } from '@/config/api';
import { useState, useCallback } from 'react';

// ? Correct API base (backend routes)
const API_BASE = `${API_BASE_URL}/api/rcs`;

// ? Auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// ? custId helper (fallback 7)
const getCustId = () => {
  const cid =
    localStorage.getItem('custId') ||
    localStorage.getItem('customerId') ||
    localStorage.getItem('cust_id');

  return cid ? cid : '7';
};

export const rcsTemplatesService = {
  // ? FINAL: Get templates from backend external endpoint
  // Returns ALWAYS array in UI-friendly shape: [{ id, name, ... }]
  async getAllTemplates(custId: string | number = getCustId()) {
    try {
      const url = `${API_BASE}/templates/external?custId=${custId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch templates');

      const json = await response.json(); // { success:true, data:[...] }

      // ? IMPORTANT: Map API fields -> UI fields
      // API gives: { Id, TemplateName }
      const list = Array.isArray(json?.data) ? json.data : [];

      return list.map((t: any) => ({
        id: t.id ?? t.Id,
        name: t.name ?? t.TemplateName,
        ...t,
      }));
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  // Get single template (if backend supports it)
  async getTemplate(id: string) {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  },

  // Create new template (if backend supports it)
  async createTemplate(templateData: any) {
    try {
      const response = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        body: JSON.stringify(templateData),
        credentials: 'include',
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({} as any));
        throw new Error(result.error || 'Failed to create template');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  // External create template (kept as-is)
  async createExternalTemplate(formData: FormData) {
    try {
      const response = await fetch(
        'https://rcs.cell24x7.com/manage_templates/create_new_template',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({} as any));
        throw new Error(result.msg || 'External API Error');
      }
      return await response.json();
    } catch (error) {
      console.error('External API Error:', error);
      throw error;
    }
  },

  // Update template (if backend supports it)
  async updateTemplate(id: string, templateData: any) {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        body: JSON.stringify(templateData),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to update template');
      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  // Delete template (if backend supports it)
  async deleteTemplate(id: string) {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete template');
      return await response.json();
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  // Approve template (if backend supports it)
  async approveTemplate(id: string, approvedBy = 'system') {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}/approve`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        body: JSON.stringify({ approved_by: approvedBy }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to approve template');
      return await response.json();
    } catch (error) {
      console.error('Error approving template:', error);
      throw error;
    }
  },

  // Reject template (if backend supports it)
  async rejectTemplate(id: string, rejectionReason: string, rejectedBy = 'system') {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}/reject`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          rejected_by: rejectedBy,
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to reject template');
      return await response.json();
    } catch (error) {
      console.error('Error rejecting template:', error);
      throw error;
    }
  },

  // Get templates by status (if backend supports it)
  async getTemplatesByStatus(status: string) {
    try {
      const response = await fetch(`${API_BASE}/templates/status/${status}`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates by status:', error);
      throw error;
    }
  },

  // Get pending templates (if backend supports it)
  async getPendingTemplates() {
    try {
      const response = await fetch(`${API_BASE}/templates/pending/approval`, {
        method: 'GET',
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pending templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pending templates:', error);
      throw error;
    }
  },

  // External campaign (kept as-is)
  async sendExternalCampaign(campaignData: any) {
    try {
      const response = await fetch(
        'https://rcs.cell24x7.com/send_campaign/send_template_API',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:
              'Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJ0ZXN0ZGVtbyIsImV4cCI6MTc2MDE3Nzk4MywiaWF0IjoxNzYwMDkxNTgzfQ.HNDl_9YkBQthBBj737AznagVrIyjWqI7oY3FYHVou77Q0GFD_GOsr0RV-A1po5jjLG-ggc_x_SPXj8SerDCeTw',
          },
          body: JSON.stringify(campaignData),
        }
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({} as any));
        throw new Error(result.error || 'External Campaign API Error');
      }
      return await response.json();
    } catch (error) {
      console.error('External Campaign API Error:', error);
      throw error;
    }
  },
};

// ? Custom React Hook for RCS Templates
export function useRCSTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ? Fetch templates
  const fetchTemplates = useCallback(async (custId?: string | number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await rcsTemplatesService.getAllTemplates(custId ?? getCustId());
      setTemplates(data);
      return data;
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch templates');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create template
  const createTemplate = useCallback(
    async (templateData: any) => {
      setLoading(true);
      setError(null);
      try {
        const newTemplate = await rcsTemplatesService.createTemplate(templateData);
        setTemplates([newTemplate, ...templates]);
        return newTemplate;
      } catch (err: any) {
        setError(err?.message || 'Failed to create template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [templates]
  );

  // Update template
  const updateTemplate = useCallback(
    async (id: string, templateData: any) => {
      setLoading(true);
      setError(null);
      try {
        const updatedTemplate = await rcsTemplatesService.updateTemplate(id, templateData);
        setTemplates(templates.map((t: any) => (String(t.id) === String(id) ? updatedTemplate : t)));
        return updatedTemplate;
      } catch (err: any) {
        setError(err?.message || 'Failed to update template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [templates]
  );

  // Delete template
  const deleteTemplate = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        await rcsTemplatesService.deleteTemplate(id);
        setTemplates(templates.filter((t: any) => String(t.id) !== String(id)));
      } catch (err: any) {
        setError(err?.message || 'Failed to delete template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [templates]
  );

  // Approve template
  const approveTemplate = useCallback(
    async (id: string, approvedBy?: string) => {
      setLoading(true);
      setError(null);
      try {
        const approvedTemplate = await rcsTemplatesService.approveTemplate(id, approvedBy || 'system');
        setTemplates(templates.map((t: any) => (String(t.id) === String(id) ? approvedTemplate : t)));
        return approvedTemplate;
      } catch (err: any) {
        setError(err?.message || 'Failed to approve template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [templates]
  );

  // Reject template
  const rejectTemplate = useCallback(
    async (id: string, reason: string, rejectedBy?: string) => {
      setLoading(true);
      setError(null);
      try {
        const rejectedTpl = await rcsTemplatesService.rejectTemplate(id, reason, rejectedBy || 'system');
        setTemplates(templates.map((t: any) => (String(t.id) === String(id) ? rejectedTpl : t)));
        return rejectedTpl;
      } catch (err: any) {
        setError(err?.message || 'Failed to reject template');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [templates]
  );

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    approveTemplate,
    rejectTemplate,
  };
}
