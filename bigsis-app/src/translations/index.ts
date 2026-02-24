export type Language = 'fr' | 'en';

export const translations = {
    fr: {
        // HomePage
        "home.badge": "Intelligence Artificielle Esthetique",
        "home.title.main": "Big SIS",
        "home.title.sub": "La grande soeur qui dit la verite",
        "home.description": "Comprendre votre visage, explorer les options, decider sans pression. Votre assistant personnel pour la medecine esthetique.",
        "home.system.status": "Systeme Operationnel",
        "home.footer": "Big SIS V2.0 - La verite sur l'esthetique medicale",
        "home.value.neutral": "100% Neutre",
        "home.value.scientific": "Base scientifique",
        "home.value.free": "Gratuit",
        "home.cta_fiches": "Explorer nos Fiches Verite",

        // Wizard
        "wizard.step1.title": "Quelle zone vous preoccupe ?",
        "wizard.step1.subtitle": "Selectionnez la zone principale a analyser",
        "wizard.step2.title": "Type de ride / preoccupation",
        "wizard.step2.subtitle": "Precisez ce que vous observez",
        "wizard.step3.title": "Quelques details sur vous",
        "wizard.step3.subtitle": "Pour affiner l'analyse de securite",
        "wizard.next": "Continuer",
        "wizard.analyze": "Lancer l'Analyse BigSIS",
        "wizard.analyzing": "Analyse en cours...",
        "wizard.back": "Retour",

        // Details Form
        "form.age_label": "Tranche d'age",
        "form.age.placeholder": "Selectionner...",
        "form.pregnancy": "Grossesse ou allaitement en cours ?",
        "form.pregnancy.yes": "Oui",
        "form.pregnancy.no": "Non",

        // Zones
        "zone.forehead": "Front",
        "zone.eyes": "Yeux (Pattes d'oie)",
        "zone.glabella": "Rides du Lion (Glabelle)",
        "zone.mouth": "Sillon Nasogenien",

        // Wrinkles
        "wrinkle.expression": "Rides d'expression (bouge avec le visage)",
        "wrinkle.static": "Rides statiques (visibles au repos)",
        "wrinkle.sagging": "Relachement / Perte de volume",
        "wrinkle.prevention": "Prevention / Je veux juste savoir",

        // Results
        "result.title": "Analyse BigSIS",
        "result.loading": "Consultation de la base...",
        "result.summary": "Resume",
        "result.explanation": "Explication Detaillee",
        "result.options": "Options Discutees",
        "result.risks": "Risques & Limites",
        "result.questions": "Questions pour le Praticien",
        "result.disclaimer": "Big SIS ne remplace pas un medecin. Consultez toujours un professionnel.",
        "result.new_analysis": "Nouvelle Analyse",
        "result.evidence": "Sources Scientifiques Utilisees",
        "result.back_home": "Retour au diagnostic",
        "result.no_result": "Aucun resultat trouve.",
        "result.uncertainty": "Incertitude",
        "result.view_source": "Voir la source",
        "result.no_source": "Aucune source specifique citee pour cette synthese generale.",
        "result.download_pdf": "Telecharger le rapport (PDF)",
        "result.disclaimer_text": "Big SIS ne fournit pas d'avis medical. Ces informations sont generees par IA a titre informatif uniquement et ne remplacent pas une consultation avec un professionnel de sante qualifie.",

        // Questions Section (Promoted)
        "questions.title": "Avant votre rendez-vous, posez ces questions",
        "questions.subtitle": "Copiez cette liste et apportez-la a votre consultation. Un praticien serieux appreciera ces questions.",
        "questions.copy": "Copier mes questions",
        "questions.copied": "Copie !",

        // Share
        "share.button": "Partager mon analyse",
        "share.generating": "Generation...",
        "share.native": "Partager (Instagram, WhatsApp...)",
        "share.copy": "Copier l'image",
        "share.copied": "Image copiee !",
        "share.download": "Telecharger l'image",
        "share.copy_link": "Copier le lien",
        "share.link_copied": "Lien copie !",

        // Share Page
        "share_page.badge": "Resultat partage",
        "share_page.zone": "Zone analysee",
        "share_page.type": "Type",
        "share_page.recommendation": "Recommandation principale",
        "share_page.questions_count": "questions preparees pour le praticien",
        "share_page.cta": "Faites votre propre diagnostic",
        "share_page.cta_sub": "Gratuit, anonyme, base sur la science",
        "share_page.not_found": "Ce diagnostic n'existe pas ou a expire.",
        "share_page.back_home": "Faire un diagnostic",

        // Score
        "score.high": "Fiabilite elevee",
        "score.medium": "Fiabilite moderee",
        "score.low": "Donnees limitees",

        // Fiches Verite
        "fiches.badge": "Fiches Verite",
        "fiches.title": "Les Fiches Verite",
        "fiches.subtitle": "Chaque procedure esthetique analysee avec un score d'efficacite et de securite. Sans marketing, sans filtre.",
        "fiches.loading": "Chargement des fiches...",
        "fiches.empty": "Aucune fiche disponible pour l'instant. Lancez un diagnostic pour generer votre premiere fiche.",
        "fiches.efficacy": "Efficacite",
        "fiches.safety": "Securite",
        "fiches.view": "Voir la fiche",
        "fiches.cta_title": "Votre situation est unique",
        "fiches.cta_description": "Les fiches donnent une vue generale. Pour une analyse personnalisee, faites votre diagnostic gratuit.",
        "fiches.cta_diagnostic": "Faire mon diagnostic",

        // Nav
        "nav.diagnostic": "Diagnostic",
        "nav.fiches": "Fiches Verite",
        "nav.knowledge": "Base de Connaissances",
        "nav.home": "Accueil",

        // Admin Gate
        "admin.gate.title": "Admin BigSIS",
        "admin.gate.placeholder": "Code d'acces",
        "admin.gate.submit": "Acceder",
        "admin.gate.error": "Code incorrect",

        // Error Boundary
        "error.title": "Une erreur est survenue",
        "error.retry": "Reessayer",

        // Loading
        "loading.generating": "Generation en cours...",
        "loading.analyzing": "Analyse en cours...",
        "pdf.downloading": "Generation du PDF...",
    },
    en: {
        // HomePage
        "home.badge": "Aesthetic AI Intelligence",
        "home.title.main": "Big SIS",
        "home.title.sub": "The big sister who tells the truth",
        "home.description": "Understand your face, explore options, decide without pressure. Your personal assistant for aesthetic medicine.",
        "home.system.status": "System Operational",
        "home.footer": "Big SIS V2.0 - The truth about aesthetic medicine",
        "home.value.neutral": "100% Neutral",
        "home.value.scientific": "Science-based",
        "home.value.free": "Free",
        "home.cta_fiches": "Explore our Truth Sheets",

        // Wizard
        "wizard.step1.title": "Which area concerns you?",
        "wizard.step1.subtitle": "Select the main area to analyze",
        "wizard.step2.title": "Wrinkle Type / Concern",
        "wizard.step2.subtitle": "Specify what you observe",
        "wizard.step3.title": "A few details about you",
        "wizard.step3.subtitle": "To refine safety analysis",
        "wizard.next": "Continue",
        "wizard.analyze": "Start BigSIS Analysis",
        "wizard.analyzing": "Analyzing...",
        "wizard.back": "Back",

        // Details Form
        "form.age_label": "Age Range",
        "form.age.placeholder": "Select...",
        "form.pregnancy": "Pregnant or breastfeeding?",
        "form.pregnancy.yes": "Yes",
        "form.pregnancy.no": "No",

        // Zones
        "zone.forehead": "Forehead",
        "zone.eyes": "Eyes (Crow's feet)",
        "zone.glabella": "Frown Lines (Glabella)",
        "zone.mouth": "Nasolabial Folds",

        // Wrinkles
        "wrinkle.expression": "Expression Lines (moves with face)",
        "wrinkle.static": "Static Lines (visible at rest)",
        "wrinkle.sagging": "Sagging / Volume Loss",
        "wrinkle.prevention": "Prevention / Just curious",

        // Results
        "result.title": "BigSIS Analysis",
        "result.loading": "Consulting knowledge base...",
        "result.summary": "Summary",
        "result.explanation": "Detailed Explanation",
        "result.options": "Discussed Options",
        "result.risks": "Risks & Limits",
        "result.questions": "Questions for Practitioner",
        "result.disclaimer": "Big SIS does not replace a doctor. Always consult a professional.",
        "result.new_analysis": "New Analysis",
        "result.evidence": "Scientific Evidence Used",
        "result.back_home": "Back to diagnosis",
        "result.no_result": "No result found.",
        "result.uncertainty": "Uncertainty",
        "result.view_source": "View source",
        "result.no_source": "No specific source cited for this general synthesis.",
        "result.download_pdf": "Download Report (PDF)",
        "result.disclaimer_text": "Big SIS does not provide medical advice. This information is AI-generated for informational purposes only and does not replace a consultation with a qualified healthcare professional.",

        // Questions Section (Promoted)
        "questions.title": "Before your appointment, ask these questions",
        "questions.subtitle": "Copy this list and bring it to your consultation. A good practitioner will appreciate these questions.",
        "questions.copy": "Copy my questions",
        "questions.copied": "Copied!",

        // Share
        "share.button": "Share my analysis",
        "share.generating": "Generating...",
        "share.native": "Share (Instagram, WhatsApp...)",
        "share.copy": "Copy image",
        "share.copied": "Image copied!",
        "share.download": "Download image",
        "share.copy_link": "Copy link",
        "share.link_copied": "Link copied!",

        // Share Page
        "share_page.badge": "Shared result",
        "share_page.zone": "Analyzed zone",
        "share_page.type": "Type",
        "share_page.recommendation": "Top recommendation",
        "share_page.questions_count": "questions prepared for practitioner",
        "share_page.cta": "Take your own diagnostic",
        "share_page.cta_sub": "Free, anonymous, science-based",
        "share_page.not_found": "This diagnostic does not exist or has expired.",
        "share_page.back_home": "Take a diagnostic",

        // Score
        "score.high": "High reliability",
        "score.medium": "Moderate reliability",
        "score.low": "Limited data",

        // Fiches Verite
        "fiches.badge": "Truth Sheets",
        "fiches.title": "Truth Sheets",
        "fiches.subtitle": "Every aesthetic procedure analyzed with an efficacy and safety score. No marketing, no filter.",
        "fiches.loading": "Loading sheets...",
        "fiches.empty": "No sheets available yet. Run a diagnostic to generate your first sheet.",
        "fiches.efficacy": "Efficacy",
        "fiches.safety": "Safety",
        "fiches.view": "View sheet",
        "fiches.cta_title": "Your situation is unique",
        "fiches.cta_description": "Sheets provide a general overview. For a personalized analysis, take your free diagnostic.",
        "fiches.cta_diagnostic": "Take my diagnostic",

        // Nav
        "nav.diagnostic": "Diagnostic",
        "nav.fiches": "Truth Sheets",
        "nav.knowledge": "Knowledge Base",
        "nav.home": "Home",

        // Admin Gate
        "admin.gate.title": "Admin BigSIS",
        "admin.gate.placeholder": "Access code",
        "admin.gate.submit": "Access",
        "admin.gate.error": "Incorrect code",

        // Error Boundary
        "error.title": "An error occurred",
        "error.retry": "Retry",

        // Loading
        "loading.generating": "Generating...",
        "loading.analyzing": "Analyzing...",
        "pdf.downloading": "Generating PDF...",
    }
};
