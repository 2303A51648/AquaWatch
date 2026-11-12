import React from 'react';
import { Activity, Cloud, Database, ExternalLink, Server } from 'lucide-react';
import { API_BASE_URL } from '../api';

const services = [
  {
    name: 'Frontend static site',
    detail: 'React + Vite build served by Render. Browser requests use VITE_API_BASE_URL.',
    icon: Cloud,
  },
  {
    name: 'FastAPI web service',
    detail: 'Python API, MongoDB indexes, and the water-quality simulator share one lifespan.',
    icon: Server,
  },
  {
    name: 'MongoDB Atlas',
    detail: 'Stations, sensors, readings, alerts, and settings persist in the aquawatch_db database.',
    icon: Database,
  },
];

const endpoints = [
  ['GET', '/health', 'Service liveness'],
  ['GET', '/ready', 'MongoDB connection and station count'],
  ['GET / POST', '/api/stations', 'List or register stations'],
  ['GET / POST / PUT', '/api/sensors', 'List, provision, or update sensor status'],
  ['GET', '/api/readings/latest', 'Latest reading for each station'],
  ['GET', '/api/readings/history', 'Historical readings'],
  ['GET', '/api/alerts', 'List alerts; acknowledge and resolve using their action routes'],
  ['GET / PUT', '/api/thresholds', 'Read or update water-quality thresholds'],
];

export const DevOpsExplorerView: React.FC = () => (
  <div className="space-y-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#102A43]">
      <div className="mb-2 flex items-center gap-2 text-[#168AAD]">
        <Activity className="h-5 w-5" />
        <span className="text-xs font-bold uppercase tracking-wider">Cloud deployment</span>
      </div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">AquaWatch on Render</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
        The frontend is a static site, the API runs as a native Python web service, and MongoDB Atlas
        is the only runtime database. Configure service secrets in Render rather than in browser code.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {services.map(({ name, detail, icon: Icon }) => (
        <section
          key={name}
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#102A43]"
        >
          <Icon className="mb-4 h-6 w-6 text-[#168AAD]" />
          <h3 className="font-semibold text-slate-900 dark:text-white">{name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{detail}</p>
        </section>
      ))}
    </div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#102A43]">
      <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Backend API</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Interactive OpenAPI documentation is available at /docs.</p>
        </div>
        <a
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200"
          href={`${API_BASE_URL || 'http://localhost:8000'}/docs`}
          target="_blank"
          rel="noreferrer"
        >
          API docs <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {endpoints.map(([method, path, detail]) => (
          <div key={`${method}-${path}`} className="grid gap-2 px-5 py-3 sm:grid-cols-[100px_1fr_2fr] sm:items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">{method}</span>
            <code className="text-xs text-slate-800 dark:text-slate-200">{path}</code>
            <span className="text-xs text-slate-500 dark:text-slate-400">{detail}</span>
          </div>
        ))}
      </div>
    </section>
  </div>
);
