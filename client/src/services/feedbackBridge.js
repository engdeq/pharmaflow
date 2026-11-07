let handlers = {
  showLoading: () => {},
  hideLoading: () => {},
  success: () => {},
  error: () => {},
};

export function setFeedbackHandlers(next) {
  handlers = { ...handlers, ...next };
}

export function getFeedbackHandlers() {
  return handlers;
}
