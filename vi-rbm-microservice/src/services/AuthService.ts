import axios from 'axios';
import { config } from '../config/env';

class AuthService {
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;

    /**
     * Get a valid access token.
     * Checks for cached token validity (with buffer) before fetching new one.
     */
    public async getAccessToken(): Promise<string> {
        if (this.isTokenValid()) {
            return this.accessToken as string;
        }

        try {
            console.log('🔄 Refreshing Vi RBM Access Token...');
            const auth = Buffer.from(`${config.viRbm.clientId}:${config.viRbm.clientSecret}`).toString('base64');

            const response = await axios.post(
                `${config.viRbm.authUrl}?grant_type=client_credentials`,
                {},
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/json' // Some providers expect application/x-www-form-urlencoded
                    }
                }
            );

            if (response.data && response.data.access_token) {
                this.accessToken = response.data.access_token;
                // Default to 1 hour if not provided, subtract 5 mins buffer
                const expiresIn = response.data.expires_in || 3600;
                this.tokenExpiry = Date.now() + (expiresIn * 1000) - (5 * 60 * 1000);

                console.log('✅ Vi RBM Token obtained successfully');
                return this.accessToken as string;
            } else {
                throw new Error('No access_token in response');
            }
        } catch (error: any) {
            console.error('❌ Authentication Failed:', error.message);
            if (error.response) {
                console.error('Response:', error.response.data);
            }
            throw error;
        }
    }

    private isTokenValid(): boolean {
        if (!this.accessToken || !this.tokenExpiry) return false;
        return Date.now() < this.tokenExpiry;
    }
}

export const authService = new AuthService();
