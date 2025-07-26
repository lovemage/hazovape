import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { announcementAPI } from '../services/api';
import { toast } from 'sonner';

interface Announcement {
  id?: number;
  title: string;
  content: string;
  priority: number;
  is_active: boolean;
}

interface AnnouncementFormProps {
  announcement?: Announcement;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  announcement,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 5,
    is_active: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        priority: announcement.priority || 5,
        is_active: announcement.is_active ?? true
      });
    } else {
      setFormData({
        title: '',
        content: '',
        priority: 5,
        is_active: true
      });
    }
  }, [announcement, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('請填寫完整的公告信息');
      return;
    }

    setLoading(true);
    
    try {
      if (announcement?.id) {
        await announcementAPI.update(announcement.id, formData);
        toast.success('公告更新成功');
      } else {
        await announcementAPI.create(formData);
        toast.success('公告創建成功');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('保存公告失敗:', error);
      const errorMessage = error.response?.data?.message || '保存公告失敗';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {announcement ? '編輯公告' : '新增公告'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <Label htmlFor="title">公告標題 *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="請輸入公告標題"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">公告內容 *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="請輸入公告內容"
              rows={6}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">優先級</Label>
              <Select 
                value={formData.priority.toString()} 
                onValueChange={(value) => handleInputChange('priority', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇優先級" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - 最低</SelectItem>
                  <SelectItem value="2">2 - 低</SelectItem>
                  <SelectItem value="3">3 - 低</SelectItem>
                  <SelectItem value="4">4 - 低</SelectItem>
                  <SelectItem value="5">5 - 中等</SelectItem>
                  <SelectItem value="6">6 - 中等</SelectItem>
                  <SelectItem value="7">7 - 中等</SelectItem>
                  <SelectItem value="8">8 - 高</SelectItem>
                  <SelectItem value="9">9 - 高</SelectItem>
                  <SelectItem value="10">10 - 最高</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                數字越大優先級越高
              </p>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">啟用公告</Label>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">優先級說明：</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>• 1-4: 低優先級 - 一般信息</p>
              <p>• 5-7: 中等優先級 - 重要通知</p>
              <p>• 8-10: 高優先級 - 緊急公告</p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : (announcement ? '更新公告' : '創建公告')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
