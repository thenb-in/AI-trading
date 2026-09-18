import PropTypes from 'prop-types';
import { Search } from 'lucide-react';
import { SearchTypeField } from '@startup/components/base_components/fields/SearchTypeField';
import { TourTaskRow } from './TourTaskRow';

// Every other page the guide covers, searchable by name, summary or category.
const TourTaskList = ({ tasks, query, onQueryChange }) => (
  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
      <div className="max-w-sm">
        <SearchTypeField
          icon={<Search className="h-4 w-4 text-gray-400" />}
          placeholder="Search pages..."
          value={query}
          onChange={onQueryChange}
          className="w-full"
        />
      </div>
    </div>
    {tasks.length > 0 ? (
      <ul className="divide-y divide-gray-200">
        {tasks.map((task) => (
          <TourTaskRow key={task.id} task={task} />
        ))}
      </ul>
    ) : (
      <p className="p-6 text-center text-sm text-gray-500">No page matches &ldquo;{query}&rdquo;.</p>
    )}
  </div>
);

TourTaskList.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })).isRequired,
  query: PropTypes.string.isRequired,
  onQueryChange: PropTypes.func.isRequired,
};

export { TourTaskList };
