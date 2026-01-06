import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeWrinkles } from '../api';
import { ArrowRight, Loader2, User, Smile, Baby, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const WizardForm: React.FC = () => {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        area: '',
        wrinkle_type: '',
        age_range: '', // Not currently used in logic but present in state
        pregnancy: false,
    });
    const [loading, setLoading] = useState(false);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        setLoading(true);
        const sessionId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
        try {
            const result = await analyzeWrinkles({ session_id: sessionId, ...formData, language: language });
            navigate('/result', { state: { result } });
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Une erreur est survenue. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };

    const renderProgressBar = () => (
        <div className="w-full h-1 bg-white/10 rounded-full mb-8 overflow-hidden">
            <div
                className="h-full bg-cyan-400 shadow-[0_0_10px_theme(colors.cyan.400)] transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
            />
        </div>
    );

    const OptionCard = ({ label, selected, onClick, icon: Icon }: any) => (
        <button
            onClick={onClick}
            className={`
                group relative flex flex-col items-center justify-center p-4 h-24 rounded-xl border transition-all duration-300
                ${selected
                    ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                }
            `}
        >
            {selected && (
                <div className="absolute top-2 right-2">
                    <Check size={16} className="text-cyan-400" />
                </div>
            )}
            {Icon && <Icon className={`mb-2 ${selected ? 'text-cyan-300' : 'text-blue-200/70 group-hover:text-blue-100'}`} size={24} />}
            <span className={`text-sm font-medium ${selected ? 'text-white' : 'text-blue-100/80 group-hover:text-white'}`}>
                {label}
            </span>
        </button>
    );

    return (
        <div className="p-6 md:p-8 min-h-[400px] flex flex-col">
            {renderProgressBar()}

            {/* Step 1: Area Selection */}
            {step === 1 && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                    <h2 className="text-2xl font-bold text-white mb-2">{t('wizard.step1.title')}</h2>
                    <p className="text-blue-200/60 mb-6 text-sm">{t('wizard.step1.subtitle')}</p>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {[
                            { id: 'front', label: t('zone.forehead'), icon: User },
                            { id: 'glabelle', label: t('zone.glabella'), icon: Smile },
                            { id: 'pattes_oie', label: t('zone.eyes'), icon: Smile },
                            { id: 'sillon_nasogenien', label: t('zone.mouth'), icon: User }
                        ].map((opt) => (
                            <OptionCard
                                key={opt.id}
                                label={opt.label}
                                icon={opt.icon}
                                selected={formData.area === opt.id}
                                onClick={() => setFormData({ ...formData, area: opt.id })}
                            />
                        ))}
                    </div>

                    <div className="mt-auto flex justify-end">
                        <button
                            disabled={!formData.area}
                            onClick={handleNext}
                            className={`
                                flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all
                                ${formData.area
                                    ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }
                            `}
                        >
                            {t('wizard.next')} <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Wrinkle Type */}
            {step === 2 && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                    <h2 className="text-2xl font-bold text-white mb-2">{t('wizard.step2.title')}</h2>
                    <p className="text-blue-200/60 mb-6 text-sm">{t('wizard.step2.subtitle')}</p>

                    <div className="grid grid-cols-1 gap-3 mb-6">
                        <button
                            onClick={() => setFormData({ ...formData, wrinkle_type: 'expression' })}
                            className={`
                                text-left p-4 rounded-xl border transition-all duration-300
                                ${formData.wrinkle_type === 'expression'
                                    ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-white">{t('wrinkle.expression')}</span>
                                {formData.wrinkle_type === 'expression' && <Check size={18} className="text-cyan-400" />}
                            </div>
                        </button>

                        <button
                            onClick={() => setFormData({ ...formData, wrinkle_type: 'statique' })}
                            className={`
                                text-left p-4 rounded-xl border transition-all duration-300
                                ${formData.wrinkle_type === 'statique'
                                    ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-white">{t('wrinkle.static')}</span>
                                {formData.wrinkle_type === 'statique' && <Check size={18} className="text-cyan-400" />}
                            </div>
                        </button>
                    </div>

                    <div className="mt-auto flex justify-between">
                        <button onClick={handleBack} className="text-blue-200/60 hover:text-white transition-colors text-sm px-4">
                            {t('wizard.back')}
                        </button>
                        <button
                            disabled={!formData.wrinkle_type}
                            onClick={handleNext}
                            className={`
                                flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all
                                ${formData.wrinkle_type
                                    ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                                }
                            `}
                        >
                            {t('wizard.next')} <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Specifics */}
            {step === 3 && (
                <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                    <h2 className="text-2xl font-bold text-white mb-2">{t('wizard.step3.title')}</h2>
                    <p className="text-blue-200/60 mb-6 text-sm">{t('wizard.step3.subtitle')}</p>

                    <div className="mb-8">
                        <label className={`
                            flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-300
                            ${formData.pregnancy
                                ? 'bg-purple-500/20 border-purple-400/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }
                        `}>
                            <div className={`
                                w-6 h-6 rounded border flex items-center justify-center transition-colors
                                ${formData.pregnancy ? 'bg-purple-500 border-purple-500' : 'border-white/30'}
                            `}>
                                {formData.pregnancy && <Check size={14} className="text-white" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={formData.pregnancy}
                                onChange={(e) => setFormData({ ...formData, pregnancy: e.target.checked })}
                            />
                            <div className="flex items-center gap-2">
                                <Baby size={20} className={formData.pregnancy ? 'text-purple-300' : 'text-blue-200/60'} />
                                <span className={formData.pregnancy ? 'text-white' : 'text-blue-100/80'}>{t('form.pregnancy')}</span>
                            </div>
                        </label>
                    </div>

                    <div className="mt-auto flex justify-between items-center">
                        <button onClick={handleBack} className="text-blue-200/60 hover:text-white transition-colors text-sm px-4">
                            {t('wizard.back')}
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`
                                flex items-center gap-2 px-8 py-3 rounded-full font-bold transition-all
                                ${loading
                                    ? 'bg-blue-600/50 text-white cursor-wait'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:scale-105'
                                }
                            `}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    {t('wizard.analyzing')}
                                </>
                            ) : (
                                <>
                                    {t('wizard.analyze')}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WizardForm;
