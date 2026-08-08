import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/src/context/AuthContext';
import { useAppData } from '@/src/context/AppDataContext';
import { Save, User, Lock, Store, Upload } from 'lucide-react';

export default function Settings() {
  const { changePassword } = useAuth();
  const { businessProfile, updateBusinessProfile } = useAppData();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    businessName: businessProfile.name,
    phone: businessProfile.phone,
    address: businessProfile.address,
    description: businessProfile.description || '',
    logo: businessProfile.logo
  });

  useEffect(() => {
    setProfile({
      businessName: businessProfile.name,
      phone: businessProfile.phone,
      address: businessProfile.address,
      description: businessProfile.description || '',
      logo: businessProfile.logo
    });
  }, [businessProfile]);

  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBusinessProfile({
      name: profile.businessName,
      phone: profile.phone,
      address: profile.address,
      description: profile.description,
      logo: profile.logo
    });
    alert('تم حفظ البيانات بنجاح!');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, logo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (security.newPassword !== security.confirmPassword) {
      alert('كلمة المرور الجديدة غير متطابقة!');
      return;
    }
    const result = await changePassword(security.currentPassword, security.newPassword);
    if (!result.success) {
      alert(result.error || 'حدث خطأ أثناء تغيير كلمة المرور!');
      return;
    }
    alert('تم تغيير كلمة المرور بنجاح!');
    setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E293B]">الإعدادات</h2>
        <p className="mt-1 text-sm text-[#475569]">إدارة بيانات النظام وحسابات المستخدمين</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex overflow-hidden">
        
        {/* Sidebar for settings tabs */}
        <div className="w-64 bg-[#F8FAFC] border-l border-[#E2E8F0] p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors cursor-pointer ${activeTab === 'profile' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#475569] hover:bg-[#E2E8F0]'}`}
          >
            <Store className="w-5 h-5" />
            بيانات النظام
          </button>
          
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-colors cursor-pointer ${activeTab === 'security' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'text-[#475569] hover:bg-[#E2E8F0]'}`}
          >
            <Lock className="w-5 h-5" />
            تغيير كلمة المرور
          </button>
        </div>

        {/* Setting Content */}
        <div className="flex-1 p-8">
          
          {activeTab === 'profile' && (
            <div className="max-w-xl">
               <h3 className="text-lg font-bold text-[#1E293B] mb-6 border-b border-[#E2E8F0] pb-2">تفاصيل واسم النظام</h3>
               <form onSubmit={handleProfileSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">اسم النظام</label>
                    <input 
                      type="text" required
                      value={profile.businessName}
                      onChange={e => setProfile({...profile, businessName: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">رقم هاتف النظام للتواصل</label>
                    <input 
                      type="tel" required
                      value={profile.phone}
                      onChange={e => setProfile({...profile, phone: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">العنوان</label>
                    <input 
                      type="text" required
                      value={profile.address}
                      onChange={e => setProfile({...profile, address: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">السلوجان / وصف النظام (يظهر في صفحة تسجيل الدخول)</label>
                    <input 
                      type="text" required
                      value={profile.description}
                      onChange={e => setProfile({...profile, description: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">الشعار (اللوجو)</label>
                    <div className="mt-2 flex items-center gap-4">
                      {profile.logo ? (
                        <div className="w-16 h-16 rounded-xl border border-[#E2E8F0] overflow-hidden flex items-center justify-center bg-white">
                          <img src={profile.logo} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] flex flex-col justify-center items-center text-[#94A3B8]">
                           <Store className="w-6 h-6" />
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleLogoChange} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      
                      <button 
                        type="button" 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-lg text-sm font-bold text-[#475569] hover:bg-[#F8FAFC]"
                      >
                        <Upload className="w-4 h-4" />
                        تغيير اللوجو
                      </button>
                      
                      {profile.logo && (
                        <button 
                          type="button" 
                          onClick={() => setProfile(prev => ({ ...prev, logo: null }))}
                          className="px-4 py-2 text-sm font-bold text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors border border-transparent hover:border-[#FECACA]"
                        >
                          إزالة
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-6">
                    <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-[#2563EB] text-white rounded-lg font-bold hover:bg-[#1D4ED8] transition-colors">
                      <Save className="w-4 h-4" />
                      حفظ التغييرات
                    </button>
                  </div>
               </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-xl">
               <h3 className="text-lg font-bold text-[#1E293B] mb-6 border-b border-[#E2E8F0] pb-2">كلمة المرور والأمان</h3>
               <form onSubmit={handleSecuritySubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">كلمة المرور الحالية</label>
                    <input 
                      type="password" required
                      value={security.currentPassword}
                      onChange={e => setSecurity({...security, currentPassword: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">كلمة المرور الجديدة</label>
                    <input 
                      type="password" required minLength={6}
                      value={security.newPassword}
                      onChange={e => setSecurity({...security, newPassword: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">تأكيد كلمة المرور الجديدة</label>
                    <input 
                      type="password" required minLength={6}
                      value={security.confirmPassword}
                      onChange={e => setSecurity({...security, confirmPassword: e.target.value})}
                      className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                      dir="ltr"
                    />
                  </div>

                  <div className="pt-6">
                    <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-[#2563EB] text-white rounded-lg font-bold hover:bg-[#1D4ED8] transition-colors">
                      <Save className="w-4 h-4" />
                      تحديث كلمة المرور
                    </button>
                  </div>
               </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
