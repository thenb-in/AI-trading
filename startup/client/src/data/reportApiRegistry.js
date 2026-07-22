let reportApi = null;


const registerReportApi = (api) => {
  reportApi = api || null;
};


const getReportApi = () => {
  if (!reportApi) {
    throw new Error(
      'reportApi is not registered. Call registerReportApi() during app startup.',
    );
  }
  return reportApi;
};

export { registerReportApi, getReportApi };
