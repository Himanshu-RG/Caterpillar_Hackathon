import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  Plus,
  CheckCircle,
  X,
} from 'lucide-react';
import { fetchIncidents, createIncident } from '../api/incidents';
import { Incident } from '../types/telematics';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const IncidentsPage: React.FC = () => {
  const { activeMachineId } = useRealtime();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  // Form inputs
  const [incidentType, setIncidentType] = useState('PROXIMITY_HAZARD');
  const [severity, setSeverity] = useState('HIGH');
  const [machineId, setMachineId] = useState(activeMachineId);
  const [operatorId, setOperatorId] = useState('OP001');
  const [description, setDescription] = useState('');

  const loadIncidents = async () => {
    try {
      const res = await fetchIncidents(undefined, 50);
      setIncidents(res);
    } catch (e) {
      console.warn('Incident fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || submitting) return;

    setSubmitting(true);
    try {
      const created = await createIncident({
        machine_id: machineId,
        operator_id: operatorId,
        incident_type: incidentType,
        severity,
        description,
      });

      setIncidents((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setDescription('');
      setSuccessBanner(true);
      setTimeout(() => setSuccessBanner(false), 4000);
    } catch (err) {
      console.warn('Create incident error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-cat-yellow block mb-1">
            Site Compliance & Incident Reporting
          </span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Operational Incident Logs</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time hazard notifications, equipment collisions, near-misses, and safety audit logs.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setMachineId(activeMachineId);
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4 mr-1" />}
        >
          Log Operational Incident
        </Button>
      </div>

      {successBanner && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-600/70 p-3.5 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 animate-in fade-in shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>Incident report logged successfully to backend telematics database!</span>
        </div>
      )}

      {/* Incident Table */}
      <Card
        title="Fleet Incident Registry"
        subtitle="All logged incidents across active site operations"
        icon={<AlertOctagon className="w-4 h-4 text-rose-500" />}
        badge={<span className="font-mono text-xs text-slate-500">{incidents.length} total</span>}
      >
        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center font-mono">
            Querying incidents from telematics database...
          </p>
        ) : incidents.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500/40" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-400">Zero logged incidents recorded</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-200 dark:border-cat-border text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Incident ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Machine</th>
                  <th className="py-2.5 px-3">Operator</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {incidents.map((inc) => (
                  <tr key={inc.incident_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-bold">{inc.incident_id}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">{inc.timestamp.slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-3 px-3 text-slate-900 dark:text-white font-bold">{inc.machine_id}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">{inc.operator_id}</td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">{inc.incident_type.replace(/_/g, ' ')}</td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          inc.severity === 'CRITICAL'
                            ? 'danger'
                            : inc.severity === 'HIGH'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {inc.severity}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-sans max-w-xs truncate">
                      {inc.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Incident Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="industrial-card max-w-lg w-full rounded-2xl p-6 border-slate-200 dark:border-cat-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-cat-border/60 pb-3">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Log Operational Safety Incident
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] block mb-1">
                    Machine ID
                  </label>
                  <input
                    type="text"
                    value={machineId}
                    onChange={(e) => setMachineId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono focus:border-amber-500 dark:focus:border-cat-yellow focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] block mb-1">
                    Operator ID
                  </label>
                  <input
                    type="text"
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white font-mono focus:border-amber-500 dark:focus:border-cat-yellow focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] block mb-1">
                    Incident Type
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) => setIncidentType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-cat-yellow focus:outline-none cursor-pointer"
                  >
                    <option value="PROXIMITY_HAZARD">Proximity Hazard</option>
                    <option value="SEATBELT_VIOLATION">Seatbelt Non-Compliance</option>
                    <option value="OVERSPEED_EVENT">Overspeed under Load</option>
                    <option value="EQUIPMENT_CONTACT">Equipment Contact / Near Miss</option>
                    <option value="THERMAL_EXCURSION">Thermal Overheat Excursion</option>
                    <option value="HYDRAULIC_LEAK">Hydraulic Circuit Leak</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] block mb-1">
                    Severity
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-900 dark:text-white focus:border-amber-500 dark:focus:border-cat-yellow focus:outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">Critical (Immediate Stop)</option>
                    <option value="HIGH">High (Action Required)</option>
                    <option value="MEDIUM">Medium (Inspection Scheduled)</option>
                    <option value="LOW">Low (Informational)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 uppercase font-bold text-[10px] block mb-1">
                  Incident Description & Field Notes
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail observations, proximity distances, personnel involved, or machine behavior..."
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-amber-500 dark:focus:border-cat-yellow focus:outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                  icon={<Plus className="w-4 h-4 mr-1" />}
                >
                  Submit Incident to Backend
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
