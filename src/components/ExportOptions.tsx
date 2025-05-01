import { useState } from 'react';
import { Download, FileText, FileJson, File as FilePdf, Loader, Check, AlertCircle } from 'lucide-react';
import { generateCSV, generateJSON } from '../services/youtubeService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Video {
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  engagement_rate: number;
  views_per_day: number;
  duration_seconds: number;
  duration_formatted: string;
  published_at: string;
  thumbnail_url: string;
}

interface ExportOptionsProps {
  videos: Video[];
  channelTitle: string;
}

const ExportOptions = ({ videos, channelTitle }: ExportOptionsProps) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  
  const handleExportCSV = async () => {
    setIsExporting('csv');
    setExportSuccess(null);
    setExportError(null);
    
    try {
      const csvContent = generateCSV(videos);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${formatFilename(channelTitle)}_videos.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportSuccess('csv');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setExportSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      setExportError('csv');
      
      // Auto-clear error message after 3 seconds
      setTimeout(() => {
        setExportError(null);
      }, 3000);
    } finally {
      setIsExporting(null);
    }
  };
  
  const handleExportJSON = async () => {
    setIsExporting('json');
    setExportSuccess(null);
    setExportError(null);
    
    try {
      const jsonContent = generateJSON(videos);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${formatFilename(channelTitle)}_videos.json`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportSuccess('json');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setExportSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Erro ao exportar JSON:', error);
      setExportError('json');
      
      // Auto-clear error message after 3 seconds
      setTimeout(() => {
        setExportError(null);
      }, 3000);
    } finally {
      setIsExporting(null);
    }
  };
  
  const handleExportPDF = async () => {
    setIsExporting('pdf');
    setExportSuccess(null);
    setExportError(null);
    
    try {
      const doc = new jsPDF();
      
      // Adiciona título
      doc.setFontSize(16);
      doc.text(`Análise de Canal do YouTube: ${channelTitle}`, 14, 22);
      
      // Adiciona data
      doc.setFontSize(10);
      const today = new Date();
      const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
      doc.text(`Gerado em: ${formattedDate}`, 14, 30);
      
      // Adiciona resumo
      doc.setFontSize(12);
      doc.text(`Total de Vídeos Analisados: ${videos.length}`, 14, 40);
      
      // Prepara dados da tabela
      const tableData = videos.map(video => [
        video.title.length > 30 ? video.title.substring(0, 30) + '...' : video.title,
        formatNumber(video.view_count),
        formatNumber(video.like_count),
        formatNumber(video.comment_count),
        (video.engagement_rate * 100).toFixed(2) + '%',
        video.duration_formatted,
        new Date(video.published_at).toLocaleDateString('pt-BR')
      ]);
      
      // Cria tabela
      autoTable(doc, {
        head: [['Título', 'Visualizações', 'Curtidas', 'Comentários', 'Engajamento', 'Duração', 'Publicado']],
        body: tableData,
        startY: 50,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Salva PDF
      doc.save(`${formatFilename(channelTitle)}_analise.pdf`);
      
      setExportSuccess('pdf');
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => {
        setExportSuccess(null);
      }, 3000);
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      setExportError('pdf');
      
      // Auto-clear error message after 3 seconds
      setTimeout(() => {
        setExportError(null);
      }, 3000);
    } finally {
      setIsExporting(null);
    }
  };
  
  // Função auxiliar para formatar nome de arquivo
  const formatFilename = (text: string): string => {
    return text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/gi, '')  // Remove caracteres especiais
      .replace(/\s+/g, '_');     // Substitui espaços por underscores
  };
  
  // Formata números grandes com abreviações
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + ' mi';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + ' mil';
    } else {
      return num.toString();
    }
  };
  
  if (!videos || videos.length === 0) {
    return null;
  }
  
  const getButtonState = (type: string) => {
    if (isExporting === type) {
      return {
        icon: <Loader className="w-5 h-5 mr-2 animate-spin" />,
        text: type === 'csv' ? 'Exportando CSV...' : type === 'json' ? 'Exportando JSON...' : 'Gerando PDF...',
        className: 'bg-gray-100 border border-gray-300 text-gray-600'
      };
    } else if (exportSuccess === type) {
      return {
        icon: <Check className="w-5 h-5 mr-2 text-green-600" />,
        text: 'Download Concluído',
        className: 'bg-green-50 border border-green-200 text-green-700'
      };
    } else if (exportError === type) {
      return {
        icon: <AlertCircle className="w-5 h-5 mr-2 text-red-600" />,
        text: 'Erro ao Exportar',
        className: 'bg-red-50 border border-red-200 text-red-700'
      };
    } else {
      return {
        icon: type === 'csv' ? <FileText className="w-5 h-5 mr-2" /> : 
              type === 'json' ? <FileJson className="w-5 h-5 mr-2" /> : 
              <FilePdf className="w-5 h-5 mr-2" />,
        text: type === 'csv' ? 'Exportar como CSV' : 
              type === 'json' ? 'Exportar como JSON' : 
              'Exportar como PDF',
        className: 'border border-gray-300 hover:bg-gray-50 text-gray-700 hover:shadow-sm'
      };
    }
  };
  
  return (
    <div>
      <div className="flex items-center mb-4">
        <Download className="w-5 h-5 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-800">Exportar Análise</h2>
      </div>
      
      <p className="text-gray-600 mb-5 text-sm">
        Exporte os dados do canal para uso em outras ferramentas ou para compartilhar sua análise.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleExportCSV}
          disabled={isExporting !== null}
          className={`flex items-center justify-center px-4 py-3 rounded-lg transition-all duration-200 ${getButtonState('csv').className}`}
        >
          {getButtonState('csv').icon}
          <span className="font-medium text-sm">{getButtonState('csv').text}</span>
        </button>
        
        <button
          onClick={handleExportJSON}
          disabled={isExporting !== null}
          className={`flex items-center justify-center px-4 py-3 rounded-lg transition-all duration-200 ${getButtonState('json').className}`}
        >
          {getButtonState('json').icon}
          <span className="font-medium text-sm">{getButtonState('json').text}</span>
        </button>
        
        <button
          onClick={handleExportPDF}
          disabled={isExporting !== null}
          className={`flex items-center justify-center px-4 py-3 rounded-lg transition-all duration-200 ${getButtonState('pdf').className}`}
        >
          {getButtonState('pdf').icon}
          <span className="font-medium text-sm">{getButtonState('pdf').text}</span>
        </button>
      </div>
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
        <div className="flex items-start">
          <span className="font-semibold mr-1">CSV:</span> Formato ideal para Excel, Google Sheets e outras ferramentas de análise.
        </div>
        <div className="flex items-start">
          <span className="font-semibold mr-1">JSON:</span> Formato para desenvolvedores ou integração com outras aplicações.
        </div>
        <div className="flex items-start">
          <span className="font-semibold mr-1">PDF:</span> Documento formatado pronto para compartilhar ou imprimir.
        </div>
      </div>
    </div>
  );
};

export default ExportOptions;