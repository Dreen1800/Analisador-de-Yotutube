import { fetchChannelData, createDateFilter } from '../src/services/youtubeService';

// Exemplos de como usar filtros de data no serviço do YouTube

// 1. Buscar vídeos dos últimos 30 dias
const last30DaysOptions = {
    maxVideos: 50,
    sortBy: 'date' as const,
    includeShorts: true,
    dateFilter: createDateFilter.lastDays(30)
};

// 2. Buscar vídeos dos últimos 6 meses
const last6MonthsOptions = {
    maxVideos: 100,
    sortBy: 'views' as const,
    includeShorts: false,
    dateFilter: createDateFilter.lastMonths(6)
};

// 3. Buscar vídeos do último ano
const lastYearOptions = {
    maxVideos: 200,
    sortBy: 'engagement' as const,
    includeShorts: true,
    dateFilter: createDateFilter.lastYears(1)
};

// 4. Buscar vídeos entre duas datas específicas
const betweenDatesOptions = {
    maxVideos: 100,
    sortBy: 'date' as const,
    includeShorts: true,
    dateFilter: createDateFilter.between(
        new Date('2024-01-01'),
        new Date('2024-06-30')
    )
};

// 5. Buscar vídeos publicados após uma data específica
const afterDateOptions = {
    maxVideos: 75,
    sortBy: 'views' as const,
    includeShorts: false,
    dateFilter: createDateFilter.after(new Date('2024-03-01'))
};

// 6. Buscar vídeos publicados antes de uma data específica
const beforeDateOptions = {
    maxVideos: 50,
    sortBy: 'date' as const,
    includeShorts: true,
    dateFilter: createDateFilter.before(new Date('2024-12-31'))
};

// 7. Filtros predefinidos convenientes
const thisYearOptions = {
    maxVideos: 100,
    sortBy: 'engagement' as const,
    includeShorts: true,
    dateFilter: createDateFilter.thisYear()
};

const thisMonthOptions = {
    maxVideos: 50,
    sortBy: 'date' as const,
    includeShorts: true,
    dateFilter: createDateFilter.thisMonth()
};

const thisWeekOptions = {
    maxVideos: 25,
    sortBy: 'views' as const,
    includeShorts: false,
    dateFilter: createDateFilter.thisWeek()
};

// 8. Filtro personalizado com datas ISO 8601
const customDateOptions = {
    maxVideos: 100,
    sortBy: 'date' as const,
    includeShorts: true,
    dateFilter: {
        publishedAfter: '2024-01-01T00:00:00Z',
        publishedBefore: '2024-12-31T23:59:59Z'
    }
};

// Exemplo de uso prático
async function analyzeChannelWithDateFilter() {
    try {
        const channelUrl = 'https://www.youtube.com/@exemplo';

        // Analisar vídeos dos últimos 3 meses
        const recentVideos = await fetchChannelData(channelUrl, {
            maxVideos: 100,
            sortBy: 'engagement',
            includeShorts: false,
            dateFilter: createDateFilter.lastMonths(3)
        });

        console.log('Vídeos dos últimos 3 meses:', recentVideos.videos.length);

        // Analisar vídeos do ano atual
        const thisYearVideos = await fetchChannelData(channelUrl, {
            maxVideos: 200,
            sortBy: 'views',
            includeShorts: true,
            dateFilter: createDateFilter.thisYear()
        });

        console.log('Vídeos deste ano:', thisYearVideos.videos.length);

    } catch (error) {
        console.error('Erro ao analisar canal:', error);
    }
}

export {
    last30DaysOptions,
    last6MonthsOptions,
    lastYearOptions,
    betweenDatesOptions,
    afterDateOptions,
    beforeDateOptions,
    thisYearOptions,
    thisMonthOptions,
    thisWeekOptions,
    customDateOptions,
    analyzeChannelWithDateFilter
}; 