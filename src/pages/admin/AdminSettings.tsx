import React, { useState, useEffect, useRef } from 'react';
import { Settings, MessageSquare, TestTube, Save, AlertCircle, CheckCircle, Download, Upload, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { AdminLayout } from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';
import { toast } from 'sonner';

interface SystemSettings {
  telegram_bot_token: {
    value: string;
    description: string;
    updated_at: string;
  };
  telegram_chat_id: {
    value: string;
    description: string;
    updated_at: string;
  };
  telegram_enabled: {
    value: string;
    description: string;
    updated_at: string;
  };
}

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_enabled: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getSettings();
      if (response.data.success) {
        const settingsData = response.data.data;
        setSettings(settingsData);
        setFormData({
          telegram_bot_token: settingsData.telegram_bot_token?.value || '',
          telegram_chat_id: settingsData.telegram_chat_id?.value || '',
          telegram_enabled: settingsData.telegram_enabled?.value === 'true'
        });
      } else {
        toast.error('載入設置失敗');
      }
    } catch (error) {
      console.error('載入設置失敗:', error);
      toast.error('載入設置失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const settingsToSave = {
        settings: {
          telegram_bot_token: formData.telegram_bot_token,
          telegram_chat_id: formData.telegram_chat_id,
          telegram_enabled: formData.telegram_enabled.toString()
        }
      };

      console.log('🔧 保存設置:', settingsToSave);
      const response = await adminAPI.updateSettings(settingsToSave);
      console.log('📦 設置保存響應:', response.data);

      if (response.data.success) {
        toast.success('設置保存成功');
        await loadSettings(); // 重新載入設置
      } else {
        toast.error(response.data.message || '設置保存失敗');
      }
    } catch (error: any) {
      console.error('❌ 設置保存失敗:', error);
      const errorMessage = error.response?.data?.message || '設置保存失敗';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    try {
      setTesting(true);
      const response = await adminAPI.testTelegram({});

      if (response.data.success) {
        toast.success('Telegram連接測試成功！請檢查您的聊天室');
      } else {
        toast.error(response.data.message || 'Telegram連接測試失敗');
      }
    } catch (error: any) {
      console.error('Telegram連接測試失敗:', error);
      const errorMessage = error.response?.data?.message || 'Telegram連接測試失敗';
      toast.error(errorMessage);
    } finally {
      setTesting(false);
    }
  };

  const handleExportData = async () => {
    try {
      setExporting(true);
      const response = await adminAPI.exportData();

      // 創建下載連結
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // 生成文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `vjvape-backup-${timestamp}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('數據備份已下載');
    } catch (error: any) {
      console.error('導出數據失敗:', error);
      const errorMessage = error.response?.data?.message || '導出數據失敗';
      toast.error(errorMessage);
    } finally {
      setExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('請選擇 JSON 格式的備份文件');
      return;
    }

    if (!confirm('導入數據將覆蓋現有的所有數據（除管理員用戶外），確定要繼續嗎？')) {
      return;
    }

    try {
      setImporting(true);
      const response = await adminAPI.importData(file);

      if (response.data.success) {
        toast.success('數據導入成功！頁面將重新載入');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error(response.data.message || '數據導入失敗');
      }
    } catch (error: any) {
      console.error('導入數據失敗:', error);
      const errorMessage = error.response?.data?.message || '導入數據失敗';
      toast.error(errorMessage);
    } finally {
      setImporting(false);
      // 清空文件選擇
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vape-purple"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Settings className="h-8 w-8" />
            系統設置
          </h1>
          <p className="text-gray-600 mt-2">管理系統配置和通知設置</p>
        </div>

        {/* Telegram 設置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Telegram 通知設置
            </CardTitle>
            <CardDescription>
              Telegram Bot 配置已移至 Railway 環境變數
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 環境變數說明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">環境變數配置</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    請在 Railway 項目設置中添加以下環境變數：
                  </p>
                  <div className="space-y-2 text-sm font-mono bg-blue-100 p-3 rounded">
                    <div><strong>TELEGRAM_BOT_TOKEN</strong> = 您的 Bot Token</div>
                    <div><strong>TELEGRAM_CHAT_ID</strong> = 您的 Chat ID</div>
                    <div><strong>TELEGRAM_ENABLED</strong> = true</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 測試按鈕 */}
            <div className="flex gap-3">
              <Button
                onClick={handleTestTelegram}
                disabled={testing}
                variant="outline"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? '測試中...' : '測試 Telegram 連接'}
              </Button>
            </div>

            {/* 設置說明 */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-gray-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-gray-700">
                  <p className="font-medium mb-2">如何設置 Telegram Bot：</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>在 Telegram 中搜索 @BotFather</li>
                    <li>發送 /newbot 命令創建新的 Bot</li>
                    <li>按照指示設置 Bot 名稱和用戶名</li>
                    <li>複製獲得的 Bot Token</li>
                    <li>將 Bot 添加到您想接收通知的聊天室</li>
                    <li>使用 @userinfobot 獲取 Chat ID</li>
                    <li>在 Railway 環境變數中設置上述值</li>
                    <li>點擊"測試連接"確認設置正確</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 數據備份管理 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              數據備份管理
            </CardTitle>
            <CardDescription>
              備份和恢復系統數據，防止數據丟失
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 備份說明 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-green-900 mb-2">數據備份功能</h4>
                  <p className="text-sm text-green-700 mb-3">
                    定期備份數據可以防止 Railway 部署時數據丟失。備份包含：
                  </p>
                  <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                    <li>所有商品和規格數據</li>
                    <li>所有訂單和訂單項目</li>
                    <li>公告和系統設置</li>
                    <li>規格類別配置</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 備份操作 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 導出數據 */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">導出數據</h4>
                <p className="text-sm text-gray-600">
                  將所有數據導出為 JSON 文件保存到本地
                </p>
                <Button
                  onClick={handleExportData}
                  disabled={exporting}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? '導出中...' : '導出數據備份'}
                </Button>
              </div>

              {/* 導入數據 */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">導入數據</h4>
                <p className="text-sm text-gray-600">
                  從本地 JSON 備份文件恢復數據
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? '導入中...' : '選擇備份文件導入'}
                </Button>
              </div>
            </div>

            {/* 警告說明 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium mb-2">重要提醒：</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>導入數據會覆蓋現有的所有數據（管理員用戶除外）</li>
                    <li>建議在 Railway 部署前先導出備份</li>
                    <li>導入完成後頁面會自動重新載入</li>
                    <li>備份文件包含敏感信息，請妥善保管</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 保存按鈕 */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                保存中...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                保存設置
              </>
            )}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};
