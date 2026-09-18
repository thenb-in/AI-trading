import PropTypes from 'prop-types';
import { SetupStepItem } from './SetupStepItem';

// The setup tasks, in the order to take them, across the top of the guide.
const SetupStepper = ({ tasks, nextTaskId }) => (
  <nav aria-label="Setup steps">
    <ol className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm md:flex md:divide-y-0">
      {tasks.map((task, index) => (
        <SetupStepItem
          key={task.id}
          task={task}
          position={index + 1}
          isNext={task.id === nextTaskId}
          isLast={index === tasks.length - 1}
        />
      ))}
    </ol>
  </nav>
);

SetupStepper.propTypes = {
  tasks: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired })).isRequired,
  nextTaskId: PropTypes.string,
};

export { SetupStepper };
