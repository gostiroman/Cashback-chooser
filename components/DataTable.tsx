import React, { useMemo } from 'react';
import { CashbackEntry } from '../types';
import { Trash2, FileSpreadsheet, Trophy, Info, FileDown } from 'lucide-react';
import { BankConfig } from '../App';

interface DataTableProps {
  data: CashbackEntry[];
  onUpdate: (updatedData: CashbackEntry[]) => void;
  onClear: () => void;
  bankConfigs: Record<string, BankConfig>;
}

export const DataTable: React.FC<DataTableProps> = ({ data, onUpdate, onClear, bankConfigs }) => {
  
  // 1. Process Data: Deduplicate and Normalize
  const { matrix, targetBanks } = useMemo(() => {
    // Determine active banks based on config
    const activeBanks = Object.keys(bankConfigs).filter(b => bankConfigs[b].enabled);

    // Group by Bank -> Category to remove duplicates (keep max %)
    const uniqueEntries = new Map<string, CashbackEntry>();
    
    data.forEach(entry => {
      const normCat = entry.category.trim().toLowerCase();
      let normBank = entry.bankName;
      
      // Normalize Bank Name
      if (normBank.includes('Tinkoff')) normBank = 'T-Bank';
      if (normBank.includes('Сбер')) normBank = 'Sber';
      if (normBank.includes('Альфа')) normBank = 'Alfa';
      if (normBank.includes('ВТБ')) normBank = 'VTB';
      if (normBank.includes('Яндекс')) normBank = 'Yandex';

      const key = `${normBank}|${normCat}`;
      const existing = uniqueEntries.get(key);
      
      if (!existing || entry.percentage > existing.percentage) {
        uniqueEntries.set(key, { ...entry, bankName: normBank, category: entry.category.trim() });
      }
    });

    const cleanData = Array.from(uniqueEntries.values());

    // 2. Select Top N Categories for each Active Bank
    const bankSelections = new Set<string>();
    
    activeBanks.forEach(bank => {
      const bankEntries = cleanData.filter(d => d.bankName === bank);
      // Sort by percentage descending
      bankEntries.sort((a, b) => b.percentage - a.percentage);
      
      const limit = bankConfigs[bank]?.limit || 5;
      
      // Take top N
      bankEntries.slice(0, limit).forEach(entry => {
        bankSelections.add(`${bank}|${entry.category.toLowerCase()}`);
      });
    });

    // 3. Build Matrix Rows (Unique Categories)
    // Only include categories that exist in the active banks
    const relevantData = cleanData.filter(d => activeBanks.includes(d.bankName));
    const allCategories = Array.from(new Set(relevantData.map(d => d.category)));
    allCategories.sort(); 

    // Create a lookup map for the grid
    const matrixMap = new Map<string, number>();
    cleanData.forEach(d => {
      matrixMap.set(`${d.bankName}|${d.category}`, d.percentage);
    });

    return { 
      matrix: allCategories.map(cat => ({
        name: cat,
        values: activeBanks.map(bank => {
          const val = matrixMap.get(`${bank}|${cat}`);
          const isSelected = bankSelections.has(`${bank}|${cat.toLowerCase()}`);
          return { bank, percentage: val, isSelected };
        })
      })),
      targetBanks: activeBanks
    };
  }, [data, bankConfigs]);

  if (data.length === 0) return null;

  const copyToClipboard = () => {
    // Format for Spreadsheets
    const header = `Категория\t${targetBanks.join('\t')}`;
    const rows = matrix.map(row => {
      const vals = row.values.map(v => v.percentage ? `${v.percentage}%` : '').join('\t');
      return `${row.name}\t${vals}`;
    }).join('\n');
    
    navigator.clipboard.writeText(`${header}\n${rows}`);
    alert('Матрица скопирована! Вставьте в Excel/Google Sheets.');
  };

  const downloadCheatSheet = () => {
    const lines = ["📋 ПАМЯТКА ПО КЭШБЭКУ", "====================="];
    const date = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    lines.push(`📅 ${date}\n`);

    matrix.forEach(row => {
        // Find if there is a "Winner" (Selected AND Max among Selected)
        const activeValues = row.values.filter(v => v.isSelected && v.percentage !== undefined);
        const maxActivePercent = activeValues.length > 0 
          ? Math.max(...activeValues.map(v => v.percentage!)) 
          : -1;

        // Find the bank(s) that offer this max percent and are selected
        const winners = row.values.filter(v => v.isSelected && v.percentage === maxActivePercent);

        if (winners.length > 0) {
            const winnerText = winners.map(w => `${w.bank} (${w.percentage}%)`).join(' или ');
            lines.push(`✅ ${row.name}: ${winnerText}`);
        }
    });

    lines.push("\n=====================");
    lines.push("Сгенерировано AI Cashacker");

    const element = document.createElement("a");
    const file = new Blob([lines.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "cashback_pamyatka.txt";
    document.body.appendChild(element); // Required for this to work in FireFox
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full space-y-4">
      
      {/* Control Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
        <div>
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Сводная матрица
          </h2>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-3">
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> Лучший выбор</span>
             <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-900/50 border border-emerald-700"></span> Выбрать</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button
            onClick={downloadCheatSheet}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <FileDown className="w-4 h-4" />
            Скачать памятку
          </button>
          <button
            onClick={copyToClipboard}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Копировать таблицу
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-2 border border-transparent hover:border-red-900/50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 uppercase tracking-wider font-medium text-xs">
                <th className="px-4 py-4 text-left border-b border-r border-slate-800 sticky left-0 bg-slate-950 z-10 w-48 min-w-[180px]">
                  Категория
                </th>
                {targetBanks.map(bank => (
                  <th key={bank} className="px-2 py-4 text-center border-b border-slate-800 min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={bankConfigs[bank].color.split(' ')[0]}>{bank}</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                        Top-{bankConfigs[bank].limit}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {matrix.map((row) => {
                // Find the absolute max percentage among SELECTED cells for this row
                const activeValues = row.values.filter(v => v.isSelected && v.percentage !== undefined);
                const maxActivePercent = activeValues.length > 0 
                  ? Math.max(...activeValues.map(v => v.percentage!)) 
                  : -1;

                return (
                  <tr key={row.name} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-3 font-medium text-slate-300 border-r border-slate-800 sticky left-0 bg-slate-900 group-hover:bg-slate-800/30 transition-colors">
                      {row.name}
                    </td>
                    {row.values.map((cell) => {
                      const hasValue = cell.percentage !== undefined;
                      const isSelected = cell.isSelected;
                      const isWinner = isSelected && cell.percentage === maxActivePercent;
                      
                      let cellClass = "text-slate-700"; // Default
                      
                      if (hasValue) {
                        if (isWinner) {
                          cellClass = "bg-emerald-500/20 text-emerald-400 font-bold border-2 border-emerald-500/50";
                        } else if (isSelected) {
                          cellClass = "bg-emerald-900/10 text-emerald-600 font-medium";
                        } else {
                          cellClass = "text-slate-500 bg-slate-800/40"; 
                        }
                      }

                      return (
                        <td key={cell.bank} className="p-1 border-r border-slate-800/50 last:border-0 align-middle">
                          <div className={`
                            h-10 flex items-center justify-center rounded-md transition-all mx-1
                            ${cellClass}
                          `}>
                            {hasValue ? `${cell.percentage}%` : '-'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="flex items-start gap-2 text-xs text-slate-500 px-2 mt-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Алгоритм выбирает самые высокие проценты для каждого банка в пределах установленного лимита (Top-N). 
          Зеленая рамка указывает на самое выгодное предложение среди выбранных категорий.
        </p>
      </div>
    </div>
  );
};