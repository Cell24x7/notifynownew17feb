import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getEndpoint } from '@/config/api';

interface FeedbackDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function FeedbackDialog({ isOpen, onClose, onSuccess }: FeedbackDialogProps) {
    const [name, setName] = useState('');
    const [designation, setDesignation] = useState('');
    const [company, setCompany] = useState('');
    const [rating, setRating] = useState(5);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Word count check
        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount > 150) {
            toast({
                title: 'Message too long',
                description: 'Please keep your feedback under 150 words.',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(getEndpoint('/api/feedbacks'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    designation,
                    company,
                    rating,
                    message,
                }),
            });

            const data = await response.json();
            if (data.success) {
                toast({
                    title: 'Feedback submitted',
                    description: 'Thank you for your valuable feedback!',
                });
                onClose();
                if (onSuccess) onSuccess();
                // Reset form
                setName('');
                setDesignation('');
                setCompany('');
                setRating(5);
                setMessage('');
            } else {
                throw new Error(data.message || 'Failed to submit feedback');
            }
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Something went wrong',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-primary">Give Feedback</DialogTitle>
                    <DialogDescription>
                        We value your opinion. Please share your experience with us.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="flex flex-col items-center gap-2 mb-4">
                        <Label className="text-sm font-semibold">Your Rating</Label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-8 h-8 cursor-pointer transition-colors ${
                                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                                    }`}
                                    onClick={() => setRating(star)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fb-name">Name *</Label>
                            <Input
                                id="fb-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fb-designation">Designation</Label>
                            <Input
                                id="fb-designation"
                                value={designation}
                                onChange={(e) => setDesignation(e.target.value)}
                                placeholder="e.g. CEO, Manager"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="fb-company">Company Name</Label>
                        <Input
                            id="fb-company"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Your Company"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label htmlFor="fb-message">Description *</Label>
                            <span className="text-[10px] text-muted-foreground">
                                {message.trim() ? message.trim().split(/\s+/).length : 0} / 150 words
                            </span>
                        </div>
                        <Textarea
                            id="fb-message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Share your experience (max 150 words)..."
                            className="min-h-[100px]"
                            required
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" className="gradient-primary" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Feedback
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
