import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, X } from 'lucide-react';

const PremiumModalContext = createContext();

export const usePremiumModal = () => useContext(PremiumModalContext);

export const PremiumModalProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const showModal = () => setIsOpen(true);
  const hideModal = () => setIsOpen(false);

  const handleSubscribe = () => {
    setIsOpen(false);
    navigate('/plans');
  };

  return (
    <PremiumModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141824] border border-[#00A8E1]/30 rounded-2xl p-8 max-w-sm w-full shadow-[0_0_40px_rgba(0,168,225,0.15)] relative animate-in fade-in zoom-in duration-200">
            <button onClick={hideModal} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
              <X size={20} />
            </button>
            <div className="w-16 h-16 rounded-full bg-[#00A8E1]/10 flex items-center justify-center mb-6 mx-auto border border-[#00A8E1]/30">
              <Lock className="text-[#00A8E1]" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Premium Content</h3>
            <p className="text-gray-400 text-sm text-center mb-8">
              You need an active subscription to watch this movie. Unlock unlimited access to ClickBuz today!
            </p>
            <button onClick={handleSubscribe} className="w-full py-3 bg-[#00A8E1] hover:bg-[#008bc0] text-white rounded-lg font-bold transition shadow-lg">
              Explore Plans
            </button>
          </div>
        </div>
      )}
    </PremiumModalContext.Provider>
  );
};
