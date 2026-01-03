import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { DataTable } from './components/DataTable';
import { parseCashbackScreenshot, parseUserContext, refineDataWithContext } from './services/geminiService';
import { CashbackEntry, ProcessingStatus } from './types';
import { Sparkles, Loader2, CreditCard, Settings2, MessageSquarePlus, Wand2 } from 'lucide-react';

export interface BankConfig {
  enabled: boolean;
  limit: number;
  color: string;
}

const DEFAULT_CONFIGS: Record<string, BankConfig> = {
  'Sber': { enabled: true, limit: 5, color: 'text-green-400 border-green-500/30' },
  'T-Bank': { enabled: true, limit: 4, color: 'text-yellow-400 border-yellow-500/30' },
  'Alfa': { enabled: true, limit: 5, color: 'text-red-400 border-red-500/30' },
  'VTB': { enabled: true, limit: 4, color: 'text-blue-400 border-blue-500/30' },
  'Yandex': { enabled: true, limit: 5, color: 'text-amber-400 border-amber-500/30' },
};

const App: React.FC = () => {
  const [data, setData] = useState<CashbackEntry[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>({
    total: 0,
    processed: 0,
    isProcessing: false
  });
  
  // Settings State
  const [bankConfigs, setBankConfigs] = useState<Record<string, BankConfig>>(DEFAULT_CONFIGS);
  const [userComment, setUserComment] = useState<string>("");
  const [refinementComment, setRefinementComment] = useState<string>("");
  const [showSettings, setShowSettings] = useState(true);
  const [isRefining, setIsRefining] = useState(false);

  const toggleBank = (bank: string) => {
    setBankConfigs(prev => ({
      ...prev,
      [bank]: { ...prev[bank], enabled: !prev[bank].enabled }
    }));
  };

  const updateLimit = (bank: string, newLimit: string) => {
    const num = parseInt(newLimit);
    if (!isNaN(num) && num >= 0) {
      setBankConfigs(prev => ({
        ...prev,
        [bank]: { ...prev[bank], limit: num }
      }));
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setStatus({ total: files.length, processed: 0, isProcessing: true, error: undefined });
    
    let newEntries: CashbackEntry[] = [];
    
    // 1. Process Text Context First (if any)
    if (userComment.trim()) {
      try {
        const contextEntries = await parseUserContext(userComment);
        newEntries = [...newEntries, ...contextEntries];
      } catch (err) {
        console.error("Context parsing failed", err);
      }
    }

    // 2. Process Files
    for (let i = 0; i < files.length; i++) {
      try {
        const entries = await parseCashbackScreenshot(files[i]);
        newEntries = [...newEntries, ...entries];
        setStatus(prev => ({ ...prev, processed: prev.processed + 1 }));
      } catch (error) {
        console.error(`Failed to process file ${files[i].name}`, error);
        setStatus(prev => ({ ...prev, error: `Ошибка при обработке файла ${files[i].name}. Попробуйте еще раз.` }));
      }
    }

    setData(prev => [...prev, ...newEntries]);
    setStatus(prev => ({ ...prev, isProcessing: false }));
  };

  const handleRefineData = async () => {
    if (!refinementComment.trim() || data.length === 0) return;
    
    setIsRefining(true);
    try {
      const updatedData = await refineDataWithContext(data, refinementComment);
      setData(updatedData);
      setRefinementComment(""); // Clear comment on success
    } catch (error) {
      console.error("Refinement failed", error);
      alert("Не удалось обновить данные. Попробуйте переформулировать запрос.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpdateData = (newData: CashbackEntry[]) => {
    setData(newData);
  };

  const handleClearData = () => {
    if (confirm('Вы уверены? Все распознанные данные будут удалены.')) {
      setData([]);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-6">
        
        {/* Header */}
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 mb-4">
            <CreditCard className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Анализатор Кэшбэка
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Умный помощник для выбора категорий в Сбер, Т-Банк, Альфа, ВТБ и Яндекс
          </p>
        </header>

        {/* Configuration Panel */}
        <section className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden transition-all">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/50"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <Settings2 className="w-5 h-5 text-emerald-400" />
              Настройки банков и лимиты
            </div>
            <span className="text-xs text-slate-500">{showSettings ? 'Свернуть' : 'Развернуть'}</span>
          </div>
          
          {showSettings && (
            <div className="p-4 pt-0 border-t border-slate-800/50 grid gap-4">
              <div className="flex flex-wrap gap-3 mt-4 justify-center sm:justify-start">
                {(Object.entries(bankConfigs) as [string, BankConfig][]).map(([bank, config]) => (
                  <div 
                    key={bank}
                    className={`
                      flex items-center gap-2 p-2 rounded-lg border transition-all select-none
                      ${config.enabled 
                        ? `bg-slate-800 ${config.color.replace('text-', 'border-')}` 
                        : 'bg-slate-900/50 border-slate-800 opacity-60'}
                    `}
                  >
                    <input 
                      type="checkbox" 
                      checked={config.enabled}
                      onChange={() => toggleBank(bank)}
                      className="w-4 h-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500/20 bg-slate-700"
                    />
                    <span className={`text-sm font-medium ${config.enabled ? 'text-slate-200' : 'text-slate-500'}`}>
                      {bank}
                    </span>
                    {config.enabled && (
                      <div className="flex items-center gap-1 ml-1 bg-slate-900 rounded px-1.5 py-0.5 border border-slate-700">
                        <span className="text-[10px] text-slate-500">TOP</span>
                        <input 
                          type="number" 
                          min="1" 
                          max="10"
                          value={config.limit}
                          onChange={(e) => updateLimit(bank, e.target.value)}
                          className="w-8 bg-transparent text-center text-xs text-emerald-400 font-bold focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Processing Area */}
        <section className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 ml-1">1. Загрузка скриншотов</h3>
            <UploadZone 
              onFilesSelected={handleFilesSelected} 
              disabled={status.isProcessing || isRefining} 
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 ml-1 flex items-center gap-2">
              2. Уточнения и комментарии 
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">Опционально</span>
            </h3>
            <div className="h-full relative">
              <textarea 
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="Например: 'В этом месяце мне нужен кэшбэк на Такси' или 'У Сбера есть скрытая категория Цветы 10%'"
                className="w-full h-[180px] bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none resize-none placeholder:text-slate-600"
                disabled={status.isProcessing || isRefining}
              />
              <div className="absolute bottom-3 right-3 text-slate-600">
                <MessageSquarePlus className="w-5 h-5" />
              </div>
            </div>
          </div>
        </section>
        
        {/* Progress Bar */}
        {(status.isProcessing || isRefining) && (
          <div className="bg-slate-800 rounded-lg p-4 flex items-center gap-4 border border-slate-700 animate-pulse">
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-200">
                  {isRefining ? 'Внесение изменений в таблицу...' : 'Анализ изображений и контекста...'}
                </span>
                {!isRefining && <span className="text-emerald-400">{Math.round((status.processed / status.total) * 100)}%</span>}
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                  style={{ width: isRefining ? '100%' : `${(status.processed / status.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        {status.error && (
          <div className="p-4 bg-red-900/20 border border-red-900/50 text-red-300 rounded-lg text-sm text-center">
            {status.error}
          </div>
        )}

        {/* Results Section */}
        <section>
          {data.length > 0 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
              <DataTable 
                data={data} 
                onUpdate={handleUpdateData} 
                onClear={handleClearData}
                bankConfigs={bankConfigs}
              />
              
              {/* Refinement Block */}
              <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                  <h3 className="text-lg font-medium text-slate-200 mb-2 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-400" />
                    Корректировка результатов
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">
                    Если в таблице есть ошибки или вы хотите изменить выбор, напишите здесь. 
                    Например: "Измени % в Сбере на Такси на 10" или "Удали категорию Цветы".
                  </p>
                  <textarea 
                    value={refinementComment}
                    onChange={(e) => setRefinementComment(e.target.value)}
                    placeholder="Ваш комментарий для ИИ..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 focus:outline-none min-h-[80px]"
                  />
                </div>
                <div className="sm:mt-12">
                   <button 
                    onClick={handleRefineData}
                    disabled={isRefining || !refinementComment.trim()}
                    className="whitespace-nowrap px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-purple-900/20"
                   >
                     {isRefining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                     Применить правки
                   </button>
                </div>
              </div>
            </div>
          ) : (
            !status.isProcessing && !isRefining && (
              <div className="text-center py-8 border border-slate-800 rounded-xl bg-slate-900/30 border-dashed">
                <Sparkles className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">
                  Загрузите скриншоты, чтобы увидеть сводную таблицу
                </p>
              </div>
            )
          )}
        </section>

        <footer className="text-center text-slate-700 text-xs py-4">
          Powered by Google Gemini 2.0 Flash
        </footer>
      </div>
    </div>
  );
};

export default App;