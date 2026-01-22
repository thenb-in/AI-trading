/**
 * Unsupported File Viewer Component
 * Displays a friendly message when a file preview is unavailable
 */
const UnsupportedViewer = () => {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 p-8">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4 text-gray-400">📄</div>
          <h2 className="text-lg font-medium text-gray-700 mb-2">
            Preview Not Available
          </h2>
          <p className="text-sm text-gray-500">
            This file type is currently not supported for preview.
            Support for additional formats will be added soon.
          </p>
        </div>
      </div>
    );
  };
  
  export { UnsupportedViewer };
  