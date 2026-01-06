import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFiche } from '../api';
import type { FicheData } from '../api';
import Header from '../components/Header';

export default function FichePage() {
    const { pmid } = useParams();
    const [data, setData] = useState<FicheData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!pmid) return;
        getFiche(pmid)
            .then(setData)
            .catch((e) => alert("Erreur chargement fiche: " + e))
            .finally(() => setLoading(false));
    }, [pmid]);

    if (loading) return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Chargement de la fiche...</div>;
    if (!data) return <div className="container">Fiche introuvable.</div>;

    // Extraction logic similar to viewer.html
    const mainTitle = data.nom_commercial_courant || data.titre_officiel || "Titre";
    const subTitle = data.nom_scientifique || "";
    const ci = data.carte_identite || {};
    const eff = data.synthese_efficacite || {};

    const meta = data.meta || { zones_concernees: [] };
    const stats = data.statistiques_consolidees || {};
    const sources = data.annexe_sources_retenues || [];
    const swap = data.alternative_bigsis || null;
    const scores = data.score_global || {};

    // Colors
    const effVal = scores.note_efficacite_sur_10 ?? "?";
    const effNum = typeof effVal === 'number' ? effVal : parseFloat(effVal as string);
    const effColor = (!isNaN(effNum) && effNum >= 8) ? 'var(--success-green)' : ((!isNaN(effNum) && effNum >= 5) ? 'var(--peachy-coral)' : 'var(--alert-red)');

    const secVal = scores.note_securite_sur_10 ?? "?";
    const secNum = typeof secVal === 'number' ? secVal : parseFloat(secVal as string);
    const secColor = (!isNaN(secNum) && secNum >= 7) ? 'var(--success-green)' : ((!isNaN(secNum) && secNum >= 5) ? 'var(--peachy-coral)' : 'var(--alert-red)');

    return (
        <div className="container">
            <Header />

            <div className="master-card" style={{
                background: 'white',
                borderRadius: '24px',
                boxShadow: '0 10px 30px rgba(107, 91, 115, 0.1)',
                overflow: 'hidden',
                marginBottom: '30px'
            }}>
                {/* HEADER */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--deep-teal) 0%, var(--rich-plum) 100%)',
                    padding: '30px 25px 25px 25px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                        {meta.zones_concernees?.map((z: string, i: number) => (
                            <span key={i} style={{
                                background: 'rgba(255,255,255,0.15)',
                                fontSize: '10px', padding: '5px 12px', borderRadius: '20px',
                                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}>{z}</span>
                        ))}
                    </div>

                    <h1 style={{ margin: '0 0 5px 0', fontSize: '32px', letterSpacing: '-0.5px', lineHeight: '1.1' }}>
                        {mainTitle}
                    </h1>
                    {subTitle && <span style={{ fontSize: '13px', opacity: 0.8, fontWeight: 400, marginBottom: '15px', display: 'block', fontStyle: 'italic' }}>({subTitle})</span>}

                    {ci.ce_que_c_est && (
                        <div style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '15px',
                            borderRadius: '16px',
                            backdropFilter: 'blur(5px)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            marginBottom: '30px'
                        }}>
                            <div style={{ display: 'flex', marginBottom: '8px', fontSize: '13px', lineHeight: '1.4', color: 'white' }}>
                                <div style={{ marginRight: '10px', fontSize: '14px', marginTop: '2px' }}>💡</div>
                                <div style={{ opacity: 0.95 }}>
                                    <span style={{ fontWeight: 700, opacity: 0.7, fontSize: '9px', textTransform: 'uppercase', display: 'block', marginBottom: '3px', letterSpacing: '1px' }}>C'est quoi ?</span>
                                    {ci.ce_que_c_est}
                                </div>
                            </div>
                            <div style={{ display: 'flex', fontSize: '13px', lineHeight: '1.4', color: 'white' }}>
                                <div style={{ marginRight: '10px', fontSize: '14px', marginTop: '2px' }}>⚙️</div>
                                <div style={{ opacity: 0.95 }}>
                                    <span style={{ fontWeight: 700, opacity: 0.7, fontSize: '9px', textTransform: 'uppercase', display: 'block', marginBottom: '3px', letterSpacing: '1px' }}>Mécanisme</span>
                                    {ci.comment_ca_marche}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '15px', marginBottom: '-55px', position: 'relative', zIndex: 10, padding: '0 5px' }}>
                        <div className="score-box" style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700, display: 'block', lineHeight: 1, marginBottom: '5px', color: effColor }}>{effVal}</span>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', fontWeight: 700, display: 'block', letterSpacing: '0.5px' }}>Efficacité</span>
                            <div style={{ fontSize: '9px', color: effColor, fontWeight: 700, marginTop: '5px', lineHeight: '1.2' }}>{scores.explication_efficacite_bref}</div>
                        </div>
                        <div className="score-box" style={{ flex: 1, background: 'white', padding: '15px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
                            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700, display: 'block', lineHeight: 1, marginBottom: '5px', color: secColor }}>{secVal}</span>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', fontWeight: 700, display: 'block', letterSpacing: '0.5px' }}>Sécurité</span>
                            <div style={{ fontSize: '9px', color: secColor, fontWeight: 700, marginTop: '5px', lineHeight: '1.2' }}>{scores.explication_securite_bref}</div>
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div style={{ padding: '70px 25px 30px 25px' }}>
                    {swap && (
                        <div style={{
                            background: 'linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%)',
                            border: '2px dashed var(--peachy-coral)',
                            borderRadius: '16px',
                            padding: '20px',
                            marginBottom: '30px',
                            position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute', top: '-10px', left: '20px',
                                background: 'var(--peachy-coral)', color: 'white',
                                fontSize: '9px', fontWeight: 800, textTransform: 'uppercase',
                                padding: '4px 10px', borderRadius: '12px', letterSpacing: '1px'
                            }}>Le Conseil Sœur ✨</div>
                            <div style={{ color: 'var(--rich-plum)', fontFamily: 'Space Grotesk, sans-serif', fontSize: '16px', fontWeight: 700, margin: '5px 0 8px 0' }}>
                                <span>🔄</span> {swap.titre}
                            </div>
                            <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.5', margin: 0 }}>
                                <strong>Pourquoi ?</strong> {swap.pourquoi_c_est_mieux}
                            </p>
                        </div>
                    )}

                    <h3 style={{
                        fontFamily: 'Space Grotesk, sans-serif', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px',
                        color: 'var(--deep-teal)', margin: '35px 0 15px 0', borderBottom: '2px solid var(--soft-sage)', paddingBottom: '8px'
                    }}>🚀 La Promesse</h3>

                    <p style={{ fontSize: '15px', lineHeight: '1.7', color: 'var(--text-dark)' }}>
                        {eff.ce_que_ca_fait_vraiment || "Données non disponibles"}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                        <div style={{ background: '#F0F7F4', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--soft-sage)' }}>
                            <span style={{ display: 'block', fontWeight: 700, color: 'var(--deep-teal)', fontSize: '14px', lineHeight: '1.4', marginBottom: '4px' }}>{eff.delai_resultat || "?"}</span>
                            <span style={{ fontSize: '9px', color: 'var(--rich-plum)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Premiers effets</span>
                        </div>
                        <div style={{ background: '#F0F7F4', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid var(--soft-sage)' }}>
                            <span style={{ display: 'block', fontWeight: 700, color: 'var(--deep-teal)', fontSize: '14px', lineHeight: '1.4', marginBottom: '4px' }}>{eff.duree_resultat || "?"}</span>
                            <span style={{ fontSize: '9px', color: 'var(--rich-plum)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Durée totale</span>
                        </div>
                    </div>

                    <div className="advice" style={{
                        background: '#FFF8F3', borderRadius: '16px', padding: '25px', marginTop: '40px', position: 'relative', borderLeft: '4px solid var(--peachy-coral)'
                    }}>
                        <div style={{ position: 'absolute', top: '-15px', left: '20px', background: 'var(--peachy-coral)', color: 'white', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '16px', boxShadow: '0 4px 8px rgba(244, 168, 130, 0.4)' }}>💬</div>
                        <p style={{ margin: 0, fontSize: '15px', color: 'var(--rich-plum)', lineHeight: '1.6', fontStyle: 'italic', fontWeight: 500 }}>
                            "{data.le_conseil_bigsis || ""}"
                        </p>
                        <span style={{ display: 'block', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: '#999', marginTop: '10px' }}>— Big Sis</span>
                    </div>
                </div>

                {/* SOURCES */}
                <div style={{ background: '#F5F5F5', padding: '30px 25px', color: '#666', fontSize: '12px', borderTop: '1px solid #EEE' }}>
                    <div style={{ textTransform: 'uppercase', fontWeight: 800, marginBottom: '15px', color: 'var(--rich-plum)', letterSpacing: '1px', fontSize: '11px' }}>📚 Preuves Scientifiques</div>

                    {sources.map((s: any, idx: number) => (
                        <div key={idx} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #E0E0E0' }}>
                            <strong style={{ fontWeight: 700, color: 'var(--rich-plum)' }}>{s.annee}</strong> • {s.titre}<br />
                            <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--deep-teal)', textDecoration: 'none', fontWeight: 700, fontSize: '10px', display: 'inline-block', marginTop: '2px' }}>LIRE L'ÉTUDE ↗</a>
                        </div>
                    ))}

                    <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '2px dashed #DDD', display: 'flex', justifyContent: 'space-between', color: '#888', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>
                        <span>👥 {stats.nombre_patients_total || "?"} Patients</span>
                        <span>📊 Preuve : {stats.niveau_de_preuve_global || "?"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
