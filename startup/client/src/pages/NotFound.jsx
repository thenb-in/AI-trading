import { useNavigate } from 'react-router-dom';
import { useDataContext } from '@context/useDataContext';

function NotFound() {
  const navigate = useNavigate();
  const { userData } = useDataContext();

  const homePath = userData
    ? userData.isSupportUser
      ? '/admin/multi-company-setup'
      : '/admin'
    : '/';
  const homeLabel = userData ? 'Go to dashboard' : 'Go to login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center bg-white shadow-xl rounded-2xl px-8 py-10">
        <p className="text-6xl font-bold text-blue-600 mb-2">404</p>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Page not found</h1>
        <p className="text-gray-600 mb-6">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={() => navigate(homePath, { replace: true })}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            {homeLabel}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Go back
          </button>
        </div>
      </div>
    </div>
  );
}

export { NotFound };
