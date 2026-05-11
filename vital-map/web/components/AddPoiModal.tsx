'use client';

import { useState, FormEvent } from 'react';
import { X, MapPin } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CATEGORIES = [
  { value: 'community', label: 'Community' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'farm', label: 'Farm' },
  { value: 'healer', label: 'Healer' },
  { value: 'event', label: 'Event' },
] as const;

interface AddPoiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddPoiModal({ isOpen, onClose, onSuccess }: AddPoiModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('community');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setCategory('community');
    setDescription('');
    setAddress('');
    setWebsiteUrl('');
    setPhoneNumber('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/submit-poi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category,
          description,
          address,
          website_url: websiteUrl || undefined,
          phone_number: phoneNumber || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        return;
      }

      setSuccess(true);
      onSuccess?.();
      setTimeout(() => handleClose(), 1500);
    } catch {
      setError('Network error — please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 transition-colors';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <Card
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--tp-card)' }}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: 'var(--tp-primary)' }} />
            <h2 className="text-base font-semibold" style={{ color: 'var(--tp-text)' }}>
              Add a Location
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-md p-1 transition-colors hover:opacity-70"
            aria-label="Close"
          >
            <X className="h-4 w-4" style={{ color: 'var(--tp-muted)' }} />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-3">
            {success ? (
              <p className="text-sm text-center py-4" style={{ color: 'var(--tp-primary)' }}>
                Location added! Thank you.
              </p>
            ) : (
              <>
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    Name <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Eastside Community Garden"
                    className={inputClass}
                    style={{
                      borderColor: 'var(--tp-muted)',
                      color: 'var(--tp-text)',
                      backgroundColor: 'var(--tp-light)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    Category <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                    style={{
                      borderColor: 'var(--tp-muted)',
                      color: 'var(--tp-text)',
                      backgroundColor: 'var(--tp-light)',
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    Description <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="What does this place offer?"
                    className={`${inputClass} resize-none`}
                    style={{
                      borderColor: 'var(--tp-muted)',
                      color: 'var(--tp-text)',
                      backgroundColor: 'var(--tp-light)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    Address <span style={{ color: 'var(--tp-primary)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="e.g. 123 Main St, Los Angeles, CA"
                    className={inputClass}
                    style={{
                      borderColor: 'var(--tp-muted)',
                      color: 'var(--tp-text)',
                      backgroundColor: 'var(--tp-light)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    Website{' '}
                    <span className="text-xs font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                    style={{
                      borderColor: 'var(--tp-muted)',
                      color: 'var(--tp-text)',
                      backgroundColor: 'var(--tp-light)',
                    }}
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--tp-text)' }}
                  >
                    Phone <span className="text-xs font-normal opacity-60">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 000-0000"
                    className={inputClass}
                    style={{
                      borderColor: 'var(--tp-muted)',
                      color: 'var(--tp-text)',
                      backgroundColor: 'var(--tp-light)',
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs rounded-md px-3 py-2 bg-red-50 text-red-600 border border-red-200">
                    {error}
                  </p>
                )}
              </>
            )}
          </CardContent>

          {!success && (
            <CardFooter className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{ color: 'var(--tp-muted)' }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 text-white"
                disabled={isSubmitting}
                style={{ backgroundColor: 'var(--tp-primary)' }}
              >
                {isSubmitting ? 'Checking address…' : 'Add Location'}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
