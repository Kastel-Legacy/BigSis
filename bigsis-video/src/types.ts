// ---------------------------------------------------------------------------
// Shared prop types for all Remotion compositions
// ---------------------------------------------------------------------------

export interface ScoreRevealProps {
  procedureName: string;
  scoreGlobal: number;        // 0-100
  scoreEfficacite: number;    // 0-10
  scoreSecurite: number;      // 0-10
  scoreSatisfaction: number;  // 0-10
  verdictText: string;
  ctaText: string;
}

export interface MythBusterProps {
  procedureName: string;
  mythStatement: string;
  isTrue: boolean;
  explanation: string;
  sciencePoints: string[];
  conseilBigsis: string;
  ctaText: string;
}

export interface PriceRevealProps {
  procedureName: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  breakdownItems: Array<{ label: string; value: string }>;
  hiddenCosts: string[];
  verdictText: string;
  ctaText: string;
}
