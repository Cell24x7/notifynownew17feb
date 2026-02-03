// RCS Templates Service
// Frontend service to communicate with RCS Templates API

import { API_BASE_URL } from '@/config/api';

const API_BASE = `${API_BASE_URL}/api/rcs-templates`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const rcsTemplatesService = {
  // Get all templates
  async getAllTemplates() {
    try {
      const response = await fetch(`${API_BASE}/templates`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }
  },

  // Get single template
  async getTemplate(id: string) {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch template');
      return await response.json();
    } catch (error) {
      console.error('Error fetching template:', error);
      throw error;
    }
  },

  // Create new template
  async createTemplate(templateData: any) {
    try {
      const response = await fetch(`${API_BASE}/templates`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to create template');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  // Update template
  async updateTemplate(id: string, templateData: any) {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(templateData),
      });

      if (!response.ok) throw new Error('Failed to update template');
      return await response.json();
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  },

  // Delete template
  async deleteTemplate(id: string) {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Failed to delete template');
      return await response.json();
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  },

  // Approve template
  async approveTemplate(id: string, approvedBy = 'system') {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}/approve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ approved_by: approvedBy }),
      });

      if (!response.ok) throw new Error('Failed to approve template');
      return await response.json();
    } catch (error) {
      console.error('Error approving template:', error);
      throw error;
    }
  },

  // Reject template
  async rejectTemplate(id: string, rejectionReason: string, rejectedBy = 'system') {
    try {
      const response = await fetch(`${API_BASE}/templates/${id}/reject`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rejection_reason: rejectionReason,
          rejected_by: rejectedBy,
        }),
      });

      if (!response.ok) throw new Error('Failed to reject template');
      return await response.json();
    } catch (error) {
      console.error('Error rejecting template:', error);
      throw error;
    }
  },

  // Get templates by status
  async getTemplatesByStatus(status: string) {
    try {
      const response = await fetch(`${API_BASE}/templates/status/${status}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching templates by status:', error);
      throw error;
    }
  },

  // Get pending templates for approval
  async getPendingTemplates() {
    try {
      const response = await fetch(`${API_BASE}/templates/pending/approval`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch pending templates');
      return await response.json();
    } catch (error) {
      console.error('Error fetching pending templates:', error);
      throw error;
    }
  },
};

// Custom React Hook for RCS Templates
import { useState, useCallback } from 'react';

export function useRCSTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await rcsTemplatesService.getAllTemplates();
      setTemplates(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create template
  const createTemplate = useCallback(async (templateData) => {
    setLoading(true);
    setError(null);
    try {
      const newTemplate = await rcsTemplatesService.createTemplate(templateData);
      setTemplates([newTemplate, ...templates]);
      return newTemplate;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [templates]);

  // Update template
  const updateTemplate = useCallback(async (id, templateData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedTemplate = await rcsTemplatesService.updateTemplate(id, templateData);
      setTemplates(templates.map(t => t.id === id ? updatedTemplate : t));
      return updatedTemplate;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [templates]);

  // Delete template
  const deleteTemplate = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await rcsTemplatesService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [templates]);

  // Approve template
  const approveTemplate = useCallback(async (id, approvedBy) => {
    setLoading(true);
    setError(null);
    try {
      const approvedTemplate = await rcsTemplatesService.approveTemplate(id, approvedBy);
      setTemplates(templates.map(t => t.id === id ? approvedTemplate : t));
      return approvedTemplate;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [templates]);

  // Reject template
  const rejectTemplate = useCallback(async (id, reason, rejectedBy) => {
    setLoading(true);
    setError(null);
    try {
      const rejectedTpl = await rcsTemplatesService.rejectTemplate(id, reason, rejectedBy);
      setTemplates(templates.map(t => t.id === id ? rejectedTpl : t));
      return rejectedTpl;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [templates]);

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
