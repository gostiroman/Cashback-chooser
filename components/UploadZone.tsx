import React, { useRef, useState } from 'react';
import { Upload, FileImage } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file: File) => file.type.startsWith('image/'));
      onFilesSelected(files);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter((file: File) => file.type.startsWith('image/'));
      onFilesSelected(files);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
        ${isDragging 
          ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]' 
          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        accept="image/*"
        multiple
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className={`p-4 rounded-full ${isDragging ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
          {isDragging ? (
            <FileImage className="w-8 h-8 text-emerald-400" />
          ) : (
            <Upload className="w-8 h-8 text-slate-400" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium text-slate-200">
            {isDragging ? 'Отпустите файлы здесь' : 'Загрузите скриншоты'}
          </p>
          <p className="text-sm text-slate-400">
            Перетащите файлы или кликните для выбора (PNG, JPG)
          </p>
        </div>
      </div>
    </div>
  );
};