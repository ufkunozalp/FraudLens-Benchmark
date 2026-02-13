
import React, { useMemo, useState } from 'react';
import {
    ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie
} from 'recharts';
import { useGlobalState } from '../context/GlobalContext';
import { TEXT } from '../constants/text';
import EmptyState from '../components/ui/EmptyState';
import InfoButton from '../components/InfoButton';
import { BarChart3, Wand2, ScanSearch, Layers } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Compare = () => {
    const { theme, detectionHistory, gallery } = useGlobalState();
    const isDark = theme === 'dark';
    const [activeTab, setActiveTab] = useState<'detectors' | 'generators'>('detectors');

    // --- DETECTOR METRICS ---
    const detectorMetrics = useMemo(() => {
        const groups: { [key: string]: typeof detectionHistory } = {};

        detectionHistory.forEach(d => {
            const name = d.modelId || 'Unknown';
            if (!groups[name]) groups[name] = [];
            groups[name].push(d);
        });

        return Object.entries(groups).map(([rawModelId, runs]) => {
            const verifiedRuns = runs.filter(r => r.feedback !== undefined);

            let TP = 0, FP = 0, TN = 0, FN = 0;
            let latencySum = 0;

            verifiedRuns.forEach(r => {
                if (r.label === 'FAKE' && r.feedback === 'correct') TP++;
                if (r.label === 'FAKE' && r.feedback === 'incorrect') FP++; // Model said Fake, was Real
                if (r.label === 'REAL' && r.feedback === 'correct') TN++;
                if (r.label === 'REAL' && r.feedback === 'incorrect') FN++; // Model said Real, was Fake
            });

            runs.forEach(r => { if (r.latencyMs) latencySum += r.latencyMs; });

            const accuracy = verifiedRuns.length > 0 ? Math.round(((TP + TN) / verifiedRuns.length) * 100) : 0;
            const precision = (TP + FP) > 0 ? Math.round((TP / (TP + FP)) * 100) : 0;
            const recall = (TP + FN) > 0 ? Math.round((TP / (TP + FN)) * 100) : 0;
            const f1 = (precision + recall) > 0 ? Math.round((2 * precision * recall) / (precision + recall)) : 0;
            const fpr = (FP + TN) > 0 ? Math.round((FP / (FP + TN)) * 100) : 0;

            const avgLatency = runs.length > 0 ? Math.round(latencySum / runs.length) : 0;

            return {
                modelId: rawModelId, // Keep original ID for lookups
                name: rawModelId, // Use raw ID as name for consistency
                accuracy, precision, recall, f1, fpr,
                latency: avgLatency,
                count: runs.length,
                verifiedCount: verifiedRuns.length,
                correctCount: TP + TN,
                predictedFake: TP + FP,
                predictedReal: TN + FN
            };
        });
    }, [detectionHistory]);

    const scatterData = useMemo(() => {
        return detectionHistory
            .filter(r => r.feedback !== undefined)
            .map((r, i) => {
                const modelId = r.modelId || 'Unknown';
                // Find by modelId field, not display name
                const modelIndex = detectorMetrics.findIndex(m => m.modelId === modelId);
                return {
                    id: i,
                    x: Number((r.confidence * 100).toFixed(1)), // Fix decimal points
                    y: modelIndex >= 0 ? modelIndex + 1 : Math.random() * 5 + 1, // Jitter if not found
                    z: 1,
                    isCorrect: r.feedback === 'correct',
                    model: modelId
                };
            });
    }, [detectionHistory, detectorMetrics]);

    // --- GENERATOR METRICS ---
    const generatorMetrics = useMemo(() => {
        const groups: { [key: string]: typeof gallery } = {};

        // Group by modelId, default to 'unknown' if missing
        gallery.forEach(item => {
            const name = item.modelId || 'Unknown Model';
            if (!groups[name]) groups[name] = [];
            groups[name].push(item);
        });

        return Object.entries(groups).map(([modelId, items]) => {
            let latencySum = 0;
            let latencyCount = 0;

            items.forEach(item => {
                if (item.latency) {
                    latencySum += item.latency;
                    latencyCount++;
                }
            });

            return {
                name: modelId,
                count: items.length,
                avgLatency: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
                // Calculate breakdown of source type
                generatedCount: items.filter(i => i.source === 'generated').length,
                editedCount: items.filter(i => i.source === 'edited').length
            };
        });
    }, [gallery]);


    if (detectorMetrics.length === 0 && generatorMetrics.length === 0) {
        return (
            <div className="h-full overflow-y-auto p-8 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 h-full">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {TEXT.COMPARE.TITLE}
                            <InfoButton
                                title={TEXT.COMPARE.TITLE}
                                description={TEXT.COMPARE.INFO.DESCRIPTION}
                                models={TEXT.COMPARE.INFO.MODELS}
                            />
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">{TEXT.COMPARE.SUBTITLE}</p>
                    </div>
                    <EmptyState
                        icon={BarChart3}
                        title="No Benchmark Data"
                        description="Run generations or detections to populate performance metrics."
                        className="h-96"
                    />
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-xs">
                    <p className="font-bold text-slate-900 dark:text-white mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-slate-600 dark:text-slate-300 capitalize">
                                {entry.name}:
                                <span className="font-mono ml-1 font-bold">
                                    {entry.value}{entry.name.includes('Latency') ? 'ms' : entry.name.includes('Count') ? '' : '%'}
                                </span>
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="h-full overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8 pb-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {TEXT.COMPARE.TITLE}
                            <InfoButton
                                title={TEXT.COMPARE.TITLE}
                                description={TEXT.COMPARE.INFO.DESCRIPTION}
                                models={TEXT.COMPARE.INFO.MODELS}
                            />
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">{TEXT.COMPARE.SUBTITLE}</p>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
                        <button
                            onClick={() => setActiveTab('detectors')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'detectors' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <ScanSearch className="w-4 h-4" /> Detectors
                        </button>
                        <button
                            onClick={() => setActiveTab('generators')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'generators' ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`}
                        >
                            <Wand2 className="w-4 h-4" /> Gen & Edit
                        </button>
                    </div>
                </div>

                {/* -------------------- DETECTORS TAB -------------------- */}
                {activeTab === 'detectors' && (
                    <>
                        {detectorMetrics.length === 0 ? (
                            <EmptyState icon={ScanSearch} title="No Detection Data" description="Run models on images to see benchmarks." />
                        ) : (
                            <>
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 gap-8">
                                        {/* MAIN CHART: DUAL AXIS */}
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{TEXT.COMPARE.CHART_ACCURACY}</h3>
                                            </div>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ComposedChart data={detectorMetrics} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />

                                                        {/* Left Axis: Percentage */}
                                                        <YAxis yAxisId="left" orientation="left" domain={[0, 100]} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} label={{ value: '%', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b' }} />

                                                        {/* Right Axis: Latency */}
                                                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#f59e0b' }} label={{ value: 'ms', angle: 90, position: 'insideRight', fill: '#f59e0b' }} />

                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend />

                                                        <Bar yAxisId="left" dataKey="accuracy" name="Accuracy" fill="#4f46e5" barSize={20} radius={[4, 4, 0, 0]} />
                                                        <Bar yAxisId="left" dataKey="f1" name="F1 Score" fill="#10b981" barSize={20} radius={[4, 4, 0, 0]} />
                                                        <Line yAxisId="right" type="monotone" dataKey="latency" name="Latency (ms)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                                                    </ComposedChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        {/* SCATTER PLOT: LATENCY vs ACCURACY */}
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                            <div className="flex justify-between items-center mb-6">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trade-off Analysis</h3>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Latency vs. Accuracy</p>
                                                </div>
                                            </div>
                                            <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                                                        <XAxis type="number" dataKey="latency" name="Latency" unit="ms" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} label={{ value: 'Latency (ms) - Lower is Better', position: 'insideBottom', offset: -10, fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                                                        <YAxis type="number" dataKey="accuracy" name="Accuracy" unit="%" domain={[0, 100]} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} label={{ value: 'Accuracy (%) - Higher is Better', angle: -90, position: 'insideLeft', fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                                            if (active && payload && payload.length) {
                                                                const data = payload[0].payload;
                                                                return (
                                                                    <div className="bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded shadow text-xs">
                                                                        <p className="font-bold text-slate-900 dark:text-white">{data.name}</p>
                                                                        <p className="text-slate-600 dark:text-slate-300">Accuracy: {data.accuracy}%</p>
                                                                        <p className="text-slate-600 dark:text-slate-300">Latency: {data.latency}ms</p>
                                                                    </div>
                                                                )
                                                            }
                                                            return null;
                                                        }} />
                                                        <Scatter name="Models" data={detectorMetrics} fill="#8884d8">
                                                            {detectorMetrics.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={entry.accuracy >= 80 ? '#22c55e' : entry.accuracy >= 50 ? '#f59e0b' : '#ef4444'} />
                                                            ))}
                                                        </Scatter>
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <p className="text-xs text-center text-slate-400 mt-2">
                                                Top-Left: Best (Fast & Accurate) • Bottom-Right: Worst (Slow & Inaccurate)
                                            </p>
                                        </div>
                                    </div>

                                    {/* SCATTER PLOT: CONFIDENCE CALIBRATION (RESTORED) */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Confidence Calibration</h3>
                                            <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300">
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Correct</span>
                                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Incorrect</span>
                                            </div>
                                        </div>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e5e7eb'} />
                                                    <XAxis type="number" dataKey="x" name="Confidence" unit="%" domain={[50, 100]} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} label={{ value: 'Confidence Score', position: 'insideBottom', offset: -10, fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                                                    <YAxis type="number" dataKey="y" name="Jitter" hide domain={[0, 10]} />
                                                    <ZAxis type="number" dataKey="z" range={[50, 50]} />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white dark:bg-slate-800 p-2 border border-slate-200 dark:border-slate-700 rounded shadow text-xs">
                                                                    <p className="font-bold text-slate-900 dark:text-white">{data.model}</p>
                                                                    <p className="text-slate-600 dark:text-slate-300">Conf: {data.x}%</p>
                                                                    <p className={data.isCorrect ? "text-green-500" : "text-red-500"}>
                                                                        {data.isCorrect ? "Correct Prediction" : "Wrong Prediction"}
                                                                    </p>
                                                                </div>
                                                            )
                                                        }
                                                        return null;
                                                    }} />
                                                    <Scatter name="Predictions" data={scatterData} fill="#8884d8">
                                                        {scatterData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.isCorrect ? '#22c55e' : '#ef4444'} />
                                                        ))}
                                                    </Scatter>
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <p className="text-xs text-center text-slate-400 mt-2">
                                            High confidence + Red dot = "Confidently Wrong" (Dangerous)
                                        </p>
                                    </div>


                                </div>

                                {/* TABLE (MOVED TO BOTTOM, FULL WIDTH) */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors flex flex-col">
                                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <h3 className="font-semibold text-slate-900 dark:text-white">{TEXT.COMPARE.TABLE_TITLE}</h3>
                                        <button
                                            onClick={() => {
                                                const headers = ['Model', 'Total Runs', 'Correct', 'Pred. Fake', 'Pred. Real', 'Precision', 'Recall', 'F1', 'Accuracy', 'Latency'];
                                                const rows = detectorMetrics.map(r => [
                                                    r.name,
                                                    r.count,
                                                    r.correctCount,
                                                    r.predictedFake,
                                                    r.predictedReal,
                                                    `${r.precision}%`,
                                                    `${r.recall}%`,
                                                    `${r.f1}%`,
                                                    `${r.accuracy}%`,
                                                    `${r.latency}ms`
                                                ]);
                                                const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.setAttribute('href', url);
                                                link.setAttribute('download', 'benchmark_metrics.csv');
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-md transition-colors flex items-center gap-2"
                                        >
                                            <Layers className="w-3 h-3" /> Export CSV
                                        </button>
                                    </div>
                                    <div className="overflow-auto max-h-[500px]">
                                        <table className="w-full text-sm text-left relative">
                                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                                                <tr>
                                                    <th className="px-6 py-3 font-medium">{TEXT.COMPARE.COLUMNS.MODEL}</th>
                                                    <th className="px-6 py-3 font-medium">{TEXT.COMPARE.COLUMNS.RUNS}</th>
                                                    <th className="px-6 py-3 font-medium">Correct</th>
                                                    <th className="px-6 py-3 font-medium">Pred. Fake</th>
                                                    <th className="px-6 py-3 font-medium">Pred. Real</th>
                                                    <th className="px-6 py-3 font-medium">Precision</th>
                                                    <th className="px-6 py-3 font-medium">Recall</th>
                                                    <th className="px-6 py-3 font-medium">F1</th>
                                                    <th className="px-6 py-3 font-medium">{TEXT.COMPARE.COLUMNS.ACCURACY}</th>
                                                    <th className="px-6 py-3 font-medium">{TEXT.COMPARE.COLUMNS.LATENCY}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
                                                {detectorMetrics.map((row) => (
                                                    <tr key={row.name} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{row.name}</td>
                                                        <td className="px-6 py-4">{row.count}</td>
                                                        <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">{row.correctCount}</td>
                                                        <td className="px-6 py-4">{row.predictedFake}</td>
                                                        <td className="px-6 py-4">{row.predictedReal}</td>
                                                        <td className="px-6 py-4">{row.precision}%</td>
                                                        <td className="px-6 py-4">{row.recall}%</td>
                                                        <td className="px-6 py-4">
                                                            <span className="font-bold text-slate-600 dark:text-slate-400">{row.f1}%</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`font-bold ${row.accuracy > 80 ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                                {row.accuracy}%
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">{row.latency}ms</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}

                {/* -------------------- GENERATORS TAB -------------------- */}
                {
                    activeTab === 'generators' && (
                        <>
                            {generatorMetrics.length === 0 ? (
                                <EmptyState icon={Wand2} title="No Generation Data" description="Generate or Edit images to see benchmarks." />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* GENERATION SPEED COMPARISON */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Generation Latency (Speed)</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={generatorMetrics} layout="vertical" margin={{ left: 40 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                                    <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} label={{ value: 'Avg Time (ms)', position: 'insideBottom', offset: -5, fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Bar dataKey="avgLatency" name="Latency (ms)" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                                                        {generatorMetrics.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <p className="text-xs text-center text-slate-400 mt-2">Lower is better.</p>
                                    </div>

                                    {/* GENERATION VOLUME */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Usage Volume</h3>
                                        <div className="h-80">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={generatorMetrics}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="count"
                                                    >
                                                        {generatorMetrics.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    {/* TASK TYPE BREAKDOWN */}
                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors lg:col-span-2">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Task Breakdown (Generation vs Inpainting)</h3>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={generatorMetrics}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e5e7eb'} />
                                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                                    <YAxis tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                                                    <Tooltip content={<CustomTooltip />} />
                                                    <Legend />
                                                    <Bar dataKey="generatedCount" name="New Images" stackId="a" fill="#0ea5e9" />
                                                    <Bar dataKey="editedCount" name="Inpainted/Edited" stackId="a" fill="#6366f1" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                }
            </div >
        </div >
    );
};

export default Compare;
