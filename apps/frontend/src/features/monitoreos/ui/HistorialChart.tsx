import { useGetHistorialPedagogico } from '../hooks/use-ficha-monitoreo';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatearFecha } from '@shared/lib/fecha/fecha';

interface HistorialChartProps {
  evaluadoId: string;
}

export function HistorialChart({ evaluadoId }: HistorialChartProps) {
  const { data, isLoading, isError } = useGetHistorialPedagogico(evaluadoId);

  if (isLoading) {
    return <div className="text-sm text-slate-500 animate-pulse p-4">Cargando historial pedagógico...</div>;
  }

  if (isError || !data) {
    return <div className="text-sm text-red-500 p-4">Error al cargar el historial pedagógico.</div>;
  }

  const promediosHistoricos = data;

  if (promediosHistoricos.length === 0) {
    return <div className="text-sm text-slate-500 p-4">Aún no hay visitas completadas para mostrar el historial.</div>;
  }

  // Preparamos los datos para Recharts
  const chartData = promediosHistoricos.map((item, index) => {
    const fecha = formatearFecha(item.fecha, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return {
      nombre: `Visita ${index + 1}`,
      fecha: fecha,
      promedio: item.promedio,
      nivel: item.nivelLogro,
    };
  });

  return (
    <div className="w-full flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-slate-800">Progreso Histórico</h3>
      <p className="text-sm text-slate-600 mb-2">
        Evolución del desempeño del docente en visitas anteriores.
      </p>
      <div className="h-64 w-full bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="nombre" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-slate-200 p-3 rounded-md shadow-md text-sm">
                      <p className="font-semibold text-slate-800 mb-1">{label}</p>
                      <p className="text-slate-600">Fecha: {data.fecha}</p>
                      <p className="text-slate-600">Nivel: <span className="font-medium text-blue-600">{data.nivel}</span></p>
                      <p className="text-slate-600">Puntaje: {data.puntaje} / {data.maximo}</p>
                      <p className="text-slate-600 font-medium mt-1">Porcentaje: {data.promedio}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="promedio"
              name="Rendimiento (%)"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: "#ffffff" }}
              activeDot={{ r: 6, fill: "#2563eb" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
