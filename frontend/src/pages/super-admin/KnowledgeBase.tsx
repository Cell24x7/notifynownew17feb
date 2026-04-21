import { useState, useEffect } from "react";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye, 
  Layout, 
  CheckCircle2, 
  Clock,
  ExternalLink,
  ChevronRight,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import api from "@/lib/api";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface Article {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category_id: number;
  category_name: string;
  is_published: boolean;
  view_count: number;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Editor State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);

  const fetchData = async () => {
    try {
      const [artRes, catRes] = await Promise.all([
        api.get("/knowledge/articles"),
        api.get("/knowledge/categories")
      ]);
      setArticles(artRes.data.articles);
      setCategories(catRes.data.categories);
    } catch (e) {
      toast.error("Failed to load Knowledge Base");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!editingArticle?.title || !editingArticle?.content || !editingArticle?.category_id) {
       return toast.error("Please fill all required fields");
    }

    try {
      if (editingArticle.id) {
        await api.put(`/knowledge/admin/articles/${editingArticle.id}`, editingArticle);
        toast.success("Article Updated");
      } else {
        await api.post("/knowledge/admin/articles", editingArticle);
        toast.success("Article Created");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      await api.delete(`/knowledge/admin/articles/${id}`);
      toast.success("Deleted");
      fetchData();
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.category_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* 🚀 Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Knowledge Base</h1>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Manage Help Center articles and Documentation</p>
          </div>
        </div>
        <Button onClick={() => { setEditingArticle({ is_published: true }); setIsModalOpen(true); }} className="rounded-xl font-bold gap-2">
          <Plus className="h-4 w-4" /> New Article
        </Button>
      </div>

      {/* 🔍 Search & Filters */}
      <div className="relative group max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Search documentation..." 
          className="h-12 pl-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-medium text-sm shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 📄 Article List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {loading ? (
             <div className="col-span-full py-20 text-center text-slate-400 font-medium animate-pulse">Synchronizing documents...</div>
        ) : filteredArticles.length > 0 ? (
          filteredArticles.map(article => (
            <Card key={article.id} className="group overflow-hidden border-slate-200 dark:border-slate-800 hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5 rounded-2xl bg-white dark:bg-slate-900">
              <CardContent className="p-0">
                <div className="p-5 flex items-start gap-4">
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold uppercase rounded p-1">{article.category_name}</Badge>
                        {!article.is_published && <Badge variant="destructive" className="text-[10px] uppercase">Draft</Badge>}
                      </div>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-1">{article.title}</h3>
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed mb-4">{article.summary || "No summary provided."}</p>
                      
                      <div className="flex items-center gap-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         <div className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> {article.view_count}</div>
                         <div className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> {new Date(article.created_at).toLocaleDateString()}</div>
                      </div>
                   </div>

                   <div className="flex flex-col gap-2">
                      <Button variant="ghost" size="icon" className="group-hover:bg-primary/10 group-hover:text-primary rounded-xl" onClick={() => { setEditingArticle(article); setIsModalOpen(true); }}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="hover:bg-rose-500/10 hover:text-rose-500 rounded-xl" onClick={() => handleDelete(article.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
             <Layout className="h-12 w-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-500 font-bold">No articles found matching your search</p>
          </div>
        )}
      </div>

      {/* 📝 Editor Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">{editingArticle?.id ? "Edit Article" : "Create New Article"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Title</Label>
                  <Input 
                    placeholder="E.g. How to connect WhatsApp API" 
                    className="h-12 rounded-xl font-bold"
                    value={editingArticle?.title || ""}
                    onChange={e => setEditingArticle(prev => ({ ...prev!, title: e.target.value }))}
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Category</Label>
                  <Select 
                    value={String(editingArticle?.category_id || "")} 
                    onValueChange={v => setEditingArticle(prev => ({ ...prev!, category_id: Number(v) }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl font-bold">
                       <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                       {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
            </div>

            <div className="space-y-2">
               <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Short Summary</Label>
               <Textarea 
                 placeholder="Short description for the article list..." 
                 className="rounded-xl font-medium"
                 value={editingArticle?.summary || ""}
                 onChange={e => setEditingArticle(prev => ({ ...prev!, summary: e.target.value }))}
               />
            </div>

            <div className="space-y-2">
               <Label className="text-xs font-bold uppercase text-slate-400 tracking-widest">Content</Label>
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <ReactQuill 
                    theme="snow" 
                    value={editingArticle?.content || ""}
                    onChange={val => setEditingArticle(prev => ({ ...prev!, content: val }))}
                    style={{ height: '300px' }}
                  />
               </div>
            </div>

            <div className="flex items-center gap-3 pt-6 border-t">
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={editingArticle?.is_published || false}
                    onChange={e => setEditingArticle(prev => ({ ...prev!, is_published: e.target.checked }))}
                  />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Published (Visible to Users)</span>
               </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
            <Button onClick={handleSave} className="rounded-xl font-bold px-8">Save Article</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
