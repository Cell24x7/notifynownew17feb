import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

export interface Transaction {
    id: number;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    status: string;
    created_at: string;
}

export const walletApi = {
    getBalance: async () => {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/wallet/balance`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    getTransactions: async () => {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/wallet/transactions`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    rechargeWallet: async (amount: number) => {
        const token = localStorage.getItem('authToken');
        const response = await axios.post(`${API_BASE_URL}/api/wallet/recharge`,
            { amount },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    }
};
