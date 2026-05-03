'use client';

import { useState } from 'react';

export default function UpgradeModal({ 
  currentUser, 
  onClose 
}: { 
  currentUser: any; 
  onClose: () => void; 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async (tier: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          tier: tier
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize checkout.');
      }

      // Redirect the user to the secure Stripe Checkout page!
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"
        >
          ✕
        </button>

        <div className="p-6 text-center">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-2">
            Go Elite.
          </h2>
          <p className="text-gray-400 text-sm mb-6">Unlock total control and maximum privacy on the map.</p>

          {error && <div className="text-red-500 text-sm mb-4 font-bold">{error}</div>}

          {/* Elite Tier Card */}
          <div className="bg-black border border-pink-500/50 rounded-xl p-5 text-left mb-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-pink-600 text-white text-[10px] font-bold px-2 py-1 uppercase rounded-bl-lg">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Elite Tier</h3>
            <p className="text-pink-400 font-bold mb-4">$19.99 / month</p>
            
            <ul className="space-y-2 mb-6 text-sm text-gray-300">
              <li className="flex items-center">✅ <span className="ml-2 font-bold text-white">Stealth Mode</span> (Hide your pin)</li>
              <li className="flex items-center">✅ Unlimited messaging</li>
              <li className="flex items-center">✅ Read receipts</li>
              <li className="flex items-center">✅ Drop Hotspot Waypoints</li>
            </ul>

            <button 
              onClick={() => handleUpgrade('elite')}
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(236,72,153,0.5)] transition-all disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Upgrade to Elite'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500">You can cancel your subscription at any time.</p>
        </div>
      </div>
    </div>
  );
}