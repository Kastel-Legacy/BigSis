import yaml
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class RuleCondition(BaseModel):
    field: str
    operator: str # "eq", "in", "gt", "lt"
    value: Any

class RuleOutput(BaseModel):
    type: str # "suggestion", "warning", "question", "uncertainty"
    key: str # e.g., "procedure_botox"
    detail: str
    weight: float = 1.0

class Rule(BaseModel):
    id: str
    description: str
    conditions: List[RuleCondition]
    outputs: List[RuleOutput]

class RulesEngine:
    def __init__(self, rules_path: str = "core/rules/definitions.yaml"):
        self.rules_path = rules_path
        self.rules: List[Rule] = []
        self.load_rules()

    def load_rules(self):
        try:
            with open(self.rules_path, "r") as f:
                data = yaml.safe_load(f)
                self.rules = [Rule(**r) for r in data.get("rules", [])]
            logger.info(f"Loaded {len(self.rules)} rules from {self.rules_path}")
        except FileNotFoundError:
            logger.warning(f"Rules file not found at {self.rules_path}")
            self.rules = []

    def evaluate(self, context: Dict[str, Any]) -> List[RuleOutput]:
        triggered_outputs = []
        
        for rule in self.rules:
            if self._check_conditions(rule.conditions, context):
                logger.debug(f"Rule triggered: {rule.id}")
                triggered_outputs.extend(rule.outputs)
        
        return triggered_outputs

    def _check_conditions(self, conditions: List[RuleCondition], context: Dict[str, Any]) -> bool:
        for condition in conditions:
            user_val = context.get(condition.field)
            
            if user_val is None:
                return False # Missing data means condition fails (conservative)

            if condition.operator == "eq":
                if str(user_val).lower() != str(condition.value).lower():
                    return False
            elif condition.operator == "in":
                if user_val not in condition.value:
                    return False
            elif condition.operator == "gt":
                try:
                    if float(user_val) <= float(condition.value):
                        return False
                except (ValueError, TypeError):
                    return False
            elif condition.operator == "lt":
                try:
                    if float(user_val) >= float(condition.value):
                        return False
                except (ValueError, TypeError):
                    return False

        return True
