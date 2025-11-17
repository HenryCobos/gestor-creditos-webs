"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface DashboardChartsProps {
  prestamosData?: {
    activos: number
    pagados: number
    retrasados: number
  }
  pagosData?: Array<{
    mes: string
    monto: number
  }>
  frecuenciasData?: Array<{
    name: string
    value: number
  }>
}

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b']

export function DashboardCharts({ 
  prestamosData = { activos: 0, pagados: 0, retrasados: 0 },
  pagosData = [],
  frecuenciasData = []
}: DashboardChartsProps) {
  
  const prestamosPieData = [
    { name: 'Activos', value: prestamosData.activos, color: '#3b82f6' },
    { name: 'Pagados', value: prestamosData.pagados, color: '#10b981' },
    { name: 'Retrasados', value: prestamosData.retrasados, color: '#ef4444' },
  ].filter(item => item.value > 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Estado de Préstamos */}
      {prestamosPieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Préstamos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={prestamosPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {prestamosPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Pagos por Mes */}
      {pagosData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pagos Recibidos por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pagosData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Line type="monotone" dataKey="monto" stroke="#3b82f6" strokeWidth={2} name="Monto" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Frecuencias de Pago */}
      {frecuenciasData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Préstamos por Frecuencia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={frecuenciasData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8b5cf6" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

