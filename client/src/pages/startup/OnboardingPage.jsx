import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataContext } from '@context/startup/useDataContext';
import { FaBuilding, FaUsers, FaArrowRight } from 'react-icons/fa';
import { MasterModal } from '@startup/BaseMasterComponents/MasterModal/MasterModal';
import { CreateCompanyForm } from '../../components/startup/Auth/CreateCompanyForm';
import { QRCodeScanner } from '../../components/common/QRCodeScanner';
import { ApiService } from '@services/startup/ApiService';
import { toast } from 'react-toastify';

function OnboardingPage() {
  const navigate = useNavigate();
  const { userData, setUserData } = useDataContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleBackToLogin = async () => {
    try {
      await ApiService.logout();
    } catch {
      // Ignore logout errors, still navigate to login
    } finally {
      navigate('/', { replace: true });
    }
  };

  const handleCreateCompany = () => {
    setIsModalOpen(true);
    setError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError('');
  };

  const handleSubmitCompany = async (formData) => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await ApiService.createInitialCompany(formData);
      toast.success(response.data.message || 'Company created successfully!');
      
      // Update user data with new company_id
      if (response.data.user) {
        setUserData(prev => ({
          ...prev,
          company: {
            id: response.data.company.id,
            name: response.data.company.name
          }
        }));
      }

      // Close modal and redirect to app guide
      setIsModalOpen(false);
      navigate('/app-guide', { replace: true });
    } catch (err) {
      const errorMessage = err.error || err.message || 'Failed to create company. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinCompany = () => {
    setIsQRScannerOpen(true);
    setError('');
  };

  const handleCloseQRScanner = () => {
    setIsQRScannerOpen(false);
    setError('');
  };

  const extractCompanyIdFromQR = (qrData) => {
    // QR code could be:
    // 1. Just the company ID (UUID)
    // 2. A full URL like: /signup?company_id=uuid
    // 3. A full URL like: https://domain.com/signup?company_id=uuid

    // Try to extract from URL
    try {
      const url = new URL(qrData);
      const companyId = url.searchParams.get('company_id');
      if (companyId) return companyId;
    } catch {
      // Not a URL, might be just the company ID
    }

    // Check if it's a relative URL
    const urlMatch = qrData.match(/company_id=([a-f0-9-]+)/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // If it looks like a UUID, return it directly
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(qrData.trim())) {
      return qrData.trim();
    }

    return null;
  };

  const handleQRScanSuccess = async (qrData) => {
    setIsQRScannerOpen(false);
    setIsSubmitting(true);
    setError('');

    try {
      const companyId = extractCompanyIdFromQR(qrData);
      
      if (!companyId) {
        throw new Error('Invalid QR code. Please scan a valid company QR code.');
      }

      // Join the company
      const response = await ApiService.joinCompany(companyId);
      
      toast.success(response.data.message || 'Successfully joined the company!');
      
      // Update user data
      if (response.data.updatedUser) {
        setUserData(prev => ({
          ...prev,
          company: response.data.updatedUser.company,
          companyId: response.data.updatedUser.company?.id
        }));
      }

      // Redirect to app guide
      navigate('/app-guide', { replace: true });
    } catch (err) {
      const errorMessage = err.error || err.message || 'Failed to join company. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsQRScannerOpen(true); // Reopen scanner on error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center auth-background py-1 px-4">
      <div className="w-full max-w-4xl">
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 sm:px-8 py-6 sm:py-8 text-center text-white">
            <div className="mb-4">
              <FaBuilding className="text-5xl sm:text-6xl mx-auto opacity-90" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Company Onboarding Required</h2>
            <p className="text-blue-100 text-sm sm:text-base">
              Welcome, {userData?.name || 'User'}! Complete your setup to get started.
            </p>
          </div>

          {/* Main Content */}
          <div className="px-6 sm:px-8 py-6 sm:py-8">
            {/* Information Guide */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Getting Started</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Create a new company to set up your organization and manage your team</p>
                    <p>• Join an existing company by scanning the QR code provided by your administrator</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid md:grid-cols-2 gap-4 sm:gap-6 mb-6">
              {/* Create Company Card */}
              <div
                onClick={handleCreateCompany}
                className="group border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-blue-500 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] bg-white"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-blue-100 rounded-full p-4 group-hover:bg-blue-200 transition-colors">
                    <FaBuilding className="text-3xl text-blue-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">Create Company</h3>
                <p className="text-gray-600 text-center mb-4 text-sm">
                  Set up a new company and start managing your organization with full control.
                </p>
                <div className="flex items-center justify-center text-blue-600 font-semibold group-hover:text-blue-700 transition-colors">
                  Get Started <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Join Company Card */}
              <div
                onClick={handleJoinCompany}
                className="group border-2 border-gray-200 rounded-xl p-6 cursor-pointer hover:border-green-500 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] bg-white"
              >
                <div className="flex items-center justify-center mb-4">
                  <div className="bg-green-100 rounded-full p-4 group-hover:bg-green-200 transition-colors">
                    <FaUsers className="text-3xl text-green-600" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">Join Company</h3>
                <p className="text-gray-600 text-center mb-4 text-sm">
                  Scan the QR code provided by your administrator to join an existing company.
                </p>
                <div className="flex items-center justify-center text-green-600 font-semibold group-hover:text-green-700 transition-colors">
                  Scan QR Code <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>

            {/* Helpful Notes */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Quick Tips:</h4>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Ensure you have camera permissions enabled to scan QR codes</li>
                <li>Hold your device steady and ensure good lighting when scanning</li>
                <li>Contact your administrator if you need a new QR code</li>
              </ul>
            </div>

            {/* Back to Login */}
            <div className="text-center pt-4 border-t border-gray-200">
              <button
                onClick={handleBackToLogin}
                className="text-sm text-gray-600 hover:text-gray-800 hover:underline transition font-medium"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <MasterModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title="Create Company"
        maxWidth="sm"
        actions={
          <button
            onClick={handleCloseModal}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        }
      >
        <CreateCompanyForm
          onSubmit={handleSubmitCompany}
          isSubmitting={isSubmitting}
          error={error}
        />
      </MasterModal>

      <MasterModal
        isOpen={isQRScannerOpen}
        onClose={handleCloseQRScanner}
        title="Join Company via QR Code"
        maxWidth="sm"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <QRCodeScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={handleCloseQRScanner}
          isOpen={isQRScannerOpen}
          heading="Scan Company QR Code"
          message="To join a company, a valid QR code is required. Please reach out to your administrator for access."
        />
      </MasterModal>
    </div>
  );
}

export { OnboardingPage };

