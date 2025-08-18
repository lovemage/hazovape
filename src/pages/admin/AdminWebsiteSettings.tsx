import React, { useState, useEffect, useRef } from 'react';
import { Save, Settings, Home, Phone, Mail, Globe, Eye, Truck, Upload, X, Image, Monitor } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AdminLayout } from '../../components/AdminLayout';
import api, { settingsAPI } from '../../services/api';
import { toast } from 'sonner';

export const AdminWebsiteSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      console.log('📋 載入網站設置...');
      const response = await settingsAPI.getAll();
      if (response.data.success) {
        setSettings(response.data.data);
        console.log('✅ 網站設置載入成功:', response.data.data);
      }
    } catch (error) {
      console.error('❌ 載入網站設置失敗:', error);
      toast.error('載入設置失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 保存網站設置...');
      
      const response = await settingsAPI.updateBatch(settings);
      if (response.data.success) {
        toast.success('設置保存成功');
        console.log('✅ 網站設置保存成功');
      }
    } catch (error) {
      console.error('❌ 保存網站設置失敗:', error);
      toast.error('保存設置失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, settingKey: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      toast.error('請選擇圖片檔案');
      return;
    }

    // 檢查檔案大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('圖片大小不能超過 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', settingKey);

      const response = await api.post('/admin/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const imagePath = response.data.data.path;
        handleSettingChange(settingKey, imagePath);
        toast.success('圖片上傳成功');
      } else {
        toast.error(response.data.message || '圖片上傳失敗');
      }
    } catch (error) {
      console.error('上傳圖片失敗:', error);
      toast.error('圖片上傳失敗');
    } finally {
      setUploadingImage(false);
      if (fileInputRefs.current[settingKey]) {
        fileInputRefs.current[settingKey]!.value = '';
      }
    }
  };

  const handleImageDelete = async (settingKey: string) => {
    // 檢查是否有有效的圖片路徑
    const imagePath = settings[settingKey];
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim() === '') {
      console.warn('🚫 無法刪除圖片：路徑為空或無效', { settingKey, imagePath });
      return;
    }

    try {
      console.log('🗑️ 準備刪除圖片:', { settingKey, imagePath });
      
      const response = await api.delete('/admin/delete-image', {
        data: { path: imagePath }
      });

      if (response.data.success) {
        handleSettingChange(settingKey, '');
        toast.success('圖片已刪除');
        console.log('✅ 圖片刪除成功:', settingKey);
      } else {
        toast.error(response.data.message || '刪除圖片失敗');
        console.error('❌ 服務器返回錯誤:', response.data.message);
      }
    } catch (error) {
      console.error('❌ 刪除圖片失敗:', error);
      toast.error('刪除圖片失敗');
    }
  };

  const settingCategories = [
    {
      id: 'homepage',
      title: '首頁設置',
      icon: Home,
      settings: [
        {
          key: 'homepage_hero_enabled',
          label: '啟用 Hero 區域標題',
          description: '是否在首頁 Hero 區域顯示標題和副標題',
          type: 'checkbox'
        },
        {
          key: 'homepage_title',
          label: 'Hero 區域主標題',
          description: '顯示在首頁 Hero 區域的主要標題（需先啟用 Hero 標題）',
          placeholder: '例：Hazo',
          rows: 1
        },
        {
          key: 'homepage_subtitle',
          label: 'Hero 區域副標題',
          description: '顯示在首頁 Hero 區域標題下方的描述文字',
          placeholder: '精選優質茶葉、咖啡豆與手工餅乾，為您帶來最美好的味覺體驗',
          rows: 3
        },
        {
          key: 'hero_background_image',
          label: 'Hero 背景圖片（舊版）',
          description: '首頁 Hero 區域的背景圖片（建議尺寸：1920x1080 或更高）- 僅在未設置輪播圖片時使用',
          type: 'image'
        },
        {
          key: 'hero_image_1',
          label: 'Hero 輪播圖片 1',
          description: 'Hero 區域輪播的第一張圖片（建議尺寸：1920x1080 或更高）',
          type: 'image'
        },
        {
          key: 'hero_image_2',
          label: 'Hero 輪播圖片 2',
          description: 'Hero 區域輪播的第二張圖片（建議尺寸：1920x1080 或更高）',
          type: 'image'
        },
        {
          key: 'hero_image_3',
          label: 'Hero 輪播圖片 3',
          description: 'Hero 區域輪播的第三張圖片（建議尺寸：1920x1080 或更高）',
          type: 'image'
        },
        {
          key: 'homepage_section_enabled',
          label: '啟用標題副標題區塊',
          description: '是否在首頁顯示額外的標題副標題區塊',
          type: 'checkbox'
        },
        {
          key: 'homepage_section_title',
          label: '區塊標題',
          description: '顯示在首頁區塊中的標題（需先啟用區塊）',
          placeholder: '例：品質保證，值得信賴',
          rows: 1
        },
        {
          key: 'homepage_section_subtitle',
          label: '區塊副標題',
          description: '顯示在區塊標題下方的描述文字',
          placeholder: '我們致力於提供最優質的產品和服務',
          rows: 3
        }
      ]
    },
    {
      id: 'popup',
      title: '彈窗廣告設置',
      icon: Image,
      settings: [
        {
          key: 'popup_image',
          label: '首頁彈窗廣告圖片',
          description: '首頁顯示的廣告彈窗圖片（建議尺寸：400x600px）',
          type: 'image'
        },
        {
          key: 'popup_enabled',
          label: '啟用首頁彈窗',
          description: '是否在首頁顯示廣告彈窗',
          type: 'checkbox'
        },
        {
          key: 'order_complete_popup_image',
          label: '訂單完成彈窗圖片',
          description: '訂單完成頁面顯示的廣告彈窗圖片（建議尺寸：400x600px）',
          type: 'image'
        },
        {
          key: 'order_complete_popup_enabled',
          label: '啟用訂單完成彈窗',
          description: '是否在訂單完成頁面顯示廣告彈窗',
          type: 'checkbox'
        }
      ]
    },
    {
      id: 'general',
      title: '一般設置',
      icon: Globe,
      settings: [
        {
          key: 'site_title',
          label: '網站標題',
          description: '網站標題，將顯示在瀏覽器標籤和搜尋結果中',
          placeholder: 'Hazo',
          rows: 1
        },
        {
          key: 'site_description',
          label: '網站描述',
          description: '網站描述，將顯示在搜尋結果和社交媒體分享中',
          placeholder: 'Hazo - 優質產品專賣店，為您提供最佳的購物體驗',
          rows: 2
        }
      ]
    },
    {
      id: 'contact',
      title: '聯絡資訊',
      icon: Phone,
      settings: [
        {
          key: 'contact_phone',
          label: '聯絡電話',
          description: '客服聯絡電話',
          placeholder: '例：0912-345-678',
          rows: 1
        },
        {
          key: 'contact_email',
          label: '聯絡信箱',
          description: '客服聯絡信箱',
          placeholder: '例：service@vjvape.com',
          rows: 1
        },
        {
          key: 'contact_line',
          label: 'LINE 官方帳號',
          description: 'LINE 官方帳號連結，用於首頁和結帳彈窗',
          placeholder: '例：https://line.me/ti/p/@xxxxxxx',
          rows: 1
        },
        {
          key: 'contact_telegram',
          label: 'Telegram 聯絡方式',
          description: 'Telegram 聯絡連結，用於首頁和結帳彈窗',
          placeholder: '例：https://t.me/username',
          rows: 1
        },
        {
          key: 'floating_buttons_enabled',
          label: '啟用懸浮聯繫按鈕',
          description: '是否在首頁右下角顯示 LINE 和 Telegram 懸浮按鈕',
          type: 'checkbox'
        }
      ]
    },
    {
      id: 'shipping',
      title: '運費設置',
      icon: Truck,
      settings: [
        {
          key: 'free_shipping_threshold',
          label: '免運門檻',
          description: '滿多少金額免運費（單位：新台幣）',
          placeholder: '3000',
          rows: 1,
          type: 'number'
        },
        {
          key: 'shipping_fee',
          label: '運費金額',
          description: '未滿免運門檻時的運費（單位：新台幣）',
          placeholder: '60',
          rows: 1,
          type: 'number'
        }
      ]
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vape-purple"></div>
          <span className="ml-3 text-gray-600">載入設置中...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
                          <Globe className="w-8 h-8 text-vape-purple" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">網站設置</h1>
              <p className="text-gray-600">管理網站的基本設置和內容</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Monitor className="w-4 h-4" />
              <span>{showPreview ? '隱藏預覽' : '首頁預覽'}</span>
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? '保存中...' : '保存設置'}</span>
            </Button>
          </div>
        </div>

        {/* 設置分類 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {settingCategories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <category.icon className="w-5 h-5 text-blue-600" />
                  <span>{category.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.settings.map((setting) => (
                  <div key={setting.key} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {setting.label}
                    </label>
                    {setting.type === 'image' ? (
                      <div className="space-y-2">
                        {settings[setting.key] ? (
                          <div className="relative">
                            <img
                              src={settings[setting.key]}
                              alt="廣告圖片預覽"
                              className="w-full max-w-xs h-auto rounded-lg border border-gray-300"
                            />
                            <button
                              onClick={() => handleImageDelete(setting.key)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                              title="刪除圖片"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <Image className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">尚未上傳圖片</p>
                          </div>
                        )}
                        <input
                          ref={(el) => {
                            if (el) fileInputRefs.current[setting.key] = el;
                          }}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, setting.key)}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          onClick={() => fileInputRefs.current[setting.key]?.click()}
                          disabled={uploadingImage}
                          variant="outline"
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingImage ? '上傳中...' : '上傳圖片'}
                        </Button>
                      </div>
                    ) : setting.type === 'checkbox' ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={setting.key}
                          checked={settings[setting.key] === 'true' || settings[setting.key] === true}
                          onChange={(e) => handleSettingChange(setting.key, e.target.checked ? 'true' : 'false')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={setting.key} className="ml-2 text-sm text-gray-700">
                          啟用
                        </label>
                      </div>
                    ) : setting.type === 'number' ? (
                      <input
                        type="number"
                        value={settings[setting.key] || ''}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        placeholder={setting.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="1"
                      />
                    ) : (
                      <textarea
                        value={settings[setting.key] || ''}
                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                        placeholder={setting.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={setting.rows}
                      />
                    )}
                    <p className="text-xs text-gray-500">{setting.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 預覽區域 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-green-600" />
              <span>首頁預覽</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                歡迎來到{' '}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {settings.site_title || 'Hazo'}
                </span>
              </h2>
              {settings.homepage_subtitle && (
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {settings.homepage_subtitle}
                </p>
              )}
              {(settings.contact_phone || settings.contact_email) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">聯絡資訊</p>
                  <div className="flex justify-center space-x-6 text-sm text-gray-600">
                    {settings.contact_phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="w-4 h-4" />
                        <span>{settings.contact_phone}</span>
                      </div>
                    )}
                    {settings.contact_email && (
                      <div className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{settings.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 保存提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">設置說明</h3>
              <p className="text-sm text-blue-700 mt-1">
                修改設置後請點擊「保存設置」按鈕，設置將立即生效並在前端頁面中顯示。首頁副標題的變更會即時反映在首頁上。
              </p>
            </div>
          </div>
        </div>

        {/* 首頁預覽 */}
        {showPreview && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-blue-600" />
                <span>首頁預覽</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-900 rounded-lg p-8 text-center">
                {/* 模擬首頁 Hero 區域 */}
                <div 
                  className="relative min-h-[400px] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex flex-col justify-center items-center text-white"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${settings.hero_background_image || '/images/seep-vape-hero.png'}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="text-center max-w-2xl px-4">
                    {/* Hero 區域標題（僅在啟用時顯示） */}
                    {(settings.homepage_hero_enabled === 'true' || settings.homepage_hero_enabled === true) && (
                      <>
                        {/* 主標題 */}
                        {settings.homepage_title && (
                          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
                            {settings.homepage_title}
                          </h1>
                        )}
                        
                        {/* 副標題 */}
                        {settings.homepage_subtitle && (
                          <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
                            {settings.homepage_subtitle}
                          </p>
                        )}
                      </>
                    )}
                    
                    {/* 如果未啟用 Hero 標題，顯示提示 */}
                    {!(settings.homepage_hero_enabled === 'true' || settings.homepage_hero_enabled === true) && (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg">
                          Hero 區域標題未啟用
                        </p>
                        <p className="text-gray-500 text-sm mt-2">
                          請在左側設置中啟用「Hero 區域標題」來顯示標題和副標題
                        </p>
                      </div>
                    )}
                    
                    {/* 模擬按鈕 */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <div className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold">
                        開始選購
                      </div>
                      <div className="bg-white/20 backdrop-blur-lg border-2 border-white/30 text-white px-8 py-3 rounded-full font-bold">
                        加入官方Line
                      </div>
                    </div>
                  </div>
                  
                  {/* 預覽標記 */}
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    預覽模式
                  </div>
                </div>
                
                                 {/* 標題副標題區塊預覽 */}
                 {(settings.homepage_section_enabled === 'true' || settings.homepage_section_enabled === true) && (
                   <div className="mt-8 py-12 bg-white rounded-lg border-t border-gray-200">
                     <div className="text-center max-w-4xl mx-auto px-6">
                       {settings.homepage_section_title && (
                         <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                           {settings.homepage_section_title}
                         </h2>
                       )}
                       {settings.homepage_section_subtitle && (
                         <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                           {settings.homepage_section_subtitle}
                         </p>
                       )}
                       {!settings.homepage_section_title && !settings.homepage_section_subtitle && (
                         <p className="text-gray-400 text-lg">
                           區塊已啟用，但未設置標題和副標題
                         </p>
                       )}
                     </div>
                   </div>
                 )}
                 
                 {/* 預覽說明 */}
                 <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                   <p className="text-sm text-blue-800">
                     <strong>預覽說明：</strong>這是首頁的預覽效果。包含 Hero 區域和標題副標題區塊（如果啟用）。實際頁面可能因為 CSS 樣式、響應式設計等因素略有不同。
                   </p>
                 </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};
