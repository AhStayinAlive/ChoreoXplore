import JobCard from "./JobCard";
import ImageGen from "./ImageGen";

export default function PreviewPanel({ jobs }) {
  return (
    <aside className="jobs">
      <h3>Jobs</h3>
      {jobs.length === 0 && <p className="muted">No jobs yet.</p>}
      <div style={{ marginBottom: 12 }}>
        <h4>Image Generator</h4>
        <ImageGen />
      </div>
      <div className="cards">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </aside>
  );
}
