import React from 'react';
import { Check, X, ArrowLeft } from 'lucide-react';
import { useNavigate, useOutletContext } from 'react-router-dom';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { handleUpgrade } = useOutletContext<any>();
  
  const tiers = [
    {
      name: "Free Starter",
      price: "₹0",
      duration: "forever",
      description: "Essential practice for beginners.",
      features: [
        "2 Free Papers per Exam Category",
        "Basic Score Analysis",
        "Standard Interface",
        "Community Support"
      ],
      disabledFeatures: [
        "Unlock All Previous Years",
        "Advanced Analytics",
        "Priority Support"
      ],
      cta: "Start Free",
      popular: false,
      id: "FREE"
    },
    {
      name: "Pro Monthly",
      price: "₹59",
      duration: "per month",
      description: "Unlock complete access for one exam type.",
      features: [
        "Unlimited Papers (Selected Exam)",
        "Unlock All Previous Years",
        "Advanced Analytics",
        "Standard Interface",
        "Email Support"
      ],
      disabledFeatures: [
        "Multi-Exam Access"
      ],
      cta: "Get Monthly",
      popular: false,
      id: "PRO_MONTHLY"
    },
    {
      name: "Pro Saver",
      price: "₹299",
      duration: "for 6 months",
      description: "Best value for serious aspirants.",
      features: [
        "Unlock EVERYTHING",
        "Access All Exam Types (UCEED, CEED...)",
        "Unlock All Previous Years",
        "Advanced Analytics",
        "Priority Support",
        "Future Updates Included"
      ],
      disabledFeatures: [],
      cta: "Get 6 Months",
      popular: true,
      id: "PRO_SAVER"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-[#111827]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center text-[#6B7280] hover:text-[#1F2937] font-medium transition-colors"
        >
          <ArrowLeft size={18} className="mr-2"/> Back
        </button>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold text-[#1F2937] mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-[#6B7280]">
            Invest in your future without breaking the bank. Choose the plan that fits your preparation timeline.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`relative bg-white rounded-2xl p-8 border transition-all hover:-translate-y-2 duration-300 flex flex-col
                ${tier.popular 
                  ? 'border-[#8AA624] shadow-xl ring-2 ring-[#8AA624]/20' 
                  : 'border-[#E5E7EB] shadow-sm hover:shadow-lg'}`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
                  <span className="bg-[#8AA624] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-lg font-bold text-[#1F2937] mb-2">{tier.name}</h3>
                <p className="text-[#6B7280] text-sm mb-6">{tier.description}</p>
                <div className="flex items-baseline">
                  <span className="text-4xl font-extrabold text-[#1F2937]">{tier.price}</span>
                  <span className="text-[#6B7280] ml-2 text-sm font-medium">/ {tier.duration}</span>
                </div>
              </div>

              <div className="space-y-4 mb-8 flex-1">
                {tier.features.map((feat) => (
                  <div key={feat} className="flex items-start text-sm">
                    <Check size={18} className="text-[#8AA624] mr-3 shrink-0 mt-0.5" />
                    <span className="text-[#374151]">{feat}</span>
                  </div>
                ))}
                {tier.disabledFeatures.map((feat) => (
                  <div key={feat} className="flex items-start text-sm opacity-50">
                    <X size={18} className="text-[#9CA3AF] mr-3 shrink-0 mt-0.5" />
                    <span className="text-[#9CA3AF] line-through">{feat}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpgrade(tier.id)}
                className={`w-full py-4 rounded-xl font-bold text-center transition-colors
                  ${tier.popular 
                    ? 'bg-[#8AA624] text-white hover:bg-[#728a1d] shadow-md' 
                    : 'bg-[#F3F4F6] text-[#1F2937] hover:bg-[#E5E7EB]'}`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;