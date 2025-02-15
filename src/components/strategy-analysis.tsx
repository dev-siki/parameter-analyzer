"use client"
import React, { useState, useCallback, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';

const AVAILABLE_METRICS = {
  'trades': 'Trades',
  'avg_profit': 'Avg Profit %',
  'total_profit_usdt': 'Tot Profit USDT',
  'total_profit_percent': 'Tot Profit %',
  // 'avg_duration': 'Avg Duration',
  'wins': 'Wins',
  'draws': 'Draws',
  'losses': 'Losses',
  'win_rate': 'Win %',
  'drawdown': 'Drawdown %'
};

interface Strategy {
  id: string;
  test_period: {
    start_date: string;
    end_date: string;
  };
  params: Record<string, number>;
  results: Record<string, number>;
}

const StrategyAnalysisDashboard: React.FC = () => {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMetric, setSelectedMetric] = useState<keyof typeof AVAILABLE_METRICS>('total_profit_percent');
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

  const periods = useMemo<string[]>(() => {
    if (!strategies.length) return [];

    const uniquePeriods = new Set<string>();
    strategies.forEach(strategy => {
      const periodKey = `${strategy.test_period.start_date} to ${strategy.test_period.end_date}`;
      uniquePeriods.add(periodKey);
    });

    return Array.from(uniquePeriods);
  }, [strategies]);

  const filteredStrategies = useMemo<Strategy[]>(() => {
    if (!selectedPeriod) return [];

    return strategies.filter(strategy => {
      const periodKey = `${strategy.test_period.start_date} to ${strategy.test_period.end_date}`;
      return periodKey === selectedPeriod;
    });
  }, [strategies, selectedPeriod]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setStrategies(data.strategies || []);

      if (data.strategies && data.strategies.length > 0) {
        const firstStrategy = data.strategies[0];
        const firstPeriod = `${firstStrategy.test_period.start_date} to ${firstStrategy.test_period.end_date}`;
        setSelectedPeriod(firstPeriod);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Error parsing JSON file');
    } finally {
      setLoading(false);
    }
  }, []);

  const getParameterCorrelationData = useCallback(() => {
    if (!filteredStrategies.length) return [];

    const firstStrategy = filteredStrategies[0];
    const parameters = Object.keys(firstStrategy.params);

    return parameters.map(param => ({
      parameter: param,
      data: filteredStrategies.map(strategy => ({
        paramValue: strategy.params[param],
        metricValue: strategy.results[selectedMetric],
        strategy: strategy.id
      }))
    }));
  }, [filteredStrategies, selectedMetric]);

  const correlationData = getParameterCorrelationData();

  return (
    <div className="p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Strategy Parameter Analysis</h1>

        {/* File Upload and Selections */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* File Upload */}
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-slate-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-violet-50 file:text-violet-700
                    hover:file:bg-violet-100"
                />
                {loading && <span className="text-sm text-gray-500">Loading...</span>}
              </div>

              {/* Period Selection */}
              {periods.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Select Period:</label>
                  <select
                    value={selectedPeriod || ''}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="border rounded p-1"
                  >
                    {periods.map((period) => (
                      <option key={period} value={period}>{period}</option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500">
                    ({filteredStrategies.length} strategies in this period)
                  </span>
                </div>
              )}

              {/* Metric Selection */}
              {filteredStrategies.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Select Metric:</label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as keyof typeof AVAILABLE_METRICS)}
                    className="border rounded p-1"
                  >
                    {Object.entries(AVAILABLE_METRICS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredStrategies.length > 0 && (
        <>
          {/* Parameter Correlation Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {correlationData.map(({ parameter, data }) => (
              <Card key={parameter}>
                <CardHeader>
                  <CardTitle>{`${parameter} vs ${AVAILABLE_METRICS[selectedMetric]}`}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          type="number"
                          dataKey="paramValue"
                          name={parameter}
                          label={{ value: parameter, position: 'bottom' }}
                        />
                        <YAxis
                          type="number"
                          dataKey="metricValue"
                          name={AVAILABLE_METRICS[selectedMetric]}
                          label={{ value: AVAILABLE_METRICS[selectedMetric], angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-2 border rounded shadow">
                                  <p className="font-medium">{payload[0].payload.strategy}</p>
                                  <p>{`${parameter}: ${payload[0].value ? (+payload[0].value).toFixed(4) : ''}`}</p>
                                  <p>{`${AVAILABLE_METRICS[selectedMetric]}: ${payload[0].payload.metricValue.toFixed(2)}`}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Scatter data={data} fill="#8884d8" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>Parameter Statistics for {selectedPeriod}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">Parameter</th>
                      <th className="p-2 text-right">Min Value</th>
                      <th className="p-2 text-right">Max Value</th>
                      <th className="p-2 text-right">Avg Value</th>
                      <th className="p-2 text-right">Best Value for {AVAILABLE_METRICS[selectedMetric]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correlationData.map(({ parameter, data }) => {
                      const values = data.map(d => d.paramValue);
                      const bestResult = data.reduce((max, curr) =>
                        curr.metricValue > max.metricValue ? curr : max, data[0]);

                      return (
                        <tr key={parameter} className="border-b">
                          <td className="p-2 font-medium">{parameter}</td>
                          <td className="p-2 text-right">{Math.min(...values).toFixed(4)}</td>
                          <td className="p-2 text-right">{Math.max(...values).toFixed(4)}</td>
                          <td className="p-2 text-right">
                            {(values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)}
                          </td>
                          <td className="p-2 text-right">{bestResult.paramValue.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default StrategyAnalysisDashboard;