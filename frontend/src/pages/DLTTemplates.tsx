import { useState, useEffect, useCallback } from 'react';
import { Upload, Plus, Search, Edit, Trash2, FileSpreadsheet, X, Check, AlertCircle, ChevronLeft, ChevronRight, Loader2, FileText, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { dltTemplateService, type DLTTemplate, type DLTPagination } from '@/services/dltTemplateService';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';

export default function DLTTemplates() {
    const { toast } = useToast();

    // Data state
    const [templates, setTemplates] = useState<DLTTemplate[]>([]);
    const [pagination, setPagination] = useState<DLTPagination>({ total: 0, page: 1, limit: 20, totalPages: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Upload state
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [deleteOldData, setDeleteOldData] = useState(false);
    const [uploading, setUploading] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<DLTTemplate | null>(null);
    const [formData, setFormData] = useState({
        sender: '',
        template_text: '',
        temp_id: '',
        temp_name: '',
        status: 'Y' as 'Y' | 'N',
        temp_type: 'Transactional',
    });
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Fetch templates
    const fetchTemplates = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const data = await dltTemplateService.getTemplates(searchQuery, page, 20);
            setTemplates(data.templates);
            setPagination(data.pagination);
        } catch (err: any) {
            console.error('Fetch DLT templates error:', err);
            toast({ title: 'Error', description: 'Failed to fetch DLT templates', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [searchQuery, toast]);

    useEffect(() => {
        const timer = setTimeout(() => fetchTemplates(1), 300);
        return () => clearTimeout(timer);
    }, [searchQuery, fetchTemplates]);

    // Upload handler
    const handleUpload = async () => {
        if (!uploadFile) {
            toast({ title: 'No file selected', description: 'Please choose an XLS or XLSX file', variant: 'destructive' });
            return;
        }
        setUploading(true);
        try {
            const result = await dltTemplateService.bulkUpload(uploadFile, deleteOldData);
            toast({
                title: '✅ Upload Successful',
                description: result.message || `${result.count} templates uploaded`,
            });
            setUploadFile(null);
            setDeleteOldData(false);
            // Reset file input
            const fileInput = document.getElementById('dlt-file-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            fetchTemplates(1);
        } catch (err: any) {
            toast({
                title: 'Upload Failed',
                description: err.response?.data?.message || 'Error processing file',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    // Open add modal
    const openAddModal = () => {
        setEditingTemplate(null);
        setFormData({ sender: '', template_text: '', temp_id: '', temp_name: '', status: 'Y', temp_type: 'Transactional' });
        setIsModalOpen(true);
    };

    // Open edit modal
    const openEditModal = (template: DLTTemplate) => {
        setEditingTemplate(template);
        setFormData({
            sender: template.sender,
            template_text: template.template_text,
            temp_id: template.temp_id,
            temp_name: template.temp_name,
            status: template.status,
            temp_type: template.temp_type,
        });
        setIsModalOpen(true);
    };

    // Save handler
    const handleSave = async () => {
        if (!formData.sender || !formData.template_text || !formData.temp_id) {
            toast({ title: 'Validation Error', description: 'Sender, Template Text, and Template ID are required', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            if (editingTemplate) {
                await dltTemplateService.updateTemplate(editingTemplate.id, formData);
                toast({ title: '✅ Template Updated', description: 'DLT template updated successfully' });
            } else {
                await dltTemplateService.createTemplate(formData);
                toast({ title: '✅ Template Created', description: 'DLT template created successfully' });
            }
            setIsModalOpen(false);
            fetchTemplates(pagination.page);
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to save template',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Delete handler
    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            await dltTemplateService.deleteTemplate(deleteId);
            toast({ title: '🗑️ Template Deleted', description: 'DLT template removed successfully' });
            setDeleteId(null);
            fetchTemplates(pagination.page);
        } catch (err: any) {
            toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };
    
    // Sample Download handler
    const handleDownloadSample = () => {
        try {
            const headers = ['SENDER', 'TEMP_NAME', 'TEMP_ID', 'TEMPLATE_TEXT', 'STATUS', 'TEMP_TYPE'];
            const sampleData = [
                {
                    'SENDER': 'SLCSCL',
                    'TEMP_NAME': 'Temp_31st_mar_5',
                    'TEMP_ID': '1107177493302050627',
                    'TEMPLATE_TEXT': 'Dear Student, சாஃப்ட்வேர் நிறுவனங்களில் (கை நிறைய சம்பாதிக்க) B.Sc CS (Data Science and Analytics) B.Sc. Computer Science* (AI and ML) Microsoft Technology Associate Certification - Data Science using Python, AI தேர்ந்தெடுங்கள். SLCS - கல்லூரி மதுரை. scls.edu.in 7339137518 8870679991',
                    'STATUS': 'Y',
                    'TEMP_TYPE': 'Service Implicit'
                },
                {
                    'SENDER': 'CMTLTD',
                    'TEMP_NAME': 'Login_OTP',
                    'TEMP_ID': '1101234567890',
                    'TEMPLATE_TEXT': 'Your OTP for login is {#var#}. Do not share it with anyone. {#var#} Team',
                    'STATUS': 'Y',
                    'TEMP_TYPE': 'Transactional'
                }
            ];
            
            const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'DLT Templates');
            
            // Export as XLSX
            XLSX.writeFile(workbook, 'dlt_templates_sample.xlsx');
            
            toast({
                title: '✅ Sample Ready',
                description: 'The DLT template sample file has been downloaded.',
            });
        } catch (err) {
            console.error('Error generating sample:', err);
            toast({
                title: 'Error',
                description: 'Failed to generate sample file',
                variant: 'destructive'
            });
        }
    };

    const tempTypeColors: Record<string, string> = {
        'Transactional': 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
        'Transcational': 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20',
        'Service Implicit': 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        'Service Explicit': 'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20',
        'Promotional': 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20',
    };

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">DLT Template Management</h1>
                    <p className="text-muted-foreground mt-1">Upload and manage DLT template header data for SMS campaigns</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm py-1 px-3">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        {pagination.total} Templates
                    </Badge>
                </div>
            </div>

            {/* Upload Section */}
            <Card className="border-dashed border-2 border-primary/20 bg-gradient-to-br from-primary/[0.02] to-primary/[0.06]">
                <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                        {/* File Input */}
                        <div className="flex-1 space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Upload className="h-4 w-4 text-primary" />
                                Import DLT Template Header Data
                                <button
                                    type="button"
                                    onClick={handleDownloadSample}
                                    className="text-primary text-xs font-bold underline underline-offset-2 hover:text-primary/80 ml-2 bg-primary/5 px-2 py-1 rounded-md flex items-center gap-1 inline-flex"
                                >
                                    <Download className="h-3 w-3" />
                                    Download Sample File
                                </button>
                            </Label>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="relative flex-1">
                                    <input
                                        id="dlt-file-input"
                                        type="file"
                                        accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                    />
                                    <div className={cn(
                                        "flex items-center gap-3 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all",
                                        uploadFile
                                            ? "border-primary/50 bg-primary/5"
                                            : "border-muted-foreground/20 hover:border-primary/30"
                                    )}>
                                        <FileSpreadsheet className={cn("h-5 w-5 flex-shrink-0", uploadFile ? "text-primary" : "text-muted-foreground")} />
                                        <span className={cn("text-sm truncate", uploadFile ? "text-foreground font-medium" : "text-muted-foreground")}>
                                            {uploadFile ? uploadFile.name : 'Choose XLS or XLSX file...'}
                                        </span>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="text-xs py-1 whitespace-nowrap">
                                    xls, xlsx supported
                                </Badge>
                            </div>
                        </div>

                        {/* Add Template Button */}
                        <Button
                            onClick={openAddModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2 h-10"
                        >
                            <Plus className="h-4 w-4" />
                            Add Template
                        </Button>
                    </div>

                    {/* Bottom row: checkbox + buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 pt-4 border-t border-primary/10 gap-3">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <Checkbox
                                checked={deleteOldData}
                                onCheckedChange={(checked) => setDeleteOldData(checked === true)}
                            />
                            Delete old template data before upload
                        </label>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setUploadFile(null);
                                    setDeleteOldData(false);
                                    const fileInput = document.getElementById('dlt-file-input') as HTMLInputElement;
                                    if (fileInput) fileInput.value = '';
                                }}
                                className="gap-1.5"
                            >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpload}
                                disabled={!uploadFile || uploading}
                                className="bg-primary hover:bg-primary/90 gap-2 shadow-lg"
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Upload Template Data
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table Section */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <CardTitle className="text-lg font-semibold">DLT Template Data</CardTitle>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="font-semibold w-[100px]">SENDER</TableHead>
                                    <TableHead className="font-semibold min-w-[300px]">TEMPLATE_TEXT</TableHead>
                                    <TableHead className="font-semibold w-[160px]">TEMP_ID</TableHead>
                                    <TableHead className="font-semibold w-[180px]">TEMP_NAME</TableHead>
                                    <TableHead className="font-semibold w-[80px] text-center">STATUS</TableHead>
                                    <TableHead className="font-semibold w-[140px]">TEMP_TYPE</TableHead>
                                    <TableHead className="font-semibold w-[100px] text-center">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <span className="text-sm text-muted-foreground">Loading templates...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : templates.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-foreground">No DLT Templates Found</p>
                                                    <p className="text-sm text-muted-foreground">Upload an XLS/XLSX file or add templates manually</p>
                                                </div>
                                                <Button onClick={openAddModal} variant="outline" size="sm" className="mt-2 gap-1.5">
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add Template
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    templates.map((template, index) => (
                                        <TableRow key={template.id} className={cn("hover:bg-muted/30 transition-colors", index % 2 === 0 ? 'bg-background' : 'bg-muted/10')}>
                                            <TableCell className="font-medium text-sm">{template.sender}</TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground line-clamp-2 max-w-[400px]" title={template.template_text}>
                                                    {template.template_text}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{template.temp_id}</code>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-sm font-medium">{template.temp_name || '—'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant={template.status === 'Y' ? 'default' : 'secondary'} className={cn(
                                                    "text-xs font-semibold",
                                                    template.status === 'Y'
                                                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                                                        : 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20'
                                                )}>
                                                    {template.status === 'Y' ? '✓ Active' : '✗ Inactive'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-xs", tempTypeColors[template.temp_type] || 'bg-gray-500/10')}>
                                                    {template.temp_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditModal(template)}
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeleteId(template.id)}
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t">
                            <p className="text-sm text-muted-foreground">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page <= 1}
                                    onClick={() => fetchTemplates(pagination.page - 1)}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === pagination.page ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => fetchTemplates(pageNum)}
                                            className="h-8 w-8 p-0"
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => fetchTemplates(pagination.page + 1)}
                                    className="h-8 w-8 p-0"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Template Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            {editingTemplate ? (
                                <><Edit className="h-5 w-5 text-blue-600" /> Edit DLT Template</>
                            ) : (
                                <><Plus className="h-5 w-5 text-emerald-600" /> Add New DLT Template</>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTemplate ? 'Update the DLT template details below' : 'Fill in the DLT template details to add a new entry'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sender" className="text-sm font-medium">Sender <span className="text-red-500">*</span></Label>
                                <Input
                                    id="sender"
                                    placeholder="e.g. CMTLTD"
                                    value={formData.sender}
                                    onChange={(e) => setFormData(p => ({ ...p, sender: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="temp_id" className="text-sm font-medium">Template ID <span className="text-red-500">*</span></Label>
                                <Input
                                    id="temp_id"
                                    placeholder="e.g. 1107111110001001"
                                    value={formData.temp_id}
                                    onChange={(e) => setFormData(p => ({ ...p, temp_id: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="temp_name" className="text-sm font-medium">Template Name</Label>
                            <Input
                                id="temp_name"
                                placeholder="e.g. KMLoginSMSOtp"
                                value={formData.temp_name}
                                onChange={(e) => setFormData(p => ({ ...p, temp_name: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template_text" className="text-sm font-medium">Template Text <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="template_text"
                                placeholder="Your login OTP for {dynamic} is {dynamic}..."
                                value={formData.template_text}
                                onChange={(e) => setFormData(p => ({ ...p, template_text: e.target.value }))}
                                rows={4}
                                className="resize-none"
                            />
                            <p className="text-xs text-muted-foreground">
                                Use {'{dynamic}'} for variable placeholders. {formData.template_text.length} characters
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Status</Label>
                                <Select value={formData.status} onValueChange={(v) => setFormData(p => ({ ...p, status: v as 'Y' | 'N' }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Y">✓ Active (Y)</SelectItem>
                                        <SelectItem value="N">✗ Inactive (N)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Template Type</Label>
                                <Select value={formData.temp_type} onValueChange={(v) => setFormData(p => ({ ...p, temp_type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Transactional">Transactional</SelectItem>
                                        <SelectItem value="Service Implicit">Service Implicit</SelectItem>
                                        <SelectItem value="Service Explicit">Service Explicit</SelectItem>
                                        <SelectItem value="Promotional">Promotional</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 gap-2"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {editingTemplate ? 'Update Template' : 'Add Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Delete DLT Template
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this DLT template? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="gap-2"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
