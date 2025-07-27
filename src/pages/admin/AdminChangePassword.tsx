import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { adminAPI } from '../../services/api';
import { toast } from 'sonner';

export const AdminChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = '請輸入當前密碼';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = '請輸入新密碼';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = '新密碼長度至少6個字符';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '請確認新密碼';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = '新密碼與確認密碼不一致';
    }

    if (formData.currentPassword === formData.newPassword) {
      newErrors.newPassword = '新密碼不能與當前密碼相同';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await adminAPI.changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      );

      if (response.data.success) {
        // 清除token，要求重新登入
        localStorage.removeItem('adminToken');
        toast.success('密碼修改成功，請重新登入');
        navigate('/admin/login');
      } else {
        toast.error(response.data.message || '密碼修改失敗');
      }
    } catch (error: any) {
      console.error('修改密碼錯誤:', error);
      const errorMessage = error.response?.data?.message || '密碼修改失敗';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 清除對應字段的錯誤
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頭部導航 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin')}
                className="mr-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回後台
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">修改密碼</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">修改密碼</h2>
            <p className="text-sm text-gray-600 mt-2">
              為了您的賬號安全，請定期更換密碼
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 當前密碼 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                當前密碼
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                  placeholder="請輸入當前密碼"
                  className={errors.currentPassword ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>
              )}
            </div>

            {/* 新密碼 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                新密碼
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  placeholder="請輸入新密碼（至少6個字符）"
                  className={errors.newPassword ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
              )}
            </div>

            {/* 確認新密碼 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                確認新密碼
              </label>
              <div className="relative">
                <Input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="請再次輸入新密碼"
                  className={errors.confirmPassword ? 'border-red-500' : ''}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            {/* 提交按鈕 */}
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? '修改中...' : '修改密碼'}
            </Button>
          </form>

          {/* 安全提示 */}
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">安全提示</h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• 密碼長度至少6個字符</li>
              <li>• 建議包含字母、數字和特殊字符</li>
              <li>• 不要使用容易猜測的密碼</li>
              <li>• 修改密碼後需要重新登入</li>
            </ul>
          </div>
        </Card>
      </main>
    </div>
  );
};
