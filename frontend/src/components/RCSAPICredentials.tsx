import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Key,
  Plus,
  Code,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface APICredential {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
  createdDate: string;
  lastUsed?: string;
  requests: number;
}

const mockCredentials: APICredential[] = [
  {
    id: 'CRED001',
    name: 'Production API',
    status: 'active',
    apiKey: 'rcs_prod_2x9k3j8l9m2n1p5q',
    apiSecret: 'rcs_secret_9x8k3j8l9m2n1p5q',
    environment: 'production',
    createdDate: '2026-01-20',
    lastUsed: '2026-01-26',
    requests: 15234
  },
  {
    id: 'CRED002',
    name: 'Sandbox API',
    status: 'active',
    apiKey: 'rcs_sandbox_2x9k3j8l9m2n1p5q',
    apiSecret: 'rcs_secret_sandbox_9x8k3j8l9m2n1p5q',
    environment: 'sandbox',
    createdDate: '2026-01-15',
    lastUsed: '2026-01-25',
    requests: 3452
  }
];

export default function RCSAPICredentials() {
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<APICredential[]>(mockCredentials);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCred, setSelectedCred] = useState<APICredential | null>(null);
  const [credentialToDelete, setCredentialToDelete] = useState<APICredential | null>(null);
  const [newCredentialName, setNewCredentialName] = useState('');
  const [newEnvironment, setNewEnvironment] = useState<'sandbox' | 'production'>('sandbox');

  const handleCreate = async () => {
    if (!newCredentialName) {
      toast({
        title: 'Required Field',
        description: 'Please enter a credential name',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Generate API Key and Secret
      const apiKey = `rcs_${newEnvironment}_${Math.random().toString(36).substr(2, 16)}`;
      const apiSecret = `rcs_secret_${Math.random().toString(36).substr(2, 16)}`;

      const newCredential: APICredential = {
        id: `CRED${String(credentials.length + 1).padStart(3, '0')}`,
        name: newCredentialName,
        status: 'active',
        apiKey,
        apiSecret,
        environment: newEnvironment,
        createdDate: new Date().toISOString().split('T')[0],
        requests: 0
      };

      setCredentials([...credentials, newCredential]);
      setSelectedCred(newCredential);
      setIsCreateOpen(false);
      setNewCredentialName('');

      toast({
        title: 'Created',
        description: 'New API credential created successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create credential',
        variant: 'destructive'
      });
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    const newSecret = `rcs_secret_${Math.random().toString(36).substr(2, 16)}`;
    const updated = credentials.map(c =>
      c.id === id ? { ...c, apiSecret: newSecret } : c
    );
    setCredentials(updated);

    toast({
      title: 'Regenerated',
      description: 'API Secret has been regenerated'
    });
  };

  const handleDelete = async () => {
    if (!credentialToDelete) return;

    setCredentials(credentials.filter(c => c.id !== credentialToDelete.id));
    setCredentialToDelete(null);

    toast({
      title: 'Deleted',
      description: 'API credential has been deleted'
    });
  };

  const handleToggleStatus = (id: string) => {
    const updated = credentials.map(c =>
      c.id === id
        ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' }
        : c
    );
    setCredentials(updated);

    const cred = updated.find(c => c.id === id);
    toast({
      title: 'Updated',
      description: `Credential is now ${cred?.status}`
    });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`
    });
  };

  const productionCount = credentials.filter(c => c.environment === 'production').length;
  const sandboxCount = credentials.filter(c => c.environment === 'sandbox').length;
  const activeCount = credentials.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">🔑 API Credentials</h1>
          <p className="text-gray-600">Generate and manage RCS API keys</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          New Credential
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{credentials.length}</div>
              <p className="text-sm text-gray-600">Total Credentials</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{activeCount}</div>
              <p className="text-sm text-gray-600">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{productionCount}</div>
              <p className="text-sm text-gray-600">Production</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{sandboxCount}</div>
              <p className="text-sm text-gray-600">Sandbox</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credentials Table */}
      <Card>
        <CardHeader>
          <CardTitle>API Credentials</CardTitle>
          <CardDescription>Manage your RCS API access keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map(cred => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-mono text-sm">{cred.id}</TableCell>
                    <TableCell className="font-medium">{cred.name}</TableCell>
                    <TableCell>
                      <Badge variant={cred.environment === 'production' ? 'destructive' : 'secondary'}>
                        {cred.environment.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cred.status === 'active' ? 'default' : 'outline'}>
                        {cred.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{cred.createdDate}</TableCell>
                    <TableCell className="text-sm">{cred.lastUsed || '-'}</TableCell>
                    <TableCell className="text-sm font-mono">{cred.requests.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedCred(cred)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleStatus(cred.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCredentialToDelete(cred)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Code Examples Card */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Examples</CardTitle>
          <CardDescription>Use these credentials in your code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre>{`// cURL Example
curl -X POST https://api.rcs.example.com/api/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+919876543210",
    "message": "Hello, this is an RCS message!",
    "richElements": {}
  }'`}</pre>
          </div>

          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre>{`// JavaScript Example
const rcs = require('rcs-sdk');
const client = new rcs.Client({
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET'
});

client.sendMessage({
  to: '+919876543210',
  message: 'Hello from RCS!'
});`}</pre>
          </div>

          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre>{`// Python Example
from rcs import RCSClient

client = RCSClient(
  api_key='YOUR_API_KEY',
  api_secret='YOUR_API_SECRET'
)

response = client.send_message(
  to='+919876543210',
  message='Hello from RCS!'
)`}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Credential</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Credential Name *</Label>
              <Input
                value={newCredentialName}
                onChange={e => setNewCredentialName(e.target.value)}
                placeholder="e.g., Production API, Sandbox Testing"
              />
            </div>

            <div>
              <Label>Environment *</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={newEnvironment === 'sandbox'}
                    onChange={() => setNewEnvironment('sandbox')}
                    className="w-4 h-4"
                  />
                  <span className="ml-2">🧪 Sandbox (Testing)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={newEnvironment === 'production'}
                    onChange={() => setNewEnvironment('production')}
                    className="w-4 h-4"
                  />
                  <span className="ml-2">🚀 Production (Live)</span>
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> Keep your API credentials secure. Never commit them to version control.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              <Key className="w-4 h-4 mr-2" />
              Create Credential
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedCred && (
        <Dialog open={!!selectedCred} onOpenChange={() => setSelectedCred(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCred.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* API Key */}
              <div>
                <Label className="text-gray-600">API Key</Label>
                <div className="flex gap-2 mt-2">
                  <code className="flex-1 bg-gray-100 border rounded-lg px-3 py-2 text-sm font-mono break-all">
                    {showSecrets[selectedCred.id] ? selectedCred.apiKey : '••••••••••••••••'}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setShowSecrets({
                        ...showSecrets,
                        [selectedCred.id]: !showSecrets[selectedCred.id]
                      })
                    }
                  >
                    {showSecrets[selectedCred.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedCred.apiKey, 'API Key')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <Label className="text-gray-600">API Secret</Label>
                <div className="flex gap-2 mt-2">
                  <code className="flex-1 bg-gray-100 border rounded-lg px-3 py-2 text-sm font-mono break-all">
                    {showSecrets[`${selectedCred.id}-secret`]
                      ? selectedCred.apiSecret
                      : '••••••••••••••••'}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setShowSecrets({
                        ...showSecrets,
                        [`${selectedCred.id}-secret`]: !showSecrets[`${selectedCred.id}-secret`]
                      })
                    }
                  >
                    {showSecrets[`${selectedCred.id}-secret`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedCred.apiSecret, 'API Secret')}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-gray-600 text-xs">Environment</Label>
                  <p className="font-semibold">{selectedCred.environment.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Status</Label>
                  <p className="font-semibold">{selectedCred.status.toUpperCase()}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Created</Label>
                  <p className="font-semibold">{selectedCred.createdDate}</p>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">Total Requests</Label>
                  <p className="font-semibold">{selectedCred.requests.toLocaleString()}</p>
                </div>
              </div>

              {/* Regenerate Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleRegenerateSecret(selectedCred.id)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate Secret
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedCred(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Alert */}
      <AlertDialog open={!!credentialToDelete} onOpenChange={() => setCredentialToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Credential?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{credentialToDelete?.name}"? This cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
