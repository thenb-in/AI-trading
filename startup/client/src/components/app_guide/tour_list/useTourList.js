import { useCallback, useMemo, useState } from 'react';
import { useDataContext } from '@context/useDataContext';
import { hasPermission } from '@startup/hooks/hasPermission';
import { getGuideTasks } from '@startup/data/guideTaskRegistry';
import { moduleLockReason, useModuleAccess } from '@startup/hooks/useModuleAccess';
import { useGuideTour } from '../useGuideTour';


const describeTask = (task, userData, resolveSubscription) => {
  const subscription = resolveSubscription(task.permission);
  if (subscription === null) return null;

  return {
    ...task,
    lockedReason: moduleLockReason({
      permissionName: task.permission,
      hasPermissionAccess: !task.permission || hasPermission(task.permission, userData),
      isSubscribed: subscription.isSubscribed,
      isHidden: subscription.isHidden,
    }),
  };
};

const matchesQuery = (task, needle) => [task.title, task.summary, task.group]
  .some((text) => String(text ?? '').toLowerCase().includes(needle));

// Everything the guide page lists: which tours are open, which are shut and why, and the search.
const useTourList = () => {
  const { userData } = useDataContext();
  const { startTour, done } = useGuideTour();
  const { resolveSubscription } = useModuleAccess();
  const [query, setQuery] = useState('');

  const tasks = useMemo(
    () => getGuideTasks().map((task) => describeTask(task, userData, resolveSubscription)).filter(Boolean),
    [userData, resolveSubscription],
  );


  const { setupTasks, pageTasks, openCount, doneCount, nextSetupTaskId, nextTask } = useMemo(() => {
    const isOpen = (task) => !task.lockedReason;
    const isWaiting = (task) => isOpen(task) && !done.has(task.id);
    return {
      setupTasks: tasks.filter((task) => task.section === 'setup'),
      pageTasks: tasks.filter((task) => task.section !== 'setup'),
      openCount: tasks.filter(isOpen).length,
      doneCount: tasks.filter((task) => isOpen(task) && done.has(task.id)).length,
      nextSetupTaskId: tasks.find((task) => task.section === 'setup' && isWaiting(task))?.id,
      nextTask: tasks.find(isWaiting),
    };
  }, [tasks, done]);

  const matchingPageTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? pageTasks.filter((task) => matchesQuery(task, needle)) : pageTasks;
  }, [pageTasks, query]);

  const continueGuide = useCallback(() => {
    if (nextTask) startTour(nextTask);
  }, [nextTask, startTour]);

  const handleQueryChange = useCallback((event) => setQuery(event.target.value), []);

  return {
    userName: userData?.name,
    setupTasks,
    pageTasks,
    matchingPageTasks,
    openCount,
    doneCount,
    nextTaskTitle: nextTask?.title,
    nextSetupTaskId,
    query,
    onQueryChange: handleQueryChange,
    onContinue: continueGuide,
  };
};

export { useTourList };
