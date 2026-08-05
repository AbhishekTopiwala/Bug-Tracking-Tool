import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Terminal, Bug, Camera, FileText } from 'lucide-react';
import { useAgent } from '../../contexts/AgentContext';
import { toast } from 'react-hot-toast';

export default function TestResultPage() {
  const { runId, testId } = useParams();
  const navigate = useNavigate();
  const { activeRun, loadRunDetail, fileBugFromTestFailure } = useAgent();

  const [step, setStep] = useState(null);

  useEffect(() => {
    if (runId) {
      loadRunDetail(runId).then(run => {
        if (run?.steps && testId !== undefined) {
          const found = run.steps[parseInt(testId, 10)] || run.steps.find(s => s.stepId === parseInt(testId, 10));
          setStep(found || null);
        }
      });
    }
  }, [runId, testId, loadRunDetail]);

  const handleFileBug = async () => {
    if (!step || !activeRun) return;
    try {
      await fileBugFromTestFailure({ run: activeRun, step });
      toast.success('Bug ticket logged successfully!');
      navigate('/qa/bugs');
    } catch (err) {
      toast.error('Failed to log bug: ' + err.message);
    }
  };

  if (!step) {
    return (
      <div className="agent-container">
        <button className="btn btn-ghost" onClick={() => navigate(`/qa/agent/runs/${runId}`)}>
          <ArrowLeft size={16} /> Back to Run Details
        </button>
        <div className="agent-card" style={{ marginTop: 24, textAlign: 'center', padding: 40 }}>
          <p>Test step detail not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-container">
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => navigate(`/qa/agent/runs/${runId}`)}>
          <ArrowLeft size={16} /> Back to Run Details
        </button>
      </div>

      <div className="agent-card">
        <div className="step-header">
          <div>
            <span className={`status-badge ${step.status || 'passed'}`}>
              {step.status === 'passed' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {step.status || 'passed'}
            </span>
            <h2 style={{ fontSize: '1.4rem', marginTop: 12, color: 'var(--text-primary)' }}>
              Step {parseInt(testId, 10) + 1}: {step.description}
            </h2>
          </div>

          {step.status === 'failed' && (
            <button className="btn btn-primary" onClick={handleFileBug}>
              <Bug size={16} /> File Bug in QA Portal
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
          <div className="step-detail-box">
            <label><FileText size={12} /> Target Selector / Hint</label>
            <span>{step.targetElementHint || 'N/A'}</span>
          </div>

          <div className="step-detail-box">
            <label><Terminal size={12} /> Action Performed</label>
            <span>{step.action}</span>
          </div>
        </div>

        {step.screenshot && (
          <div style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={18} style={{ color: '#6366f1' }} /> Visual Screenshot Evidence
            </h3>
            <img src={step.screenshot} alt="Visual Proof" style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
          </div>
        )}
      </div>
    </div>
  );
}
