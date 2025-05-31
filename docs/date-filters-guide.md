# Guia de Filtros de Data - Analisador de YouTube

## 📅 Visão Geral

Os filtros de data permitem analisar vídeos de um canal do YouTube em períodos específicos, oferecendo insights mais precisos sobre performance temporal e tendências de conteúdo.

## 🎯 Tipos de Filtros Disponíveis

### 1. **Todos os Vídeos** (Padrão)
- Analisa todos os vídeos do canal sem restrição de data
- Ideal para análise geral e visão completa do canal

### 2. **Períodos Predefinidos**
Opções rápidas para análises comuns:

- **Esta semana**: Vídeos publicados na semana atual
- **Este mês**: Vídeos publicados no mês atual  
- **Últimos 30 dias**: Vídeos dos últimos 30 dias
- **Últimos 3 meses**: Vídeos dos últimos 3 meses
- **Últimos 6 meses**: Vídeos dos últimos 6 meses
- **Últimos 90 dias**: Vídeos dos últimos 90 dias
- **Este ano**: Vídeos publicados no ano atual

### 3. **Período Personalizado**
- **Data de início**: Define a data mínima de publicação
- **Data de fim**: Define a data máxima de publicação
- Ambas as datas são opcionais e podem ser usadas independentemente

## 💡 Casos de Uso Práticos

### 📈 **Análise de Performance Sazonal**
```
Filtro: "Últimos 3 meses"
Objetivo: Verificar performance recente e tendências atuais
```

### 🎯 **Comparação de Períodos**
```
Análise 1: Janeiro-Março 2024
Análise 2: Abril-Junho 2024
Objetivo: Comparar performance entre trimestres
```

### 🚀 **Análise de Crescimento**
```
Filtro: "Este ano"
Objetivo: Avaliar evolução do canal no ano atual
```

### 🔍 **Análise de Conteúdo Específico**
```
Filtro: Período personalizado durante evento/campanha
Objetivo: Medir impacto de estratégias específicas
```

## ⚠️ Considerações Importantes

### **Limitações de Dados**
- Canais com pouco conteúdo recente podem retornar poucos vídeos
- Filtros muito restritivos podem não fornecer dados suficientes para análise

### **Impacto na Análise**
- Menos vídeos = análise menos abrangente
- Períodos específicos podem não representar a performance geral do canal

### **Recomendações**
- Use filtros amplos (3-6 meses) para análises gerais
- Use filtros específicos para análises pontuais
- Combine diferentes períodos para comparações

## 🛠️ Como Usar no Frontend

### **Passo 1**: Acesse as Opções de Análise
1. Insira a URL do canal
2. Clique em "Mostrar Opções de Análise"

### **Passo 2**: Configure o Filtro de Data
1. Selecione o tipo de filtro desejado:
   - **Todos os vídeos**: Sem restrição
   - **Período predefinido**: Escolha uma opção do dropdown
   - **Período personalizado**: Defina datas específicas

### **Passo 3**: Execute a Análise
1. Configure outros parâmetros (quantidade de vídeos, ordenação, etc.)
2. Clique em "Analisar Canal"

### **Passo 4**: Visualize os Resultados
- Os filtros aplicados são exibidos em destaque nos resultados
- Gráficos e métricas refletem apenas o período selecionado

## 📊 Exemplos de Código

### **Filtro Predefinido**
```typescript
const options = {
  maxVideos: 100,
  sortBy: 'engagement',
  includeShorts: false,
  dateFilter: createDateFilter.lastMonths(3)
};
```

### **Filtro Personalizado**
```typescript
const options = {
  maxVideos: 50,
  sortBy: 'date',
  includeShorts: true,
  dateFilter: {
    publishedAfter: '2024-01-01T00:00:00Z',
    publishedBefore: '2024-06-30T23:59:59Z'
  }
};
```

## 🔗 Integração com APIs Externas

Os filtros são compatíveis com ferramentas como:
- [YouTube Data Tools](https://tools.digitalmethods.net/netvizz/youtube/mod_videos_list.php)
- [SerpApi YouTube Search](https://serpapi.com/blog/youtube-sp-filters-paginating-sorting-and-filtering-with-the-youtube-api/)
- [SearchAPI YouTube](https://www.searchapi.io/docs/youtube)

## 📝 Notas Técnicas

- Filtros usam formato ISO 8601 (`YYYY-MM-DDTHH:MM:SSZ`)
- Parâmetros da API: `publishedAfter` e `publishedBefore`
- Timezone: UTC (Coordinated Universal Time)
- Compatível com YouTube Data API v3

---

**💡 Dica**: Experimente diferentes combinações de filtros para obter insights únicos sobre a estratégia de conteúdo do canal! 