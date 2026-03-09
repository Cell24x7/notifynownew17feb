import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuth } from './AuthContext';

interface BrandingSettings {
    brand_name: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    secondary_color: string;
    support_email: string;
    support_phone: string;
}

interface BrandingContextType {
    settings: BrandingSettings | null;
    isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<BrandingSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const hostname = window.location.hostname;
                let url = `${API_BASE_URL}/api/resellers/whitelabel?domain=${hostname}`;

                // If we are logged in as a reseller or a reseller's client, use that ID too
                if (user?.actual_reseller_id) {
                    url += `&reseller_id=${user.actual_reseller_id}`;
                }

                const response = await axios.get(url);

                if (response.data.success && response.data.settings) {
                    const s = response.data.settings;
                    setSettings(s);

                    // Apply colors to CSS variables
                    const root = document.documentElement;
                    if (s.primary_color) {
                        root.style.setProperty('--primary', s.primary_color);
                        // Optional: compute foreground colors if needed
                    }

                    // Update Document Title and Favicon
                    if (s.brand_name) {
                        document.title = s.brand_name;
                    }
                    if (s.favicon_url) {
                        const favicon = document.getElementById('favicon') as HTMLLinkElement;
                        if (favicon) {
                            favicon.href = s.favicon_url;
                        }
                    }
                } else if (response.data.success && !response.data.settings) {
                    // Reset if no settings found (e.g. logout or wrong domain)
                    setSettings(null);
                    // document.title = 'NotifyNow'; // Reset to default?
                }
            } catch (err) {
                console.error('Failed to fetch branding settings:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBranding();
    }, [user?.actual_reseller_id]); // Re-fetch when user changes

    return (
        <BrandingContext.Provider value={{ settings, isLoading }}>
            {children}
        </BrandingContext.Provider>
    );
};

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (context === undefined) {
        throw new Error('useBranding must be used within a BrandingProvider');
    }
    return context;
};
