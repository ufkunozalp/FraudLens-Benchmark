
import React, { useMemo } from 'react';
import { AlertTriangle, Database, Activity, FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { useGlobalState } from '../context/GlobalContext';
import { TEXT } from '../constants/text';
import InfoButton from '../components/InfoButton';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';

import { MODELS } from '../constants/models';

const Dashboard = () => {
  const { theme, detectionHistory, gallery } = useGlobalState();
  const isDark = theme === 'dark';

  const stats = useMemo(() => {
    const totalScans = detectionHistory.length;
    const totalGenerated = gallery.length;

    // Detection Rate = (True Positive + True Negative) / Total Verified
    const verified = detectionHistory.filter(r => r.feedback !== undefined);
    const correct = verified.filter(r => r.feedback === 'correct').length;
    const accuracy = verified.length > 0 ? (correct / verified.length) * 100 : 0;

    const flaggedFakes = detectionHistory.filter(r => r.label === 'FAKE').length;
    const verifiedReal = detectionHistory.filter(r => r.label === 'REAL' && r.feedback === 'correct').length;

    // Avg Latency (of all runs)
    const latencySum = detectionHistory.reduce((acc, curr) => acc + (curr.latencyMs || 0), 0);
    const avgLatency = detectionHistory.length > 0 ? Math.round(latencySum / detectionHistory.length) : 0;

    return {
      totalScans,
      totalGenerated,
      accuracy,
      flaggedFakes,
      verifiedReal,
      avgLatency,
      unverified: detectionHistory.length - verified.length
    };
  }, [detectionHistory, gallery]);

  const sourceData = useMemo(() => {
    const real = detectionHistory.filter(r => r.label === 'REAL').length;
    const fake = detectionHistory.filter(r => r.label === 'FAKE').length;
    return [
      { name: 'Real/Authentic', value: real, fill: '#10b981' },
      { name: 'Fake/Generated', value: fake, fill: '#ef4444' }
    ];
  }, [detectionHistory]);


  const modelPerformanceData = useMemo(() => {
    // Initialize stats for ALL models with 0 values
    const stats: Record<string, { name: string; Correct: number; Incorrect: number; Pending: number; Accuracy: number }> = {};

    MODELS.forEach(m => {
      // Use short name logic if needed, or just regular name
      const rawName = m.id;
      const name = rawName.length > 20 ? rawName.substring(0, 18) + '...' : rawName;
      stats[name] = { name, Correct: 0, Incorrect: 0, Pending: 0, Accuracy: 0 };
    });

    detectionHistory.forEach(run => {
      const rawName = run.modelId || 'Unknown';
      const name = rawName.length > 20 ? rawName.substring(0, 18) + '...' : rawName;

      // Ensure key exists (in case history has a model not in current MODELS list)
      if (!stats[name]) stats[name] = { name, Correct: 0, Incorrect: 0, Pending: 0, Accuracy: 0 };

      if (run.feedback === 'correct') {
        stats[name].Correct++;
      } else if (run.feedback === 'incorrect') {
        stats[name].Incorrect++;
      } else {
        stats[name].Pending++;
      }
    });

    // Calculate Accuracy, filter out models with no data, sort by Total Runs (descending)
    return Object.values(stats)
      .map(s => {
        const totalVerified = s.Correct + s.Incorrect;
        s.Accuracy = totalVerified > 0 ? (s.Correct / totalVerified) * 100 : 0;
        return s;
      })
      .filter(s => s.Correct + s.Incorrect + s.Pending > 0) // Only show models with data
      .sort((a, b) => (b.Correct + b.Incorrect + b.Pending) - (a.Correct + a.Incorrect + a.Pending)) // Sort by Total Runs
      .slice(0, 10);
  }, [detectionHistory]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col p-6 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex-none space-y-6 mb-6">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{TEXT.DASHBOARD.TITLE}</h1>
            <p className="text-slate-500 dark:text-slate-400">{TEXT.DASHBOARD.SUBTITLE}</p>
          </div>
          <InfoButton
            title={TEXT.DASHBOARD.TITLE}
            description={TEXT.DASHBOARD.INFO.DESCRIPTION}
            models={TEXT.DASHBOARD.INFO.MODELS}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title={TEXT.DASHBOARD.STATS.TOTAL_SCANS} value={stats.totalScans} sub={`${stats.totalGenerated} ${TEXT.DASHBOARD.STATS.GENERATED_SUB}`} icon={Database} color="bg-blue-500" />
          <StatCard title={TEXT.DASHBOARD.STATS.ACCURACY} value={stats.accuracy > 0 ? `${stats.accuracy.toFixed(1)}%` : 'N/A'} sub={`${stats.unverified} ${TEXT.DASHBOARD.STATS.PENDING_SUB}`} icon={Activity} color="bg-indigo-500" />
          <StatCard title={TEXT.DASHBOARD.STATS.FLAGGED_FAKES} value={stats.flaggedFakes} sub={TEXT.DASHBOARD.STATS.DETECTED_SUB} icon={AlertTriangle} color="bg-amber-500" />
          <StatCard title="Avg Latency" value={`${stats.avgLatency}ms`} sub="Global Average" icon={FileCheck} color="bg-purple-500" />
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Main Chart - Takes 2/3 width and full available height */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-none">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{TEXT.DASHBOARD.TREND_TITLE}</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">{TEXT.DASHBOARD.TREND_SUB}</span>
          </div>
          <div className="flex-1 min-h-0">
            {modelPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelPerformanceData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#1e293b' : '#fff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="Correct" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Incorrect" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="Pending" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Activity}
                title={TEXT.COMMON.NO_DATA}
                description={TEXT.DASHBOARD.NO_DATA}
                className="border-none bg-transparent h-full"
              />
            )}
          </div>
        </div>

        {/* Side Panel - Takes 1/3 width and full available height */}
        <div className="flex flex-col gap-6 min-h-0 h-full">
          {/* Top Right: Distribution (Fits content, approx 35-40%) */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors flex flex-col h-[35%] min-h-[180px]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex-none">Detection Distribution</h3>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={sourceData} margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#f8fafc' : '#0f172a', fontSize: '12px' }} itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }} />
                  <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Right: Recent Runs (Flexible height, takes remaining space) */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors flex flex-col flex-1 min-h-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex-none">{TEXT.DASHBOARD.RECENT_RUNS}</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 space-y-3">
              {detectionHistory.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{TEXT.DASHBOARD.NO_RUNS}</p>
              ) : (
                detectionHistory.slice(0, 20).map((run) => (
                  <div key={run.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                    <div className="w-8 h-8 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {run.imageUrl ? <img src={run.imageUrl} className="w-full h-full object-cover" alt="Run" /> : (run.label === 'FAKE' ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <FileCheck className="w-4 h-4 text-green-500" />)}
                    </div>
                    <div className="flex-1 min-h-0">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate max-w-[120px]">{run.modelId}</p>
                        <div className="flex items-center gap-1.5">
                          {run.feedback && (
                            <span title={`Verified: ${run.feedback}`}>
                              {run.feedback === 'correct' ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                            </span>
                          )}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${run.label === 'FAKE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{run.label}</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(run.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
