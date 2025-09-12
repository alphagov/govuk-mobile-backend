from checkov.cloudformation.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckCategories, CheckResult


class WafHasRateBasedRule(BaseResourceCheck):
    def __init__(self):
        name = "Ensure AWS WAFv2 WebACL includes a RateBasedStatement rule"
        id = "CKV_GOVUKAPP_4"
        supported_resources = ["AWS::WAFv2::WebACL"]
        categories = [CheckCategories.NETWORKING]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        rules = conf.get("Properties", {}).get("Rules", [])
        if not rules or not isinstance(rules, list):
            return CheckResult.FAILED

        for rule in rules:
            if isinstance(rule, dict):
                statement = rule.get("Statement", {})
                if isinstance(statement, dict) and "RateBasedStatement" in statement:
                    return CheckResult.PASSED

        return CheckResult.FAILED


check = WafHasRateBasedRule()
