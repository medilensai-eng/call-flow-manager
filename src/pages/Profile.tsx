import React, { useState, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { User, Mail, Phone, CreditCard, MapPin, Lock, Save, Building2, Upload, Camera } from 'lucide-react';

const Profile = () => {
  const { profile, user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    email: profile?.email || '',
    phone: profile?.phone || '',
    bank_name: (profile as any)?.bank_name || '',
    ifsc_code: (profile as any)?.ifsc_code || '',
    bank_account_number: profile?.bank_account_number || '',
    pan_number: (profile as any)?.pan_number || '',
    address: profile?.address || '',
  });

  const [photoUrl, setPhotoUrl] = useState<string | null>((profile as any)?.photo_url || null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setIsUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(filePath);

      // Update profile with photo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setPhotoUrl(publicUrl);
      toast.success('Photo uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsSaving(true);
    
    const { error } = await supabase
      .from('profiles')
      .update({
        email: formData.email,
        phone: formData.phone,
        bank_name: formData.bank_name,
        ifsc_code: formData.ifsc_code,
        bank_account_number: formData.bank_account_number,
        pan_number: formData.pan_number,
        address: formData.address,
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    }
    
    setIsSaving(false);
  };

  return (
    <DashboardLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal information & KYC details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card with Photo */}
          <Card className="shadow-card lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {/* Photo Upload Section */}
                <div className="relative group">
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Profile" 
                      className="w-28 h-28 rounded-full object-cover border-4 border-primary/20"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-14 h-14 text-primary" />
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {isUploadingPhoto ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Click to update photo</p>
                
                <h2 className="text-xl font-semibold font-display mt-3">{profile?.full_name}</h2>
                <p className="text-muted-foreground text-sm">{profile?.employee_id}</p>
                <div className="mt-4 w-full space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                    <Mail className="w-4 h-4" />
                    <span>{profile?.email}</span>
                  </div>
                  {profile?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="shadow-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-display">Personal & KYC Information</CardTitle>
                <CardDescription>Update your personal and bank details</CardDescription>
              </div>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name - Read Only */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Full Name
                  </Label>
                  <Input value={profile?.full_name || ''} disabled className="bg-muted" />
                </div>

                {/* Employee ID - Read Only */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    Employee ID
                  </Label>
                  <Input value={profile?.employee_id || ''} disabled className="bg-muted" />
                </div>

                {/* Email - Editable */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                </div>

                {/* Phone - Editable */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone Number
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                </div>

                {/* Aadhaar - Non-editable */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    Aadhaar Number
                    <span className="text-xs text-destructive">(Cannot be edited)</span>
                  </Label>
                  <Input 
                    value={profile?.aadhaar_number || 'Not provided'} 
                    disabled 
                    className="bg-muted" 
                  />
                </div>

                {/* PAN Number - Editable */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                    PAN Number
                  </Label>
                  <Input
                    value={formData.pan_number}
                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                    disabled={!isEditing}
                    placeholder="ABCDE1234F"
                    className={!isEditing ? 'bg-muted' : ''}
                  />
                </div>
              </div>

              {/* Bank Details Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Bank Account Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bank Name */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      Bank Name
                    </Label>
                    <Input
                      value={formData.bank_name}
                      onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                      disabled={!isEditing}
                      placeholder="e.g., State Bank of India"
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  </div>

                  {/* IFSC Code */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      IFSC Code
                    </Label>
                    <Input
                      value={formData.ifsc_code}
                      onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                      disabled={!isEditing}
                      placeholder="e.g., SBIN0001234"
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  </div>

                  {/* Bank Account Number */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                      Bank Account Number
                    </Label>
                    <Input
                      value={formData.bank_account_number}
                      onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your bank account number"
                      className={!isEditing ? 'bg-muted' : ''}
                    />
                  </div>
                </div>
              </div>

              {/* Address - Editable */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Address
                </Label>
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-muted' : ''}
                  rows={3}
                />
              </div>

              {isEditing && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving}>
                    <Save className="w-4 h-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </DashboardLayout>
  );
};

export default Profile;