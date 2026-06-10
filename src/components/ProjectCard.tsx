import { Trash2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ProgressBar } from './ProgressBar'
import type { Project } from '../types'

interface Props {
  project: Project
  completedMaterials: number
  totalMaterials: number
  onDelete: (id: string) => void
}

export function ProjectCard({ project, completedMaterials, totalMaterials, onDelete }: Props) {
  const navigate = useNavigate()
  const progress = totalMaterials > 0 ? completedMaterials / totalMaterials : 0

  return (
    <div
      id={`project-card-${project.id}`}
      onClick={() => navigate(`/projects/${project.id}`)}
      className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 cursor-pointer transition-colors group flex flex-col"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            id={`project-delete-${project.id}`}
            onClick={e => { e.stopPropagation(); onDelete(project.id) }}
            className="p-1.5 text-gray-400 dark:text-gray-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
          >
            <Trash2 size={15} />
          </button>
          <ChevronRight size={16} className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
        </div>
      </div>

      <div className="mt-auto pt-4 mb-4">
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          <span>재료 진행도</span>
          <span>{completedMaterials} / {totalMaterials} 완료</span>
        </div>
        <ProgressBar value={progress} />
      </div>
    </div>
  )
}
