import { useState, useEffect, useRef } from 'react';
import { documentsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Upload, 
  FileText, 
  FilePdf, 
  FileDoc, 
  Trash, 
  FunnelSimple,
  MagnifyingGlass,
  CircleNotch,
  CloudArrowUp,
  Files
} from '@phosphor-icons/react';
import { toast } from 'sonner';

export default function DocumentsPage() {
  const { user, hasPermission } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);
  
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    doc_type: 'other',
    file: null,
  });

  useEffect(() => {
    loadDocuments();
  }, [filter]);

  const loadDocuments = async () => {
    try {
      const docType = filter === 'all' ? null : filter;
      const response = await documentsAPI.list(docType);
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        title: uploadForm.title || file.name.replace(/\.[^/.]+$/, ''),
      });
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('doc_type', uploadForm.doc_type);

      await documentsAPI.upload(formData);
      toast.success('Document uploaded and indexed successfully');
      setUploadDialogOpen(false);
      setUploadForm({ title: '', description: '', doc_type: 'other', file: null });
      loadDocuments();
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to upload document';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await documentsAPI.delete(docId);
      toast.success('Document deleted');
      loadDocuments();
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FilePdf size={20} className="text-red-400" />;
    if (['doc', 'docx'].includes(ext)) return <FileDoc size={20} className="text-blue-400" />;
    return <FileText size={20} className="text-zinc-400" />;
  };

  const getDocTypeBadgeClass = (docType) => {
    const classes = {
      sop: 'badge-sop',
      manual: 'badge-manual',
      compliance: 'badge-compliance',
      other: 'badge-other',
    };
    return classes[docType] || classes.other;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase()) ||
    doc.description?.toLowerCase().includes(search.toLowerCase())
  );

  const canUpload = hasPermission('upload_docs');
  const canDelete = hasPermission('delete_docs');

  return (
    <div className="p-6" data-testid="documents-page">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-mono font-bold text-white">DOCUMENT LIBRARY</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {documents.length} documents indexed • {filteredDocuments.length} shown
            </p>
          </div>
          
          {canUpload && (
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  data-testid="upload-btn"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-mono font-semibold rounded-sm glow-amber"
                >
                  <Upload size={18} className="mr-2" />
                  UPLOAD DOCUMENT
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white font-mono">UPLOAD DOCUMENT</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpload} className="space-y-4 mt-4">
                  {/* File Drop Zone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors ${
                      uploadForm.file 
                        ? 'border-amber-500 bg-amber-500/10' 
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="file-input"
                    />
                    {uploadForm.file ? (
                      <div className="flex items-center justify-center gap-3">
                        {getFileIcon(uploadForm.file.name)}
                        <span className="text-white font-mono">{uploadForm.file.name}</span>
                      </div>
                    ) : (
                      <>
                        <CloudArrowUp size={40} className="mx-auto text-zinc-500 mb-2" />
                        <p className="text-zinc-400 text-sm">Click to select file</p>
                        <p className="text-zinc-600 text-xs mt-1">PDF, DOCX, or TXT</p>
                      </>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-mono text-xs uppercase">Title</Label>
                    <Input
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Document title"
                      data-testid="title-input"
                      className="bg-zinc-950 border-zinc-700 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-mono text-xs uppercase">Description</Label>
                    <Input
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Brief description (optional)"
                      data-testid="description-input"
                      className="bg-zinc-950 border-zinc-700 text-white font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-zinc-300 font-mono text-xs uppercase">Document Type</Label>
                    <Select
                      value={uploadForm.doc_type}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, doc_type: value })}
                    >
                      <SelectTrigger 
                        data-testid="doctype-select"
                        className="bg-zinc-950 border-zinc-700 text-white font-mono"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        <SelectItem value="sop" className="text-white font-mono">SOP</SelectItem>
                        <SelectItem value="manual" className="text-white font-mono">Manual</SelectItem>
                        <SelectItem value="compliance" className="text-white font-mono">Compliance</SelectItem>
                        <SelectItem value="other" className="text-white font-mono">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={uploading || !uploadForm.file}
                    data-testid="submit-upload-btn"
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-mono font-semibold rounded-sm"
                  >
                    {uploading ? (
                      <>
                        <CircleNotch className="w-5 h-5 animate-spin mr-2" />
                        PROCESSING...
                      </>
                    ) : (
                      <>
                        <Upload size={18} className="mr-2" />
                        UPLOAD & INDEX
                      </>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-zinc-900 border-zinc-800 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search documents..."
                  data-testid="search-input"
                  className="pl-10 bg-zinc-950 border-zinc-700 text-white font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <FunnelSimple size={18} className="text-zinc-500" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger 
                    data-testid="filter-select"
                    className="w-40 bg-zinc-950 border-zinc-700 text-white font-mono"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all" className="text-white font-mono">All Types</SelectItem>
                    <SelectItem value="sop" className="text-white font-mono">SOPs</SelectItem>
                    <SelectItem value="manual" className="text-white font-mono">Manuals</SelectItem>
                    <SelectItem value="compliance" className="text-white font-mono">Compliance</SelectItem>
                    <SelectItem value="other" className="text-white font-mono">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <CircleNotch className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-20">
                <Files size={48} className="mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-500 font-mono">No documents found</p>
                {canUpload && (
                  <p className="text-zinc-600 text-sm mt-2">Upload your first document to get started</p>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800 hover:bg-transparent">
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Document</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Type</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Chunks</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Size</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Uploaded By</TableHead>
                    <TableHead className="text-zinc-400 font-mono text-xs uppercase">Date</TableHead>
                    {canDelete && <TableHead className="text-zinc-400 font-mono text-xs uppercase w-16"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow 
                      key={doc.id} 
                      data-testid={`doc-row-${doc.id}`}
                      className="border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.filename)}
                          <div>
                            <p className="text-white font-mono text-sm">{doc.title}</p>
                            {doc.description && (
                              <p className="text-zinc-500 text-xs truncate max-w-xs">{doc.description}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getDocTypeBadgeClass(doc.doc_type)} border-0 font-mono text-xs uppercase`}>
                          {doc.doc_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-400 font-mono text-sm">{doc.chunk_count}</TableCell>
                      <TableCell className="text-zinc-400 font-mono text-sm">{formatFileSize(doc.file_size)}</TableCell>
                      <TableCell className="text-zinc-400 text-sm">{doc.uploaded_by_name}</TableCell>
                      <TableCell className="text-zinc-500 font-mono text-sm">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </TableCell>
                      {canDelete && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            data-testid={`delete-doc-${doc.id}`}
                            className="h-8 w-8 p-0 hover:bg-red-500/20"
                          >
                            <Trash size={16} className="text-red-400" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
