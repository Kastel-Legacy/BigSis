import React from "react";
import { Composition } from "remotion";
import { ScoreReveal } from "./compositions/ScoreReveal";
import { MythBuster } from "./compositions/MythBuster";
import { PriceReveal } from "./compositions/PriceReveal";
import type {
  ScoreRevealProps,
  MythBusterProps,
  PriceRevealProps,
} from "./types";

// ---------------------------------------------------------------------------
// Remotion Root — registers all BigSIS video compositions
// All compositions: 1080x1920 (9:16 vertical), 30fps, 15s (450 frames)
// ---------------------------------------------------------------------------

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<ScoreRevealProps>
        id="ScoreReveal"
        component={ScoreReveal}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          procedureName: "Toxine Botulique",
          scoreGlobal: 82,
          scoreEfficacite: 8.5,
          scoreSecurite: 7.8,
          scoreSatisfaction: 8.2,
          verdictText: "Approuve : 89% satisfaction a 6 mois",
          ctaText: "Lien en bio pour la fiche complete",
        }}
      />

      <Composition<MythBusterProps>
        id="MythBuster"
        component={MythBuster}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          procedureName: "Toxine Botulique",
          mythStatement: "Le Botox paralyse le visage",
          isTrue: false,
          explanation:
            "RCT sur 340 patients : mobilite faciale preservee a 92% avec dosage adapte.",
          sciencePoints: [
            "Meta-analyse 2023 : 89% satisfaction a 6 mois",
            "Risque ecchymose : 12% des cas, resolue en 5j",
          ],
          conseilBigsis:
            "Le Botox bien dose preserve tes expressions. Le probleme ? Le surdosage.",
          ctaText: "Lien en bio pour la fiche complete",
        }}
      />

      <Composition<PriceRevealProps>
        id="PriceReveal"
        component={PriceReveal}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          procedureName: "Acide Hyaluronique Levres",
          priceMin: 300,
          priceMax: 600,
          currency: "EUR",
          breakdownItems: [
            { label: "Seance initiale", value: "350-500 EUR" },
            { label: "Retouche J14", value: "+100-200 EUR" },
            { label: "Budget annuel", value: "500-800 EUR" },
          ],
          hiddenCosts: [
            "Creme cicatrisante : 15-30 EUR",
            "SPF 50 obligatoire : 20 EUR/mois",
          ],
          verdictText: "BON DEAL",
          ctaText: "Lien en bio pour la fiche complete",
        }}
      />
    </>
  );
};
