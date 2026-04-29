import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card max-w-lg mx-auto mt-12 text-center">
      <h1 className="text-3xl font-semibold text-stine-700">Not found</h1>
      <p className="text-sm text-slate-500 mt-2">
        The page you tried to open doesn't exist (or you don't have access to it).
      </p>
      <Link to="/" className="btn-primary mt-4 inline-block">Back to dashboard</Link>
    </div>
  );
}
