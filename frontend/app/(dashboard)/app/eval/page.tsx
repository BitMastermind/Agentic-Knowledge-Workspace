"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import type { EvaluationMetrics, EvaluationRun } from "@/lib/types";

export default function EvaluationPage() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsData, runsData] = await Promise.all([
        apiClient.getMetrics(),
        apiClient.listEvaluationRuns(),
      ]);
      setMetrics(metricsData);
      setRuns(runsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Evaluation Dashboard</h1>
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Evaluation Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Track quality metrics and performance
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Total Queries</div>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.total_queries}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Avg Latency</div>
            <div className="text-3xl font-bold text-gray-900">
              {metrics.avg_latency_ms.toFixed(0)}
              <span className="text-lg text-gray-600 ml-1">ms</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Quality Score</div>
            <div className="text-3xl font-bold text-gray-900">
              {(metrics.avg_quality_score * 100).toFixed(1)}
              <span className="text-lg text-gray-600 ml-1">%</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500 mb-1">Positive Feedback</div>
            <div className="text-3xl font-bold text-gray-900">
              {(metrics.positive_feedback_rate * 100).toFixed(1)}
              <span className="text-lg text-gray-600 ml-1">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent Evaluation Runs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent Evaluation Runs</h2>
        </div>
        
        {runs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No evaluation runs yet. Start chatting to generate metrics.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Query
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Latency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quality
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feedback
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {run.query}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.latency_ms.toFixed(0)} ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {run.quality_score
                        ? (run.quality_score * 100).toFixed(1) + "%"
                        : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {run.user_feedback === "thumbs_up" && "👍"}
                      {run.user_feedback === "thumbs_down" && "👎"}
                      {!run.user_feedback && "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(run.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

