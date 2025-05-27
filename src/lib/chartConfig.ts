import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,    // ← Este estava faltando!
  BarElement,
  BarController,
  ScatterController,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default ChartJS;