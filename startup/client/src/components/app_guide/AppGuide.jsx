import { TourListHeader } from './tour_list/TourListHeader';
import { SetupStepper } from './tour_list/SetupStepper';
import { TourTaskList } from './tour_list/TourTaskList';
import { useTourList } from './tour_list/useTourList';


const AppGuide = () => {
  const {
    userName,
    setupTasks,
    pageTasks,
    matchingPageTasks,
    openCount,
    doneCount,
    nextTaskTitle,
    nextSetupTaskId,
    query,
    onQueryChange,
    onContinue,
  } = useTourList();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <TourListHeader
          userName={userName}
          doneCount={doneCount}
          totalCount={openCount}
          nextTaskTitle={nextTaskTitle}
          onContinue={onContinue}
        />

        {openCount === 0 && (
          <p className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
            No page here is open to your role yet. Each one below names the permission it needs, so
            you can ask your admin for exactly that.
          </p>
        )}

        {setupTasks.length > 0 && (
          <SetupStepper tasks={setupTasks} nextTaskId={nextSetupTaskId} />
        )}

        {pageTasks.length > 0 && (
          <TourTaskList tasks={matchingPageTasks} query={query} onQueryChange={onQueryChange} />
        )}
      </div>
    </div>
  );
};

export { AppGuide };
