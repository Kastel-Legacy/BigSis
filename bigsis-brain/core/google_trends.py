from pytrends.request import TrendReq
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class GoogleTrendsClient:
    def __init__(self):
        # hl='en-US' for broader terms, or 'fr-FR' if target is France specific?
        # User seems to work in English scope but maybe French market?
        # Let's stick to global/US for broader tech trends, or clarify.
        # Given "BigSIS" context, English is safer for "Science", but market might be local.
        # Let's use English for now as research is mostly English.
        self.pytrends = TrendReq(hl='en-US', tz=360) 

    def get_related_queries(self, keywords: List[str]) -> Dict[str, List[str]]:
        """
        Fetches related queries (rising & top) for a list of keywords.
        """
        logger.info(f"📈 Google Trends: Scouting for {keywords}...")
        try:
            self.pytrends.build_payload(kw_list=keywords, timeframe='today 12-m') # Last 12 months
            related = self.pytrends.related_queries()
            
            output = {}
            for kw in keywords:
                data = related.get(kw)
                if not data:
                    continue
                
                # Extract 'rising' queries (trends)
                rising_df = data.get('rising')
                top_df = data.get('top')
                
                terms = []
                if rising_df is not None and not rising_df.empty:
                    terms.extend(rising_df['query'].head(5).tolist())
                
                # If emerging is empty, fallback to top
                if not terms and top_df is not None and not top_df.empty:
                     terms.extend(top_df['query'].head(5).tolist())
                     
                output[kw] = terms
                
            return output
        except Exception as e:
            logger.error(f"❌ Google Trends failed: {e}")
            return {}

if __name__ == "__main__":
    # Test script
    client = GoogleTrendsClient()
    print(client.get_related_queries(["botulinum toxin", "dermal filler", "hIFU face"]))
