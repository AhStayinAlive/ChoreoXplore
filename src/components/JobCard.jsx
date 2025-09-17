export default function JobCard({ job }) {
  return (
    <div className="job-row">
      <div className="job-thumb">
        {job.url ? (
          <img src={job.url} alt="Preview" />
        ) : job.status === "processing" ? (
          <div className="bar">
            <div className="bar__fill" style={{ width: `${job.progress}%` }} />
          </div>
        ) : (
          <span className="muted">{job.status}</span>
        )}
      </div>

      <div className="job-info">
        <div className="job-header">
          <span className={`badge badge--${job.status}`}>{job.status}</span>
          <span className="mini">
            {job.params?.aspect} • {job.params?.duration}s
          </span>
        </div>
        <p className="job-prompt">{job.prompt}</p>
        {job.negPrompt && <p className="job-neg">– {job.negPrompt}</p>}
        {job.log && <div style={{fontSize:12, opacity:.7, marginTop:4}}>log: {job.log}</div>}
      </div>
    </div>
  );
}
