from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.cloudformation.checks.resource.base_resource_check import BaseResourceCheck

class ServerlessApiThrottlingCheck(BaseResourceCheck):
    def __init__(self):
        name = "Ensure every AWS::Serverless::Api Stage MethodSettings entry has ThrottlingRateLimit and ThrottlingBurstLimit"
        id = "CKV2_GOVUKAPP_2"
        supported_resources = ["AWS::Serverless::Api"]
        categories = [CheckCategories.NETWORKING]
        super().__init__(name=name, id=id, categories=categories, supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        properties = conf.get("Properties")
        if not properties:
            return CheckResult.FAILED

        method_settings = properties.get("MethodSettings")
        if not method_settings or not isinstance(method_settings, list):
            return CheckResult.FAILED

        for entry in method_settings:
            if not isinstance(entry, dict):
                return CheckResult.FAILED
            if "ThrottlingRateLimit" not in entry or "ThrottlingBurstLimit" not in entry:
                return CheckResult.FAILED

        return CheckResult.PASSED

check = ServerlessApiThrottlingCheck()


