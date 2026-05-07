export const STATUSES = ['Open', 'In Progress', 'Done', 'Resolved', 'Reopened'];

export const getValidStatusTransitions = (currentStatus, role) => {
  if (role === 'Developer') {
    switch (currentStatus) {
      case 'Open': 
        return ['Open', 'In Progress'];
      case 'In Progress': 
        return ['In Progress', 'Done', 'Open'];
      case 'Reopened':
        return ['Reopened', 'In Progress'];
      case 'Done':
      case 'Resolved':
      default:
        return [currentStatus]; // Once Done or Resolved, dev cannot change it
    }
  } else {
    // QA or Admin role
    switch (currentStatus) {
      case 'Open': 
        return ['Open', 'In Progress', 'Done', 'Resolved'];
      case 'In Progress': 
        return ['In Progress', 'Done', 'Open'];
      case 'Done': 
        return ['Done', 'Resolved', 'Reopened'];
      case 'Resolved': 
        return ['Resolved', 'Reopened'];
      case 'Reopened': 
        return ['Reopened', 'In Progress', 'Done', 'Resolved'];
      default:
        return [currentStatus];
    }
  }
};
