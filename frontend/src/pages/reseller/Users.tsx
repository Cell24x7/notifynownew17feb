import SuperAdminClients from '../super-admin/Clients';

export default function ResellerUsers() {
    // We can reuse SuperAdminClients because 
    // 1. Backend already handles filtering by reseller_id
    // 2. UI elements like "Add User" etc are already there
    // 3. Reseller role is now allowed in the backend routes

    return <SuperAdminClients />;
}
