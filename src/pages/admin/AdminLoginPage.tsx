import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { adminAPI } from '../../services/api';
import { toast } from 'sonner';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      toast.error('請填寫用戶名和密碼');
      return;
    }

    setLoading(true);

    try {
      const response = await adminAPI.login(credentials.username, credentials.password);

      if (response.data.success) {
        // 保存 token
        localStorage.setItem('adminToken', response.data.data.token);
        localStorage.setItem('adminUser', JSON.stringify(response.data.data.admin));

        toast.success('登入成功！');
        navigate('/admin/dashboard');
      } else {
        toast.error(response.data.message || '登入失敗');
      }
    } catch (error: any) {
      console.error('登入失敗:', error);
      toast.error(error.response?.data?.message || '登入失敗，請檢查用戶名和密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-vape-darker via-vape-dark to-slate-900 flex items-center justify-center p-4">
      {/* 背景裝飾 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-vape-cyan/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-vape-purple/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-vape-pink/20 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* 返回按鈕 */}
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回首頁
      </Button>

      {/* 登入表單 */}
      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* 頭部 */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <img 
                src="/hazo-png.png" 
                alt="Hazo Logo" 
                className="w-16 h-16 rounded-lg object-cover"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">管理員登入</h1>
            <p className="text-gray-600">請輸入您的管理員帳號密碼</p>
          </div>

          {/* 表單 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 用戶名 */}
            <div>
              <Label htmlFor="username" className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                用戶名
              </Label>
              <Input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="請輸入用戶名"
                className="h-12"
                autoComplete="username"
              />
            </div>

            {/* 密碼 */}
            <div>
              <Label htmlFor="password" className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4" />
                密碼
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={credentials.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="請輸入密碼"
                  className="h-12 pr-12"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* 登入按鈕 */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  登入中...
                </div>
              ) : (
                '登入'
              )}
            </Button>
          </form>
        </div>

        {/* 裝飾元素 */}
        <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-200 rounded-full opacity-60"></div>
        <div className="absolute -bottom-4 -right-4 w-6 h-6 bg-indigo-200 rounded-full opacity-60"></div>
        <div className="absolute top-8 -right-2 w-4 h-4 bg-slate-200 rounded-full opacity-60"></div>
      </div>
    </div>
  );
};
