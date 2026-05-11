export const STATUSES = ['Open', 'In Progress', 'Done', 'Resolved', 'Reopen', 'Reproduced'];

export const getValidStatusTransitions = (currentStatus, role) => {
  // Admin can move any bug to any status
  if (role === 'Admin') return STATUSES;

  if (role === 'Developer') {
    switch (currentStatus) {
      case 'Open':
        return ['Open', 'In Progress'];
      case 'In Progress':
        return ['In Progress', 'Done'];
      case 'Reopen':
      case 'Reopened':
        return ['Reopen', 'In Progress'];
      case 'Reproduced':
        return ['Reproduced', 'In Progress'];
      case 'Done':
      case 'Resolved':
      default:
        return [currentStatus]; // Once Done or Resolved, dev cannot change it
    }
  } else {
    // QA role
    switch (currentStatus) {
      case 'Open':
        return ['Open', 'In Progress'];
      case 'In Progress':
        return ['In Progress']; // QA cannot touch in progress bugs
      case 'Done':
        return ['Done', 'Resolved', 'Reopen'];
      case 'Resolved':
        return ['Resolved', 'Reproduced'];
      case 'Reopen':
      case 'Reopened':
        return ['Reopen']; // QA cannot change directly; Developer must move to In Progress
      case 'Reproduced':
        return ['Reproduced']; // Developer must move to In Progress
      default:
        return [currentStatus];
    }
  }
};
